import hashlib
from collections import defaultdict

import pytest
from langchain_core.documents import Document

from src.agents.chunking.budget import split_spans
from src.agents.chunking.source import source_text
from src.agents.chunking.strategies import MarkdownHeaderChunker, StandardTextChunker
from src.agents.vectordb.indexing import sync_source_chunks
from src.agents.vectordb.revisions import RevisionedChroma
from src.config import Settings


def doc(text, **metadata):
    return Document(page_content=text, metadata={"source_id": "manual", **metadata})


def test_binary_search_checks_hidden_fitting_boundary_before_failure(caplog):
    lengths = {"": 0, "a": 2, "ab": 1, "abc": 3, "c": 1}
    with caplog.at_level("INFO"):
        spans = split_spans("abc", 1, 0, lambda text: lengths.get(text, len(text)))
    assert [(part.start, part.end) for part in spans] == [(0, 2), (2, 3)]
    assert "Budget fallback" in caplog.text


def test_binary_search_fallback_checks_boundaries_skipped_inside_probe():
    def count(text):
        if not text:
            return 0
        if text == "abc":
            return 2
        if text.startswith("a"):
            return 10
        return len(text)

    spans = split_spans("abcdef", 4, 0, count)
    assert "".join("abcdef"[part.start : part.end] for part in spans) == "abcdef"
    assert all(count("abcdef"[part.start : part.end]) <= 4 for part in spans)


@pytest.mark.parametrize("value", [True, False, 1.0, 0, -1, "1.2", "true"])
def test_embedding_limit_rejects_coercion(value):
    with pytest.raises(ValueError, match="positive integer"):
        Settings(_env_file=None, rag_embedding_max_tokens=value)


@pytest.mark.parametrize("value", [True, 1.0, 0, -1])
def test_chunker_checks_limit_even_when_pydantic_validation_is_bypassed(value):
    settings = Settings.model_construct(rag_embedding_max_tokens=value)
    with pytest.raises(ValueError, match="positive integer"):
        StandardTextChunker(settings=settings)


def test_embedding_limit_accepts_environment_integer_string(monkeypatch):
    monkeypatch.setenv("RAG_EMBEDDING_MAX_TOKENS", "123")
    assert Settings(_env_file=None).rag_embedding_max_tokens == 123


def test_known_embedding_model_rejects_wrong_tokenizer():
    settings = Settings(_env_file=None, embedding_model="text-embedding-3-small", rag_token_encoding="o200k_base")
    with pytest.raises(ValueError, match="cl100k_base"):
        StandardTextChunker(settings=settings)


def test_unknown_provider_exposes_tokenizer_assumption(caplog):
    settings = Settings(_env_file=None, embedding_model="private-embedding", rag_token_encoding="cl100k_base")
    with caplog.at_level("WARNING"):
        StandardTextChunker(settings=settings)
    assert "budget uses cl100k_base" in caplog.text


@pytest.mark.parametrize(
    "block",
    [
        "<pre>\n# inside html\n</pre>\n",
        "<pre>\n- </pre>\n",  # List-looking text must still close the raw HTML block.
        "<script type='text/javascript'>\n# inside html\n</script>\n",
        "<!--\n# inside html\n-->\n",
        "<div>\n# inside html\n</div>\n\n",
        "> # quoted\n> ## nested\n",
        "- first\n  ## nested\n  - child\n    ### deeper\n",
        "````python\n```\n## fenced\n```\n````\n",
        "~~~lang\n## fenced\n~~~~\n",
    ],
)
def test_markdown_containers_preserve_source_without_false_headings(block):
    text = "# Real\n\n" + block + "\n# Next\n\nend"
    chunks = MarkdownHeaderChunker(chunk_overlap=0).split_document(doc(text))
    assert "".join(source_text(chunk) for chunk in chunks) == text
    assert {chunk.metadata.get("section") for chunk in chunks} == {"Real", "Next"}
    for chunk in chunks:
        assert source_text(chunk) == text[chunk.metadata["source_start"] : chunk.metadata["source_end"]]


def test_setext_is_documented_as_plain_text_and_preserved():
    text = "Setext title\n============\n\nSubtitle\n--------\n\ncontent\n"
    chunks = MarkdownHeaderChunker(chunk_overlap=0).split_document(doc(text, section="upstream"))
    assert all("markdown_section" not in chunk.metadata for chunk in chunks)
    assert "".join(source_text(chunk) for chunk in chunks) == text


def test_explicit_whole_source_revision_survives_fragment_chunking():
    chunker = StandardTextChunker()
    parts = [
        doc("first", source_revision="etag:release-5", source_part_count=2, source_part_index=0, source_offset=0),
        doc("second", source_revision="etag:release-5", source_part_count=2, source_part_index=1, source_offset=5),
    ]
    chunks = chunker.split_documents(parts)
    assert {chunk.metadata["source_revision"] for chunk in chunks} == {"etag:release-5"}
    assert [chunk.metadata["source_start"] for chunk in chunks] == [0, 5]


@pytest.mark.parametrize("revision", [None, "", "  ", 123])
def test_invalid_supplied_revision_is_rejected(revision):
    with pytest.raises(ValueError, match="source_revision"):
        StandardTextChunker().split_document(doc("text", source_revision=revision))


def test_fragment_without_upstream_revision_is_rejected():
    with pytest.raises(ValueError, match="explicit source_revision"):
        StandardTextChunker().split_document(doc("part", source_part_count=2, source_part_index=0))


class SearchableIndex:
    """Offline vector-store contract double with controllable mid-batch failures."""

    def __init__(self):
        self.documents = {}
        self.fail_after = None
        self.writes = 0
        self.on_write = None
        self.fail_cleanup = False

    def get(self, *, where, include):
        selected = {
            key: document
            for key, document in self.documents.items()
            if document.metadata["source_key"] == where["source_key"]
        }
        return {"ids": list(selected), "metadatas": [document.metadata for document in selected.values()]}

    def add_documents(self, documents, *, ids):
        if self.fail_after is not None and self.writes >= self.fail_after:
            raise RuntimeError("embedding failed halfway")
        self.writes += 1
        self.documents.update(zip(ids, documents, strict=True))
        if self.on_write:
            self.on_write()

    def delete(self, *, ids):
        if self.fail_cleanup:
            raise RuntimeError("cleanup failed")
        for identity in ids:
            self.documents.pop(identity, None)

    def similarity_search(self, query, *, k, filter):
        def matches(meta, condition):
            if "$and" in condition:
                return all(matches(meta, part) for part in condition["$and"])
            return all(
                meta.get(key) in value["$in"] if isinstance(value, dict) else meta.get(key) == value
                for key, value in condition.items()
            )

        return [document for document in self.documents.values() if matches(document.metadata, filter)][:k]

    def similarity_search_with_relevance_scores(self, query, **kwargs):
        return [(document, 0.9) for document in self.similarity_search(query, **kwargs)]


def test_failed_staging_stays_invisible_after_reopening_manifest(tmp_path):
    raw = SearchableIndex()
    path = tmp_path / "active.json"
    store = RevisionedChroma(raw, path)
    chunker = StandardTextChunker(chunk_size=10, chunk_overlap=0, use_token_length=False)
    original = doc("old content")
    sync_source_chunks(store, [original], chunker.split_document(original), batch_size=1)
    old_ids = set(raw.documents)
    raw.fail_after = raw.writes + 1
    changed = doc("new content" * 10)
    with pytest.raises(RuntimeError, match="halfway"):
        sync_source_chunks(store, [changed], chunker.split_document(changed), batch_size=1)
    assert set(raw.documents) > old_ids  # A partial write really occurred.
    reopened = RevisionedChroma(raw, path)
    assert "".join(source_text(chunk) for chunk in reopened.similarity_search("q", k=100)) == original.page_content
    raw.fail_after = None
    sync_source_chunks(reopened, [changed], chunker.split_document(changed), batch_size=1)
    assert "".join(source_text(chunk) for chunk in reopened.similarity_search("q", k=100)) == changed.page_content
    assert set(raw.documents).isdisjoint(old_ids)


def test_cleanup_failure_never_reintroduces_old_revision_and_keeps_acl_filter(tmp_path):
    raw = SearchableIndex()
    store = RevisionedChroma(raw, tmp_path / "active.json")
    chunker = StandardTextChunker()
    originals = [doc("old-a", tenant_id="a"), doc("b", tenant_id="b")]
    sync_source_chunks(store, originals, chunker.split_documents(originals))
    raw.fail_cleanup = True
    changed = doc("new-a", tenant_id="a")
    sync_source_chunks(store, [changed], chunker.split_document(changed))
    assert len(raw.documents) == 3
    assert [source_text(chunk) for chunk in store.similarity_search("q", filter={"tenant_id": "a"})] == ["new-a"]
    scored = store.similarity_search_with_relevance_scores("q", filter={"tenant_id": "b"})
    assert [source_text(chunk) for chunk, _ in scored] == ["b"]


def test_reader_waits_for_publication_and_never_mixes_revisions(tmp_path):
    from concurrent.futures import ThreadPoolExecutor, TimeoutError
    from threading import Event

    raw = SearchableIndex()
    path = tmp_path / "active.json"
    writer, reader = RevisionedChroma(raw, path), RevisionedChroma(raw, path)
    chunker = StandardTextChunker(chunk_size=10, chunk_overlap=0, use_token_length=False)
    old = doc("old source")
    sync_source_chunks(writer, [old], chunker.split_document(old))
    staged, release, querying = Event(), Event(), Event()

    def pause():
        staged.set()
        assert release.wait(10)

    raw.on_write = pause
    new = doc("new source " * 5)

    def read():
        querying.set()
        return reader.similarity_search("q", k=100)

    with ThreadPoolExecutor(max_workers=2) as executor:
        writing = executor.submit(sync_source_chunks, writer, [new], chunker.split_document(new), 1)
        assert staged.wait(10)
        reading = executor.submit(read)
        try:
            assert querying.wait(10)
            with pytest.raises(TimeoutError):
                reading.result(timeout=0.1)
        finally:
            release.set()
        writing.result(timeout=10)
        results = reading.result(timeout=10)
    revisions = defaultdict(set)
    for result in results:
        revisions[result.metadata["source_key"]].add(result.metadata["source_revision"])
    assert all(len(values) == 1 for values in revisions.values())
    assert "".join(source_text(chunk) for chunk in results) == new.page_content


def test_fragment_snapshot_must_be_complete_before_index_is_changed(tmp_path):
    raw = SearchableIndex()
    store = RevisionedChroma(raw, tmp_path / "active.json")
    chunker = StandardTextChunker()
    revision = hashlib.sha256(b"onetwo").hexdigest()
    parts = [
        doc(text, source_revision=revision, source_part_count=2, source_part_index=i, source_offset=i * 3)
        for i, text in enumerate(["one", "two"])
    ]
    with pytest.raises(ValueError, match="Incomplete source snapshot"):
        sync_source_chunks(store, parts[:1], chunker.split_documents(parts[:1]))
    assert not raw.documents
    sync_source_chunks(store, parts, chunker.split_documents(parts))
    assert "".join(source_text(chunk) for chunk in store.similarity_search("q")) == "onetwo"


def test_missing_chunks_fail_before_upsert_or_deletion(tmp_path):
    raw = SearchableIndex()
    store = RevisionedChroma(raw, tmp_path / "active.json")
    source = doc("A" * 50)
    chunks = StandardTextChunker(chunk_size=10, chunk_overlap=0, use_token_length=False).split_document(source)
    with pytest.raises(ValueError, match="Incomplete chunks"):
        sync_source_chunks(store, [source], chunks[:-1])
    assert not raw.documents


def test_manifest_publication_failure_keeps_all_previous_sources_visible(tmp_path, monkeypatch):
    raw = SearchableIndex()
    store = RevisionedChroma(raw, tmp_path / "active.json")
    chunker = StandardTextChunker()
    old = [doc("old-a"), doc("old-b", source_id="other")]
    sync_source_chunks(store, old, chunker.split_documents(old))
    old_ids = set(raw.documents)
    changed = [doc("new-a"), doc("new-b", source_id="other")]

    def fail_replace(*args):
        raise OSError("publication failed")

    with monkeypatch.context() as scoped:
        scoped.setattr("src.agents.vectordb.revisions.os.replace", fail_replace)
        with pytest.raises(OSError, match="publication failed"):
            sync_source_chunks(store, changed, chunker.split_documents(changed))
    assert len(raw.documents) == 4
    assert {source_text(chunk) for chunk in store.similarity_search("q")} == {"old-a", "old-b"}
    assert not (set(path.name for path in tmp_path.iterdir()) - {"active.json", "active.json.lock"})
    sync_source_chunks(store, changed, chunker.split_documents(changed))
    assert set(raw.documents).isdisjoint(old_ids)
    assert {source_text(chunk) for chunk in store.similarity_search("q")} == {"new-a", "new-b"}


def test_managed_wrapper_requires_complete_source_updates(tmp_path):
    from src.agents.vectordb.stores import ChromaVectorStore

    raw = SearchableIndex()
    wrapper = ChromaVectorStore(store=RevisionedChroma(raw, tmp_path / "active.json"))
    source = doc("body")
    chunks = StandardTextChunker().split_document(source)
    with pytest.raises(ValueError, match="sync_sources"):
        wrapper.add_documents(chunks)
    with pytest.raises(ValueError, match="empty source snapshot"):
        wrapper.delete(["arbitrary-id"])
    assert not raw.documents
    assert wrapper.sync_sources([source], chunks) == 1
    assert [source_text(chunk) for chunk in wrapper.similarity_search("q")] == ["body"]

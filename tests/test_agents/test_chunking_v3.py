from datetime import datetime
from random import Random

import pytest
from langchain_core.documents import Document

from src.agents.chunking.source import source_key, source_text
from src.agents.chunking.strategies import (
    MarkdownHeaderChunker,
    StandardTextChunker,
    _split_with_budget,
    generate_document_hash_id,
    get_token_counter,
    prepare_chunks_for_index,
)
from src.agents.ingestion.loaders import MarkdownPlaybookLoader
from src.agents.vectordb.indexing import sync_source_chunks
from src.config import Settings


def document(text, **metadata):
    return Document(page_content=text, metadata={"source_id": "test:manual", **metadata})


def assert_source_coverage(original, chunks, offset=0):
    """Check each exact slice and reconstruct input after removing deliberate overlap."""
    cursor = offset
    reconstructed = []
    for chunk in chunks:
        start, end = chunk.metadata["source_start"], chunk.metadata["source_end"]
        raw = source_text(chunk)
        assert raw == original[start - offset : end - offset]
        assert start <= cursor < end
        reconstructed.append(raw[max(0, cursor - start) :])
        cursor = end
    assert cursor == offset + len(original)
    assert "".join(reconstructed) == original


@pytest.mark.parametrize(
    "text",
    [
        "  preamble\r\n\r\n## Configuration\r\n\r\n    indented code\r\n    second line\r\n",
        "# YAML\n\n```yaml\nroot:\n  sensors:\n    - imu\n# not a heading\n```\n\nEnd  \n",
        '# Table\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n~~~json\n{"a": [1, 2]}\n~~~\n',
        "# Code\n````markdown\n```python\n## Still code\n```\n````\n## Real\nBody",
        "# Long\n\n" + "khôngdấucách🤖感測器" * 50,
    ],
)
@pytest.mark.parametrize("overlap", [0, 12])
def test_golden_markdown_preserves_exact_source(text, overlap):
    chunks = MarkdownHeaderChunker(chunk_size=80, chunk_overlap=overlap, use_token_length=False).split_document(
        document(text)
    )
    assert_source_coverage(text, chunks)
    assert all(len(c.page_content) <= 80 for c in chunks)


def test_offsets_reference_original_file_after_frontmatter(tmp_path):
    raw = "---\r\ntitle: Sample\r\n---\r\n\r\n# YAML\r\n\r\n    key: value  \r\n"
    path = tmp_path / "manual.md"
    path.write_bytes(raw.encode("utf-8"))
    doc = MarkdownPlaybookLoader(tmp_path, namespace="docs").load()[0]
    from hashlib import sha256

    assert doc.metadata["source_revision"] == sha256(raw.encode("utf-8")).hexdigest()
    chunks = MarkdownHeaderChunker(chunk_size=200, chunk_overlap=0).split_document(doc)
    for chunk in chunks:
        assert source_text(chunk) == raw[chunk.metadata["source_start"] : chunk.metadata["source_end"]]


@pytest.mark.parametrize("chunker", [MarkdownHeaderChunker, StandardTextChunker])
def test_missing_identity_is_rejected_before_chunking(chunker):
    with pytest.raises(ValueError, match="source_id"):
        chunker().split_document(Document(page_content="same content"))
    with pytest.raises(ValueError, match="source_id"):
        prepare_chunks_for_index([Document(page_content="same content")])


def test_same_locator_different_tenant_has_distinct_identity():
    a = document("same", tenant_id="a")
    b = document("same", tenant_id="b")
    assert source_key(a) != source_key(b)
    assert generate_document_hash_id(a) != generate_document_hash_id(b)


@pytest.mark.parametrize(
    "field, value",
    [
        ("source_id", datetime(2026, 1, 1)),
        ("namespace", datetime(2026, 1, 1)),
        ("section", datetime(2026, 1, 1)),
        ("chunk_occurrence", True),
        ("chunk_occurrence", -1),
    ],
)
def test_identity_schema_errors_are_explicit(field, value):
    with pytest.raises(ValueError, match=field):
        generate_document_hash_id(document("content", **{field: value}))


def test_non_identity_metadata_is_validated_before_vector_insertion():
    with pytest.raises(ValueError, match="created_at"):
        prepare_chunks_for_index([document("content", created_at=datetime(2026, 1, 1))])


def test_no_stale_section_or_heading_is_inherited():
    chunks = MarkdownHeaderChunker().split_document(document("preamble\n# New\nbody", section="old", Header_3="stale"))
    assert chunks[0].metadata["source_section"] == "old"
    assert "section" not in chunks[0].metadata
    assert chunks[0].metadata["context_prefix"] == ""
    assert "Header_3" not in chunks[-1].metadata
    assert chunks[-1].metadata["markdown_section"] == "New"


@pytest.mark.parametrize("prefix", ["12345", "123456"])
def test_prefix_exhausting_budget_is_rejected(prefix):
    with pytest.raises(ValueError, match="Prefix consumes"):
        _split_with_budget("body", 5, 0, len, prefix)


def test_unicode_fallback_is_measurable_and_overlap_survives():
    chunks = StandardTextChunker(chunk_size=20, chunk_overlap=5, use_token_length=False).split_document(
        document("x" * 60)
    )
    assert chunks[0].metadata["split_boundary"] == "unicode"
    assert chunks[1].metadata["source_start"] == 15
    assert_source_coverage("x" * 60, chunks)


def test_sentence_boundary_preferred_over_mid_word():
    text = "One sentence. Another sentence. Third sentence follows."
    chunks = StandardTextChunker(chunk_size=36, chunk_overlap=0, use_token_length=False).split_document(document(text))
    assert chunks[0].metadata["split_boundary"] == "sentence"
    assert source_text(chunks[0]) == "One sentence. Another sentence. "


def test_separate_embedding_limit_caps_token_chunks():
    settings = Settings(_env_file=None, rag_embedding_max_tokens=12)
    chunks = StandardTextChunker(
        chunk_size=80, chunk_overlap=20, settings=settings, use_token_length=True
    ).split_document(
        document("đồng bộ cảm biến 🤖 " * 30),
    )
    assert all(get_token_counter()(c.page_content) <= 12 for c in chunks)


@pytest.mark.parametrize("token_mode", [False, True])
def test_seeded_random_content_invariants(token_mode):
    rng = Random(137)
    alphabet = list("abc ABC.!?\n\t0123độ感🤖")
    count = get_token_counter() if token_mode else len
    for _ in range(40):
        text = "# Title\n" + "".join(rng.choices(alphabet, k=rng.randint(30, 200)))
        size = rng.randint(20, 60)
        chunker = MarkdownHeaderChunker(chunk_size=size, chunk_overlap=rng.randint(0, 8), use_token_length=token_mode)
        chunks = chunker.split_document(document(text))
        assert_source_coverage(text, chunks)
        assert all(count(c.page_content) <= size for c in chunks)
        assert [generate_document_hash_id(c) for c in chunks] == [
            generate_document_hash_id(c) for c in chunker.split_document(document(text))
        ]


class MemoryIndex:
    def __init__(self):
        self.documents = {}
        self.writes = 0
        self.fail = False

    def get(self, *, where, include):
        found = {key: doc for key, doc in self.documents.items() if doc.metadata["source_key"] == where["source_key"]}
        return {"ids": list(found), "metadatas": [doc.metadata for doc in found.values()]}

    def add_documents(self, documents, *, ids):
        if self.fail:
            raise RuntimeError("embedding failed")
        self.writes += 1
        self.documents.update(zip(ids, documents, strict=True))

    def delete(self, *, ids):
        for identity in ids:
            del self.documents[identity]


def test_reingestion_is_idempotent_and_edit_removes_only_its_stale_chunks():
    store = MemoryIndex()
    chunker = StandardTextChunker(chunk_size=20, chunk_overlap=0, use_token_length=False)
    sources = [document("A" * 60), document("keep", source_id="other")]
    sync_source_chunks(store, sources, chunker.split_documents(sources))
    old_ids = set(store.documents)
    writes = store.writes
    sync_source_chunks(store, sources, chunker.split_documents(sources))
    assert store.writes == writes
    assert set(store.documents) == old_ids
    changed = document("new body")
    sync_source_chunks(store, [changed], chunker.split_document(changed))
    assert {source_text(c) for c in store.documents.values()} == {"keep", "new body"}


def test_embedding_failure_does_not_delete_previous_revision():
    store = MemoryIndex()
    chunker = StandardTextChunker()
    original = document("original")
    sync_source_chunks(store, [original], chunker.split_document(original))
    previous = dict(store.documents)
    store.fail = True
    changed = document("updated")
    with pytest.raises(RuntimeError, match="embedding failed"):
        sync_source_chunks(store, [changed], chunker.split_document(changed))
    assert store.documents == previous


def test_algorithm_version_changes_identity_and_replaces_stale_records():
    store = MemoryIndex()
    source = document("same text")
    chunker = StandardTextChunker()
    old = chunker.split_document(source)
    old[0].metadata["chunking_version"] = "2"
    sync_source_chunks(store, [source], old)
    previous = set(store.documents)
    sync_source_chunks(store, [source], chunker.split_document(source))
    assert previous.isdisjoint(store.documents)
    assert len(store.documents) == 1


def test_empty_known_source_removes_its_chunks_but_missing_source_is_retained():
    store = MemoryIndex()
    chunker = StandardTextChunker()
    sources = [document("old"), document("other", source_id="other")]
    sync_source_chunks(store, sources, chunker.split_documents(sources))
    sync_source_chunks(store, [document("")], [])
    assert [source_text(c) for c in store.documents.values()] == ["other"]


def test_conflicting_source_revisions_fail_before_writes():
    store = MemoryIndex()
    with pytest.raises(ValueError, match="Conflicting revisions"):
        sync_source_chunks(store, [document("first"), document("second")], [])
    assert not store.documents


def test_sync_with_real_local_chroma_and_offline_embeddings(tmp_path):
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    from langchain_chroma import Chroma
    from langchain_core.embeddings import Embeddings

    from src.agents.vectordb.revisions import RevisionedChroma

    class OfflineEmbeddings(Embeddings):
        def embed_documents(self, texts):
            return [[1.0, float(len(text) % 17) / 17, 0.5] for text in texts]

        def embed_query(self, text):
            return self.embed_documents([text])[0]

    client = chromadb.PersistentClient(
        path=str(tmp_path / "chroma"), settings=ChromaSettings(anonymized_telemetry=False)
    )
    raw = Chroma(client=client, collection_name="chunking-test-v3", embedding_function=OfflineEmbeddings())
    store = RevisionedChroma(raw, tmp_path / "active.json")
    chunker = MarkdownHeaderChunker(chunk_size=80, chunk_overlap=10, use_token_length=False)
    source = document("# Config\n\n    key: value\n" * 8)
    chunks = chunker.split_document(source)
    assert store.similarity_search("config") == []
    sync_source_chunks(store, [source], chunks, batch_size=2)
    first_ids = set(store.get()["ids"])
    assert {chunk.page_content for chunk in store.similarity_search("config", k=100)} == {
        chunk.page_content for chunk in chunks
    }
    sync_source_chunks(store, [source], chunks, batch_size=2)
    assert set(store.get()["ids"]) == first_ids
    changed = document("# Config\n\n    key: changed\n")
    new_chunks = chunker.split_document(changed)
    sync_source_chunks(store, [changed], new_chunks, batch_size=2)
    result = store.get(include=["documents", "metadatas"])
    assert set(result["ids"]).isdisjoint(first_ids)
    actual = [
        Document(page_content=text, metadata=meta)
        for text, meta in zip(result["documents"], result["metadatas"], strict=True)
    ]
    actual.sort(key=lambda chunk: chunk.metadata["chunk_index"])
    assert_source_coverage(changed.page_content, actual)
    # Unpublished/stale records can exist after a crash. Retrieval must filter
    # them inside Chroma (before top-k), together with the caller's metadata filter.
    raw.add_documents(
        [
            Document(
                page_content="hidden revision", metadata={"index_generation": "unpublished", "source_id": "test:manual"}
            )
        ],
        ids=["staged-orphan"],
    )
    reopened = RevisionedChroma(raw, tmp_path / "active.json")
    results = reopened.similarity_search_with_relevance_scores("config", k=100, filter={"source_id": "test:manual"})
    assert {chunk.page_content for chunk, _ in results} == {chunk.page_content for chunk in new_chunks}
    assert reopened.similarity_search("config", filter={"source_id": "other"}) == []
    sync_source_chunks(reopened, [document("")], [])
    assert reopened.similarity_search("config") == []


def test_retrieval_does_not_quote_synthetic_prefix():
    from unittest.mock import MagicMock

    from src.agents.retrieval.pipeline import MongoRAGPipeline

    chunk = MarkdownHeaderChunker().split_document(document("# Config\n\nraw"))[0]
    pipeline = MongoRAGPipeline.__new__(MongoRAGPipeline)
    pipeline._settings = Settings(_env_file=None)
    pipeline._vector_store = MagicMock()
    pipeline._vector_store.similarity_search_with_relevance_scores.return_value = [(chunk, 0.9)]
    context, citations = pipeline.retrieve("config")
    assert "[Config]\n\n" not in context
    assert "# Config\n\nraw" in context
    assert citations[0]["source_start"] == 0

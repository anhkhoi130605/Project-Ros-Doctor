import pytest
from langchain_core.documents import Document

from src.agents.chunking.source import make_source_id
from src.agents.chunking.strategies import (
    MarkdownHeaderChunker,
    StandardTextChunker,
    generate_document_hash_id,
    get_token_counter,
    prepare_chunks_for_index,
)
from src.config import Settings


def make_document(*, page_content, metadata=None):
    metadata = dict(metadata or {})
    locator = [
        str(metadata.get(key, ""))
        for key in (
            "source_file",
            "source",
            "source_collection",
            "source_document_id",
            "dataset_code",
            "test_case_code",
        )
    ]
    metadata.setdefault("source_id", make_source_id("test", repr(locator)))
    return Document(page_content=page_content, metadata=metadata)


def test_markdown_header_chunker_enrichment():
    content = """# Guide Title

## 1. Definition
Definition text explaining the problem.

## 2. Root Causes
Root cause 1.
Root cause 2.
"""
    doc = make_document(
        page_content=content,
        metadata={
            "source_file": "sample.md",
            "primary_fault_type": "TF_Inconsistency",
        },
    )

    chunker = MarkdownHeaderChunker(chunk_size=500, chunk_overlap=50)
    chunks = chunker.split_documents([doc])

    assert len(chunks) >= 2
    # Verify metadata inheritance
    for c in chunks:
        assert c.metadata["source_file"] == "sample.md"
        assert c.metadata["primary_fault_type"] == "TF_Inconsistency"
        assert "section" in c.metadata


def test_standard_text_chunker():
    doc = make_document(page_content="A" * 1500, metadata={"source": "test"})
    chunker = StandardTextChunker(chunk_size=500, chunk_overlap=50, use_token_length=False)
    chunks = chunker.split_documents([doc])

    assert len(chunks) > 1
    for c in chunks:
        assert len(c.page_content) <= 500


def test_generate_document_hash_id_deterministic():
    doc = make_document(page_content="Same content", metadata={"source_file": "file1.md", "section": "Root Causes"})
    id1 = generate_document_hash_id(doc, fallback_index=0)
    id2 = generate_document_hash_id(doc, fallback_index=0)
    id3 = generate_document_hash_id(doc, fallback_index=1)

    assert id1 == id2
    assert id1 == id3


def test_generate_document_hash_id_uses_full_content():
    prefix = "A" * 150
    first = make_document(page_content=f"{prefix} first", metadata={"source_file": "file1.md"})
    second = make_document(page_content=f"{prefix} second", metadata={"source_file": "file1.md"})

    assert generate_document_hash_id(first) != generate_document_hash_id(second)


def test_chunkers_accept_zero_overlap():
    markdown_chunker = MarkdownHeaderChunker(chunk_size=500, chunk_overlap=0)
    text_chunker = StandardTextChunker(chunk_size=500, chunk_overlap=0)

    assert markdown_chunker.chunk_overlap == 0
    assert text_chunker.chunk_overlap == 0


@pytest.mark.parametrize("chunker_type", [MarkdownHeaderChunker, StandardTextChunker])
def test_chunkers_reject_overlap_not_smaller_than_size(chunker_type):
    with pytest.raises(ValueError, match="smaller than chunk_size"):
        chunker_type(chunk_size=100, chunk_overlap=100)


def test_markdown_chunker_prefix_context_and_indices():
    content = """# System
## Diagnosis
Diagnostic instructions and details.
"""
    doc = make_document(page_content=content, metadata={"source_file": "doc.md"})
    chunker = MarkdownHeaderChunker(chunk_size=500, chunk_overlap=50, prefix_section_context=True)
    chunks = chunker.split_documents([doc])

    assert len(chunks) >= 1
    assert chunks[-1].page_content.startswith("[System > Diagnosis]")
    assert chunks[0].metadata["chunk_index"] == 0
    assert chunks[0].metadata["total_chunks"] == len(chunks)


def test_chunker_token_based_length():
    content = "Hello world from ROS2 diagnostic engine. " * 50
    doc = make_document(page_content=content, metadata={"source_file": "doc.md"})
    chunker = StandardTextChunker(chunk_size=30, chunk_overlap=5, use_token_length=True)
    chunks = chunker.split_documents([doc])

    assert len(chunks) > 1
    import tiktoken

    enc = tiktoken.get_encoding("cl100k_base")
    for c in chunks:
        assert len(enc.encode(c.page_content)) <= 30


@pytest.mark.parametrize("token_mode", [False, True])
def test_markdown_final_budget_includes_prefix(token_mode):
    count = get_token_counter() if token_mode else len
    chunker = MarkdownHeaderChunker(chunk_size=80, chunk_overlap=15, use_token_length=token_mode)
    chunks = chunker.split_document(make_document(page_content="# ROS\n\n" + "Đồng bộ cảm biến 🤖. " * 100))
    assert len(chunks) > 1
    assert all(c.page_content.startswith("[ROS]\n\n") for c in chunks)
    assert all(count(c.page_content) <= 80 for c in chunks)


@pytest.mark.parametrize("token_mode", [False, True])
def test_long_heading_keeps_metadata_without_overflow(token_mode):
    heading = "Chi tiết cảm biến " * 100
    count = get_token_counter() if token_mode else len
    chunks = MarkdownHeaderChunker(
        chunk_size=40,
        chunk_overlap=0,
        use_token_length=token_mode,
    ).split_document(make_document(page_content=f"# {heading}\n\nPAYLOAD_END"))
    assert all(count(c.page_content) <= 40 for c in chunks)
    assert all(c.metadata["section"] == heading.strip() for c in chunks)
    assert "PAYLOAD_END" in "".join(c.page_content for c in chunks)


@pytest.mark.parametrize("chunker_type", [MarkdownHeaderChunker, StandardTextChunker])
@pytest.mark.parametrize("text", ["", " \t\n "])
def test_empty_documents_do_not_create_chunks(chunker_type, text):
    assert chunker_type().split_documents([make_document(page_content=text)]) == []


@pytest.mark.parametrize("chunker_type", [MarkdownHeaderChunker, StandardTextChunker])
def test_indices_are_per_document_and_do_not_mutate_input(chunker_type):
    docs = [make_document(page_content="word " * 50, metadata={"source_file": name}) for name in ["a.md", "b.md"]]
    chunks = chunker_type(chunk_size=40, chunk_overlap=5, use_token_length=False).split_documents(docs)
    for doc in docs:
        parts = [c for c in chunks if c.metadata["source_file"] == doc.metadata["source_file"]]
        assert len(parts) > 1
        assert [c.metadata["chunk_index"] for c in parts] == list(range(len(parts)))
        assert all(c.metadata["total_chunks"] == len(parts) for c in parts)
        assert "chunk_index" not in doc.metadata


def test_custom_heading_names_and_h4_in_breadcrumb():
    chunks = MarkdownHeaderChunker(
        headers_to_split_on=[("####", "detail"), ("#", "title"), ("##", "topic")],
        chunk_size=500,
        chunk_overlap=0,
    ).split_document(make_document(page_content="# Robot\n## Sensor\n#### IMU\nPayload"))
    assert chunks[-1].metadata["section"] == "Robot > Sensor > IMU"
    assert chunks[-1].page_content.startswith("[Robot > Sensor > IMU]")


def test_no_headers_and_prefix_disabled():
    doc = make_document(page_content="plain text", metadata={"section": "Original"})
    chunks = MarkdownHeaderChunker(headers_to_split_on=[], prefix_section_context=False).split_document(doc)
    assert chunks[0].page_content == "plain text"
    assert chunks[0].metadata["source_section"] == "Original"
    assert "section" not in chunks[0].metadata


def test_fenced_heading_is_not_a_section():
    doc = make_document(page_content="# Real\n\n```python\n# Code comment\nprint(1)\n```\n\nEnd")
    chunks = MarkdownHeaderChunker(chunk_size=500, chunk_overlap=0).split_document(doc)
    assert all(c.metadata["section"] == "Real" for c in chunks)
    assert "# Code comment" in "".join(c.page_content for c in chunks)


@pytest.mark.parametrize("chunker_type", [MarkdownHeaderChunker, StandardTextChunker])
def test_special_token_literals_are_plain_text(chunker_type):
    text = "<|endoftext|> là nội dung <|fim_prefix|>"
    chunks = chunker_type(chunk_size=50, chunk_overlap=0, use_token_length=True).split_document(
        make_document(page_content=text),
    )
    assert "".join(c.page_content for c in chunks) == text


def test_unicode_is_not_corrupted_and_hard_budget_is_enforced():
    text = "🤖感測器 đồng bộ e\u0301 " * 30
    count = get_token_counter()
    chunks = StandardTextChunker(chunk_size=5, chunk_overlap=0, use_token_length=True).split_document(
        make_document(page_content=text),
    )
    assert "".join(c.page_content for c in chunks) == text
    assert all(count(c.page_content) <= 5 for c in chunks)


def test_impossible_unicode_budget_fails_instead_of_corrupting_text():
    with pytest.raises(ValueError, match="Unicode character"):
        StandardTextChunker(chunk_size=1, chunk_overlap=0, use_token_length=True).split_document(
            make_document(page_content="🤖"),
        )


def test_repeated_chunks_have_unique_ids_and_duplicate_inputs_are_deduplicated():
    doc = make_document(page_content="A" * 120, metadata={"source_file": "repeat.md"})
    chunker = StandardTextChunker(chunk_size=20, chunk_overlap=0, use_token_length=False)
    chunks = chunker.split_document(doc)
    assert len(chunks) == 6
    ids = [generate_document_hash_id(c) for c in chunks]
    assert len(set(ids)) == 6
    unique, unique_ids = prepare_chunks_for_index(chunker.split_documents([doc, doc]))
    assert unique_ids == ids
    assert len(unique) == 6


def test_source_namespace_and_test_case_are_part_of_id():
    a = make_document(page_content="same", metadata={"source_collection": "a", "source_document_id": "1"})
    b = make_document(page_content="same", metadata={"source_collection": "b", "source_document_id": "1"})
    assert generate_document_hash_id(a) != generate_document_hash_id(b)
    a.metadata = {"source_id": make_source_id("dataset", "case1")}
    b.metadata = {"source_id": make_source_id("dataset", "case2")}
    assert generate_document_hash_id(a) != generate_document_hash_id(b)


def test_batch_reordering_does_not_change_ids():
    docs = [make_document(page_content="A" * 60, metadata={"source_file": name}) for name in ["a", "b"]]
    chunker = StandardTextChunker(chunk_size=20, chunk_overlap=0, use_token_length=False)
    first = {generate_document_hash_id(c) for c in chunker.split_documents(docs)}
    second = {generate_document_hash_id(c) for c in chunker.split_documents(list(reversed(docs)))}
    assert first == second


@pytest.mark.parametrize("chunker_type", [MarkdownHeaderChunker, StandardTextChunker])
@pytest.mark.parametrize("size, overlap", [(0, 0), (-1, 0), (20, -1), (20, 20), (True, 0), (20, 1.5)])
def test_invalid_sizes_fail_early(chunker_type, size, overlap):
    with pytest.raises(ValueError):
        chunker_type(chunk_size=size, chunk_overlap=overlap)


@pytest.mark.parametrize("chunker_type", [MarkdownHeaderChunker, StandardTextChunker])
def test_chunk_unit_comes_from_settings_and_can_be_overridden(chunker_type):
    settings = Settings(_env_file=None, rag_chunk_unit="characters", rag_token_encoding="cl100k_base")
    assert chunker_type(settings=settings).use_token_length is False
    assert chunker_type(settings=settings, use_token_length=True).use_token_length is True
    settings = Settings(_env_file=None, rag_chunk_unit="tokens")
    assert chunker_type(settings=settings).use_token_length is True


def test_split_documents_parallel_matches_sequential():
    docs = [
        make_document(page_content=f"# Doc {i}\nContent line {i} in playbook.", metadata={"source_file": f"doc_{i}.md"})
        for i in range(10)
    ]
    chunker = MarkdownHeaderChunker(chunk_size=100, chunk_overlap=10, use_token_length=False)
    seq_chunks = chunker.split_documents(docs)
    par_chunks = chunker.split_documents_parallel(docs, max_workers=4)

    assert len(seq_chunks) == len(par_chunks)
    assert [c.page_content for c in seq_chunks] == [c.page_content for c in par_chunks]
    assert [c.metadata["source_file"] for c in seq_chunks] == [c.metadata["source_file"] for c in par_chunks]

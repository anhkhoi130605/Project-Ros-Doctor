from langchain_core.documents import Document

from src.agents.chunking.strategies import (
    MarkdownHeaderChunker,
    StandardTextChunker,
    generate_document_hash_id,
)


def test_markdown_header_chunker_enrichment():
    content = """# Guide Title

## 1. Definition
Definition text explaining the problem.

## 2. Root Causes
Root cause 1.
Root cause 2.
"""
    doc = Document(
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
    doc = Document(page_content="A" * 1500, metadata={"source": "test"})
    chunker = StandardTextChunker(chunk_size=500, chunk_overlap=50)
    chunks = chunker.split_documents([doc])

    assert len(chunks) > 1
    for c in chunks:
        assert len(c.page_content) <= 500


def test_generate_document_hash_id_deterministic():
    doc = Document(page_content="Same content", metadata={"source_file": "file1.md", "section": "Root Causes"})
    id1 = generate_document_hash_id(doc, fallback_index=0)
    id2 = generate_document_hash_id(doc, fallback_index=0)
    id3 = generate_document_hash_id(doc, fallback_index=1)

    assert id1 == id2
    assert id1 != id3

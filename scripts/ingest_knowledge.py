"""Knowledge ingestion CLI script for ROS2 Doctor RAG system.

Loads technical playbooks from src/Rag_knowledge and benchmark datasets
from MongoDB, chunks with header preservation, and indexes into ChromaDB.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Configure stdout encoding for Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from src.agents.chunking.strategies import (  # noqa: E402
    MarkdownHeaderChunker,
    StandardTextChunker,
)
from src.agents.embedding.models import get_embedding_model  # noqa: E402
from src.agents.ingestion.loaders import MarkdownPlaybookLoader, MongoDatasetLoader  # noqa: E402
from src.agents.vectordb.indexing import sync_source_chunks  # noqa: E402
from src.agents.vectordb.stores import ChromaVectorStore, get_chroma_store  # noqa: E402
from src.config import get_settings  # noqa: E402


def ingest_knowledge(
    source: str = "all",
    rebuild: bool = False,
    batch_size: int = 50,
) -> int:
    if isinstance(batch_size, bool) or not isinstance(batch_size, int) or batch_size <= 0:
        raise ValueError("batch_size must be a positive integer")
    settings = get_settings()

    if not settings.openai_api_key:
        print("[ERROR] OPENAI_API_KEY chưa được cấu hình trong .env. Vui lòng cấu hình trước khi chạy.")
        return 1

    print("=" * 60)
    print("🚀 ROS2 Doctor - RAG Knowledge Ingestion Pipeline")
    print(f"Collection: {settings.chroma_collection_name}")
    print(f"Persist Dir: {settings.chroma_persist_dir}")
    print(f"Source: {source} | Rebuild: {rebuild}")
    print("=" * 60)

    embeddings = get_embedding_model(settings)
    chroma_raw = get_chroma_store(settings=settings, embedding_function=embeddings)
    store = ChromaVectorStore(store=chroma_raw)
    print(f"Physical collection: {chroma_raw._collection.name}")

    if rebuild:
        print("\n[INFO] Đang xóa dữ liệu cũ trong collection ChromaDB...")
        try:
            store.reset_collection()
            print("[INFO] Đã xóa thành công.")
        except Exception as e:
            print(f"[WARN] Không thể reset collection: {e}")
            return 1

    total_added = 0

    # 1. Ingest Markdown Playbooks
    if source in ("markdown", "all"):
        print("\n📖 [1/2] Đang đọc tài liệu Markdown từ src/Rag_knowledge...")
        md_loader = MarkdownPlaybookLoader(namespace=settings.rag_source_namespace)
        md_docs = md_loader.load()
        print(f"-> Đã tìm thấy {len(md_docs)} tài liệu Markdown.")

        if md_docs:
            chunker = MarkdownHeaderChunker(settings=settings)
            chunks = chunker.split_documents(md_docs)
            print(f"-> Đã phân mảnh thành {len(chunks)} chunks có kế thừa Header & Metadata.")

            sync_source_chunks(chroma_raw, md_docs, chunks, batch_size)

            print(f"\n✅ Hoàn tất nạp Markdown Playbooks ({len(chunks)} chunks).")
            total_added += len(chunks)

    # 2. Ingest MongoDB Benchmark Datasets
    if source in ("mongo", "all"):
        print("\n🍃 [2/2] Đang đọc dữ liệu Benchmark Ground Truth từ MongoDB...")
        if not settings.mongo_connection_string:
            print("[WARN] MONGO_CONNECTION_STRING chưa được cấu hình. Bỏ qua nguồn MongoDB.")
        else:
            try:
                mongo_loader = MongoDatasetLoader(settings=settings)
                mongo_docs = mongo_loader.load()
                print(f"-> Đã đọc {len(mongo_docs)} documents từ MongoDB.")

                if mongo_docs:
                    chunks = StandardTextChunker(settings=settings).split_documents(mongo_docs)
                    sync_source_chunks(chroma_raw, mongo_docs, chunks, batch_size)
                    print(f"✅ Hoàn tất nạp dữ liệu MongoDB ({len(chunks)} chunks).")
                    total_added += len(chunks)
            except Exception as err:
                print(f"[WARN] Lỗi khi nạp từ MongoDB: {err}")
                return 1

    final_count = store.count()
    print("\n" + "=" * 60)
    print(f"🎉 Hoàn thành quá trình Ingestion! Tổng chunks hiện tại trong ChromaDB: {final_count}")
    print("=" * 60)
    return 0


def main():
    parser = argparse.ArgumentParser(description="Ingest technical playbooks and datasets into ChromaDB")
    parser.add_argument(
        "--source",
        choices=["all", "markdown", "mongo"],
        default="all",
        help="Nguồn dữ liệu cần nạp (mặc định: all)",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Xóa chỉ mục cũ và nạp lại từ đầu",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Số lượng chunks gửi mỗi đợt khi nạp vector (mặc định: 50)",
    )
    args = parser.parse_args()

    sys.exit(ingest_knowledge(source=args.source, rebuild=args.rebuild, batch_size=args.batch_size))


if __name__ == "__main__":
    main()

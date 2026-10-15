from unittest.mock import MagicMock

from src.agents.retrieval.pipeline import DIAGNOSTIC_FILTER, MongoRAGPipeline
from src.services.benchmark_dataset_service import BenchmarkDatasetService


def test_benchmark_api_preserves_structured_ground_truth_and_legacy_string():
    collection = MagicMock()
    detail = {"schema_version": 1, "has_fault": True, "fault_type": "timestamp_shift",
              "offset_ms": 150, "i18n": {"vi": {}, "en": {}}}
    collection.find_one.return_value = {"code": "TEST", "name": "Test", "test_cases": [
        {"code": "C07", "rosbag_name": "case_07.db3", "topic": "/tf", "start_sec": 20,
         "end_sec": 86, "label": "timestamp_shift", "ground_truth": "legacy",
         "case_id": "case_07", "ground_truth_detail": detail}]}
    dataset = BenchmarkDatasetService(MagicMock(), collection).get_dataset("TEST")
    case = dataset.test_cases[0]
    assert case.ground_truth == "legacy"
    assert case.ground_truth_detail == detail
    assert case.case_id == "case_07"


def test_diagnostic_ingestion_never_reads_answers_evaluations_or_prior_responses():
    pipeline = object.__new__(MongoRAGPipeline)
    pipeline._settings = MagicMock(rag_max_documents_per_collection=10)
    pipeline._database = MagicMock()
    pipeline._database.list_collection_names.return_value = [
        "benchmark_datasets", "benchmark_evaluations", "agent_execution_traces"]
    assert pipeline._load_mongo_documents() == []
    pipeline._database.__getitem__.assert_not_called()


def test_query_filter_excludes_old_answer_chunks_even_when_caller_supplies_filter():
    pipeline = object.__new__(MongoRAGPipeline)
    pipeline._settings = MagicMock(rag_top_k=5)
    pipeline._vector_store = MagicMock()
    pipeline._vector_store.similarity_search_with_relevance_scores.return_value = []
    assert pipeline.retrieve("diagnose") == ("", [])
    assert pipeline._vector_store.similarity_search_with_relevance_scores.call_args.kwargs['filter'] == DIAGNOSTIC_FILTER
    pipeline.retrieve("diagnose", filter={"source_collection": "benchmark_datasets"})
    assert pipeline._vector_store.similarity_search_with_relevance_scores.call_args.kwargs['filter'] == {
        "$and": [DIAGNOSTIC_FILTER, {"source_collection": "benchmark_datasets"}]}


def test_real_chroma_excludes_preexisting_answer_chunks(tmp_path):
    from langchain_core.documents import Document
    from langchain_core.embeddings import Embeddings

    from src.agents.vectordb.stores import create_chroma_store

    class FixedEmbeddings(Embeddings):
        def embed_documents(self, texts):
            return [[1.0, 0.0] for _ in texts]

        def embed_query(self, text):
            return [1.0, 0.0]

    store = create_chroma_store(persist_directory=str(tmp_path), embedding_function=FixedEmbeddings(),
                                embedding_profile="ground-truth-boundary")
    docs = [Document(page_content=name, metadata={"source_collection": name, "source_type": "mongodb"})
            for name in ["benchmark_datasets", "benchmark_evaluations", "agent_execution_traces", "findings_evidence"]]
    docs.append(Document(page_content="playbook", metadata={"source_type": "playbook"}))
    store._store.add_documents(docs, ids=[str(i) for i in range(len(docs))])
    pipeline = object.__new__(MongoRAGPipeline)
    pipeline._settings = MagicMock(rag_top_k=10)
    pipeline._vector_store = store._store
    context, sources = pipeline.retrieve("diagnose")
    assert len(sources) == 2
    assert "benchmark_datasets" not in context
    assert "agent_execution_traces" not in context
    assert "findings_evidence" in context
    assert "playbook" in context
    assert pipeline.retrieve("answers", filter={"source_collection": "benchmark_datasets"}) == ("", [])

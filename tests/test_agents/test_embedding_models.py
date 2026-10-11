import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pytest
from langchain_openai import OpenAIEmbeddings

from src.agents.embedding.models import (
    GlobalLifecycleState,
    LifecycleState,
    ResilientEmbeddingModel,
    create_embedding_model,
    get_embedding_model,
    reset_global_embedding_manager,
    shutdown_embedding_model,
    validate_embedding_vector,
)
from src.config import Settings


def test_embed_query_does_not_deadlock():
    """Verify that embed_query does not deadlock with nested locks."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
    )
    with patch.object(model.client, "create", return_value={"data": [{"embedding": [0.1] * 1536}]}):
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(model.embed_query, "test query")
            result = future.result(timeout=2)
            assert len(result) == 1536
    model.close()


def test_create_embedding_model_missing_or_invalid_key_raises_error():
    settings = Settings(openai_api_key="")
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY chưa được cấu hình"):
        create_embedding_model(settings=settings)

    settings_ws = Settings(openai_api_key="   ")
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY chưa được cấu hình"):
        create_embedding_model(settings=settings_ws)


def test_create_embedding_model_fail_fast_validation():
    with pytest.raises(ValueError, match="embedding_request_timeout"):
        create_embedding_model(api_key="key", request_timeout=-5.0)

    with pytest.raises(ValueError, match="embedding_request_timeout"):
        create_embedding_model(api_key="key", request_timeout=float("nan"))

    with pytest.raises(ValueError, match="embedding_request_timeout"):
        create_embedding_model(api_key="key", request_timeout=float("inf"))

    with pytest.raises(ValueError, match="embedding_max_retries"):
        create_embedding_model(api_key="key", max_retries=-1)

    with pytest.raises(ValueError, match="embedding_chunk_size"):
        create_embedding_model(api_key="key", chunk_size=0)

    with pytest.raises(ValueError, match="embedding_max_concurrency"):
        create_embedding_model(api_key="key", max_concurrency=0)

    with pytest.raises(ValueError, match="model must be a non-empty string"):
        create_embedding_model(api_key="key", model="   ")

    with pytest.raises(ValueError, match="max_tokens must be a positive integer"):
        create_embedding_model(api_key="key", max_tokens=0)


def test_unconfigured_model_cannot_embed():
    """Verify that ResilientEmbeddingModel rejects embedding if not configured."""
    model = ResilientEmbeddingModel(api_key="fake")
    with pytest.raises(RuntimeError, match="Embedding model is not configured"):
        model.embed_query("test")


def test_validate_embedding_vector():
    validate_embedding_vector([0.1, 0.2], expected_dimensions=2)

    with pytest.raises(ValueError, match="cannot be empty"):
        validate_embedding_vector([])

    with pytest.raises(ValueError, match="dimension mismatch"):
        validate_embedding_vector([0.1, 0.2], expected_dimensions=3)

    with pytest.raises(ValueError, match="non-finite numeric values"):
        validate_embedding_vector([0.1, float("nan")])

    with pytest.raises(ValueError, match="non-finite numeric values"):
        validate_embedding_vector([0.1, float("inf")])

    with pytest.raises(ValueError, match="non-finite numeric values"):
        validate_embedding_vector([0.1, True])


def test_preflight_token_validation():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
    )
    assert isinstance(model, ResilientEmbeddingModel)
    model._max_tokens = 5

    with pytest.raises(ValueError, match="Input exceeds token budget"):
        model.embed_query("This is a sentence that definitely exceeds five tokens in length")

    model.close()


def test_reconfiguration_locked_after_first_configuration():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
    )
    assert isinstance(model, ResilientEmbeddingModel)
    assert model._configured is True

    with pytest.raises(RuntimeError, match="already been configured"):
        model.configure_resilience(max_concurrency=5)

    model.close()


def test_cached_vector_immutability():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
    )
    with patch.object(model.client, "create", return_value={"data": [{"embedding": [1.0] * 1536}]}):
        vec1 = model.embed_query("immutable text")
        vec1[0] = 999.0

        vec2 = model.embed_query("immutable text")
        assert vec2[0] == 1.0
        assert vec2 != vec1
    model.close()


def test_single_flight_stampede_prevention():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
        max_concurrency=10,
    )

    api_call_count = 0

    def slow_embed(**kwargs):
        nonlocal api_call_count
        api_call_count += 1
        time.sleep(0.05)
        return {"data": [{"embedding": [0.5] * 1536}]}

    with patch.object(model.client, "create", side_effect=slow_embed):
        queries = ["same query"] * 10
        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(model.embed_query, queries))

        assert len(results) == 10
        assert all(len(res) == 1536 for res in results)
        assert api_call_count == 1
    model.close()


@pytest.mark.asyncio
async def test_follower_cancellation_does_not_break_shared_future():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
    )

    api_call_count = 0

    async def slow_aembed(**kwargs):
        nonlocal api_call_count
        api_call_count += 1
        await asyncio.sleep(0.1)
        return {"data": [{"embedding": [0.77] * 1536}]}

    with patch.object(model.async_client, "create", side_effect=slow_aembed):
        leader_task = asyncio.create_task(model.aembed_query("cancellation_test"))
        await asyncio.sleep(0.01)

        follower_task = asyncio.create_task(model.aembed_query("cancellation_test"))
        await asyncio.sleep(0.01)

        follower_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await follower_task

        leader_res = await leader_task
        assert len(leader_res) == 1536
        assert api_call_count == 1

        cached_res = await model.aembed_query("cancellation_test")
        assert len(cached_res) == 1536
        assert api_call_count == 1

    await model.aclose()


@pytest.mark.asyncio
async def test_leader_caller_cancellation_does_not_break_followers():
    """Verify that when the caller coroutine that started the flight is cancelled,

    the detached worker continues in the background and resolves the future for followers.
    """
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
    )

    api_call_count = 0

    async def slow_aembed(**kwargs):
        nonlocal api_call_count
        api_call_count += 1
        await asyncio.sleep(0.08)
        return {"data": [{"embedding": [0.88] * 1536}]}

    with patch.object(model.async_client, "create", side_effect=slow_aembed):
        # Leader task starts
        leader_caller_task = asyncio.create_task(model.aembed_query("leader_cancel_test"))
        await asyncio.sleep(0.01)

        # Follower task starts
        follower_task = asyncio.create_task(model.aembed_query("leader_cancel_test"))
        await asyncio.sleep(0.01)

        # Cancel the LEADER caller!
        leader_caller_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await leader_caller_task

        # The follower must SUCCEED because the detached worker completes!
        follower_res = await follower_task
        assert len(follower_res) == 1536
        assert api_call_count == 1

    await model.aclose()


def test_overlapping_batch_registration_does_not_deadlock():
    """Verify that multiple concurrent threads submitting overlapping batches do not deadlock."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
    )

    def mock_embed_docs(texts: list[str]):
        time.sleep(0.02)
        return [[0.1] * 1536 for _ in texts]

    with patch.object(OpenAIEmbeddings, "embed_documents", side_effect=mock_embed_docs):
        with ThreadPoolExecutor(max_workers=4) as executor:
            f1 = executor.submit(model.embed_documents, ["text_A", "text_B"])
            f2 = executor.submit(model.embed_documents, ["text_B", "text_A"])
            f3 = executor.submit(model.embed_documents, ["text_B", "text_C"])
            res1 = f1.result(timeout=5)
            res2 = f2.result(timeout=5)
            res3 = f3.result(timeout=5)

        assert len(res1) == 2
        assert len(res2) == 2
        assert len(res3) == 2
    model.close()


def test_in_flight_request_completes_when_shutdown_occurs():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
    )

    def slow_embed(**kwargs):
        time.sleep(0.1)
        return {"data": [{"embedding": [0.12] * 1536}]}

    with patch.object(model.client, "create", side_effect=slow_embed):
        with ThreadPoolExecutor(max_workers=2) as executor:
            req_future = executor.submit(model.embed_query, "request_during_shutdown")
            time.sleep(0.02)

            close_future = executor.submit(model.close, timeout=2.0)

            result = req_future.result(timeout=2.0)
            assert len(result) == 1536

            close_future.result(timeout=2.0)

    assert model._state == LifecycleState.CLOSED


@pytest.mark.asyncio
async def test_concurrent_shutdown_calls_are_mutually_exclusive():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-api-key",
        cache_enabled=True,
    )

    task1 = asyncio.create_task(model.aclose(timeout=2.0))
    task2 = asyncio.create_task(model.aclose(timeout=2.0))

    await asyncio.gather(task1, task2)
    assert model._state == LifecycleState.CLOSED


def test_concurrent_singleton_access_is_thread_safe():
    """Verify that multiple threads concurrently calling get_embedding_model get the exact same instance."""
    with patch("src.agents.embedding.models.get_settings", return_value=Settings(openai_api_key="test-key")):
        with ThreadPoolExecutor(max_workers=8) as executor:
            instances = list(executor.map(lambda _: get_embedding_model(), range(20)))

        # All 20 threads received the exact same instance!
        first = instances[0]
        assert all(inst is first for inst in instances)
        assert first.is_closed is False


def test_singleton_auto_recovers_if_closed():
    """Verify that get_embedding_model creates a new instance if cached default was closed."""
    settings = Settings(openai_api_key="test-key")
    with patch("src.agents.embedding.models.get_settings", return_value=settings):
        model1 = get_embedding_model()
        assert model1.is_closed is False

        model1.close()
        assert model1.is_closed is True

        model2 = get_embedding_model()
        assert model2 is not model1
        assert model2.is_closed is False
        model2.close()


@pytest.mark.asyncio
async def test_shutdown_embedding_model_graceful():
    reset_global_embedding_manager()
    settings = Settings(openai_api_key="test-shutdown-key")
    with patch("src.agents.embedding.models.get_settings", return_value=settings):
        m = get_embedding_model()
        assert isinstance(m, ResilientEmbeddingModel)
        await shutdown_embedding_model()
        assert m.is_closed is True

        # Calling get_embedding_model after shutdown must be rejected
        with pytest.raises(RuntimeError, match="Global embedding manager is in STOPPED state"):
            get_embedding_model()

    reset_global_embedding_manager()


def test_input_text_empty_or_whitespace_raises_value_error():
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-key",
    )
    with pytest.raises(ValueError, match="cannot be empty or blank"):
        model.embed_query("")

    with pytest.raises(ValueError, match="cannot be empty or blank"):
        model.embed_query("   \n\t  ")

    with pytest.raises(ValueError, match="cannot be empty or blank"):
        model.embed_documents(["valid", "   "])

    model.close()


def test_max_tokens_exceeds_openai_limit_raises_value_error():
    with pytest.raises(ValueError, match="max_tokens must be a positive integer <= 8191"):
        create_embedding_model(api_key="key", max_tokens=10000)


def test_configure_resilience_validates_parameters():
    model = ResilientEmbeddingModel(api_key="key")
    with pytest.raises(ValueError, match="max_concurrency must be a positive integer"):
        model.configure_resilience(max_concurrency=0)

    with pytest.raises(ValueError, match="cache_max_size must be a positive integer"):
        model.configure_resilience(cache_max_size=0)

    with pytest.raises(ValueError, match="max_tokens must be a positive integer <= 8191"):
        model.configure_resilience(max_tokens=9000)


def test_shutdown_recovery_with_retry_ownership():
    """Verify that if an initial close() attempt fails, a subsequent retry gains ownership and succeeds."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-key",
    )

    # First attempt fails due to simulated drain timeout
    with patch.object(model, "_wait_for_drain", return_value=False):
        with pytest.raises(TimeoutError):
            model.close(timeout=0.01)

    assert model._state == LifecycleState.CLOSING
    assert model._shutdown_future is None

    # Retry attempt must succeed under new ownership
    model.close(timeout=1.0)
    assert model._state == LifecycleState.CLOSED


@pytest.mark.asyncio
async def test_caller_cancellation_worker_remains_in_registry_and_drains():
    """Verify that when caller cancels, background worker remains registered in _background_tasks

    and shutdown waits for the worker to finish before closing resources.
    """
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-key",
    )

    worker_finished = False

    async def slow_aembed(**kwargs):
        nonlocal worker_finished
        await asyncio.sleep(0.08)
        worker_finished = True
        return {"data": [{"embedding": [0.33] * 1536}]}

    with patch.object(model.async_client, "create", side_effect=slow_aembed):
        caller_task = asyncio.create_task(model.aembed_query("cancel_test"))
        await asyncio.sleep(0.01)

        # Worker is registered in _background_tasks
        assert len(model._background_tasks) == 1

        # Cancel caller
        caller_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await caller_task

        # After caller cancellation, worker is STILL in _background_tasks
        assert len(model._background_tasks) == 1
        assert worker_finished is False

        # Shutdown waits for worker drain
        await model.aclose(timeout=2.0)
        assert worker_finished is True
        assert len(model._background_tasks) == 0
        assert model._state == LifecycleState.CLOSED


@pytest.mark.asyncio
async def test_close_from_running_event_loop_raises_runtime_error():
    """Verify that calling sync close() from inside an active running event loop raises RuntimeError."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-key",
    )
    with pytest.raises(RuntimeError, match="Synchronous close.*cannot be called from within a running event loop"):
        model.close()
    await model.aclose()


@pytest.mark.asyncio
async def test_global_shutdown_error_state_and_instance_retained_on_failure():
    """Verify that when aclose() fails during global shutdown, manager transitions to ERROR

    and retains the instance reference so resources are not orphaned.
    """
    reset_global_embedding_manager(force=True)
    settings = Settings(openai_api_key="test-shutdown-fail")
    with patch("src.agents.embedding.models.get_settings", return_value=settings):
        instance = get_embedding_model()
        assert isinstance(instance, ResilientEmbeddingModel)

        with patch.object(ResilientEmbeddingModel, "aclose", side_effect=TimeoutError("Drain timeout simulated")):
            with pytest.raises(TimeoutError):
                await shutdown_embedding_model()

        # Instance reference must NOT be orphaned, and state must be ERROR
        from src.agents.embedding.models import _GLOBAL_EMBEDDING_INSTANCE, _GLOBAL_MANAGER_STATE

        assert _GLOBAL_EMBEDDING_INSTANCE is instance
        assert _GLOBAL_MANAGER_STATE == GlobalLifecycleState.ERROR

    # Reset with force for cleanup
    reset_global_embedding_manager(force=True)


def test_reset_global_embedding_manager_rejects_active_instance():
    """Verify that reset_global_embedding_manager(force=False) rejects reset if instance is still active."""
    reset_global_embedding_manager(force=True)
    settings = Settings(openai_api_key="test-reset-protect")
    with patch("src.agents.embedding.models.get_settings", return_value=settings):
        instance = get_embedding_model()
        assert isinstance(instance, ResilientEmbeddingModel)
        assert instance.is_closed is False

        with pytest.raises(
            RuntimeError, match="Cannot reset global embedding manager while active instance is running"
        ):
            reset_global_embedding_manager(force=False)

        instance.close()
        # After close, reset is allowed
        reset_global_embedding_manager(force=False)


def test_unified_lock_prevents_lock_order_inversion():
    """Verify that _drain_condition uses self._lock as its underlying mutex."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-key",
    )
    assert model._drain_condition._lock is model._lock
    model.close()


@pytest.mark.asyncio
async def test_worker_saturation_does_not_leave_dangling_in_flight_future():
    """Verify that when worker capacity is saturated, admission rejects the task,
    rolls back, and does NOT leave dangling unresolved futures in _in_flight."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-sat-key",
    )
    # Directly adjust max_concurrency to 1, so max_workers is 4
    with model._lock:
        model._max_concurrency = 1

    # Fill background tasks to max_workers = 4
    dummy_tasks = []

    async def dummy_coro():
        await asyncio.sleep(10)

    for _ in range(4):
        t = asyncio.create_task(dummy_coro())
        dummy_tasks.append(t)
        model._register_background_task(t)

    # Request A should be rejected by worker saturation check
    with pytest.raises(RuntimeError, match="Background worker saturation"):
        await model.aembed_query("test saturation query")

    # Verify that _in_flight does NOT have dangling future
    assert len(model._in_flight) == 0

    # Cleanup dummy tasks
    for t in dummy_tasks:
        t.cancel()
    await asyncio.gather(*dummy_tasks, return_exceptions=True)
    await model.aclose()


@pytest.mark.asyncio
async def test_aclose_strictly_respects_deadline_during_cancelled_gather():
    """Verify that aclose() respects total shutdown deadline even if cancelled tasks take time to gather."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-deadline-key",
    )

    async def stubborn_task():
        try:
            await asyncio.sleep(100)
        except asyncio.CancelledError:
            # Emulate slow response to cancellation
            await asyncio.sleep(10)

    t = asyncio.create_task(stubborn_task())
    model._register_background_task(t)

    start = time.perf_counter()
    # aclose with 0.3s timeout, expects TimeoutError
    with pytest.raises(TimeoutError, match="Embedding requests did not finish before shutdown timeout"):
        await model.aclose(timeout=0.3)
    elapsed = time.perf_counter() - start

    # Must complete near 0.3s deadline (e.g. < 1.5s), NOT 10s
    assert elapsed < 1.5

    t.cancel()
    await asyncio.gather(t, return_exceptions=True)


def test_batch_embedding_atomicity_does_not_publish_or_cache_on_partial_failure():
    """Verify that if one vector in a batch is invalid, earlier vectors are NOT cached or published."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-atomic-key",
    )
    # Mock embed_documents returning 2 vectors: first valid 1536 dim, second invalid (NaN)
    bad_vectors = [[0.1] * 1536, [float("nan")] * 1536]
    with patch.object(OpenAIEmbeddings, "embed_documents", return_value=bad_vectors):
        with pytest.raises(ValueError, match="Embedding contains invalid or non-finite numeric values"):
            model.embed_documents(["doc1", "doc2"])

    # Verify atomicity: Neither doc1 nor doc2 was cached!
    info = model.cache_info()
    assert info["size"] == 0
    assert info["validation_errors"] == 1
    assert model._lookup_cache(model._compute_key("doc1")) is None
    model.close()


@pytest.mark.asyncio
async def test_async_batch_embedding_atomicity_does_not_publish_or_cache_on_partial_failure():
    """Verify that if one vector in an async batch is invalid, earlier vectors are NOT cached or published."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-atomic-async-key",
    )
    # Mock aembed_documents returning 2 vectors: first valid 1536 dim, second wrong dim 512
    bad_vectors = [[0.1] * 1536, [0.1] * 512]
    with patch.object(OpenAIEmbeddings, "aembed_documents", return_value=bad_vectors):
        with pytest.raises(ValueError, match="Embedding dimension mismatch"):
            await model.aembed_documents(["doc_async1", "doc_async2"])

    info = model.cache_info()
    assert info["size"] == 0
    assert info["validation_errors"] == 1
    assert model._lookup_cache(model._compute_key("doc_async1")) is None
    await model.aclose()


@pytest.mark.asyncio
async def test_close_called_inside_event_loop_fails_fast_before_lock():
    """Verify that calling sync close() from inside an event loop raises RuntimeError immediately."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-fail-fast-key",
    )
    with pytest.raises(RuntimeError, match="Synchronous close.*cannot be called from within a running event loop"):
        model.close()
    await model.aclose()


@pytest.mark.asyncio
async def test_reserved_workers_backpressure_quota():
    """Verify that reserved_workers directly enforces the admission limit under concurrency."""
    model = create_embedding_model(
        model="text-embedding-3-small",
        api_key="test-reserve-key",
    )
    with model._lock:
        model._max_concurrency = 1
        # Artificially reserve 4 worker slots
        model._reserved_workers = 4

    # Now an incoming request should immediately be rejected with Background worker saturation
    with pytest.raises(RuntimeError, match="Background worker saturation"):
        await model.aembed_query("test-reserve-fail")

    # Clear reserved workers and verify admission works
    with model._lock:
        model._reserved_workers = 0

    with patch.object(model.async_client, "create", return_value={"data": [{"embedding": [0.1] * 1536}]}):
        res = await model.aembed_query("test-reserve-pass")
        assert len(res) == 1536

    await model.aclose()


@pytest.mark.asyncio
async def test_query_and_documents_share_provider_flight():
    model = create_embedding_model(api_key="test-key", dimensions=2)
    started = asyncio.Event()
    release = asyncio.Event()

    async def provider_create(**kwargs):
        started.set()
        await release.wait()
        return {"data": [{"embedding": [1.0, 0.0]} for _ in kwargs["input"]]}

    try:
        with patch.object(model.async_client, "create", side_effect=provider_create) as provider:
            query = asyncio.create_task(model.aembed_query("shared text"))
            await asyncio.wait_for(started.wait(), timeout=2)
            documents = asyncio.create_task(model.aembed_documents(["shared text", "shared text"]))
            await asyncio.sleep(0)
            release.set()
            query_result, document_results = await asyncio.wait_for(asyncio.gather(query, documents), timeout=2)
            assert document_results == [query_result, query_result]
            provider.assert_awaited_once()
            assert model.cache_info()["in_flight"] == 0
            assert model.cache_info()["logical_requests"] == 2
    finally:
        release.set()
        await model.aclose()


@pytest.mark.asyncio
async def test_provider_error_settles_query_and_allows_retry():
    model = create_embedding_model(api_key="test-key", dimensions=2)
    try:
        with patch.object(model.async_client, "create", side_effect=RuntimeError("provider failed")):
            with pytest.raises(RuntimeError, match="provider failed"):
                await asyncio.wait_for(model.aembed_query("retry text"), timeout=2)
        assert model.cache_info()["in_flight"] == 0
        with patch.object(model.async_client, "create", return_value={"data": [{"embedding": [1.0, 0.0]}]}):
            assert await asyncio.wait_for(model.aembed_query("retry text"), timeout=2) == [1.0, 0.0]
    finally:
        await model.aclose()

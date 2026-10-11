from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import threading
import time
import weakref
from collections import OrderedDict
from concurrent.futures import Future
from enum import StrEnum
from typing import Any

import httpx
import tiktoken
from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings
from pydantic import PrivateAttr

from src.config import Settings, get_settings

logger = logging.getLogger("src.agents.embedding")

CURRENT_EMBEDDING_PROFILE_VERSION = "v2"
OPENAI_MAX_EMBEDDING_TOKENS = 8191

KNOWN_DEFAULT_DIMENSIONS: dict[str, int] = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
}


class LifecycleState(StrEnum):
    OPEN = "OPEN"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"


class GlobalLifecycleState(StrEnum):
    RUNNING = "RUNNING"
    SHUTTING_DOWN = "SHUTTING_DOWN"
    STOPPED = "STOPPED"
    ERROR = "ERROR"


def _validate_config(
    model: str,
    api_key: str,
    timeout: float,
    retries: int,
    chunk_size: int,
    concurrency: int,
    cache_max_size: int,
    dimensions: int | None,
    max_tokens: int | None = None,
) -> None:
    """Fail-fast validation for all embedding hyperparameters."""
    if not isinstance(model, str) or not model.strip():
        raise ValueError("model must be a non-empty string")
    if not isinstance(api_key, str) or not api_key.strip():
        raise RuntimeError("OPENAI_API_KEY chưa được cấu hình hoặc là chuỗi rỗng")
    if isinstance(timeout, bool) or not isinstance(timeout, (int, float)) or not math.isfinite(timeout) or timeout <= 0:
        raise ValueError("embedding_request_timeout must be a finite positive number")
    if isinstance(retries, bool) or not isinstance(retries, int) or retries < 0:
        raise ValueError("embedding_max_retries must be a non-negative integer")
    if isinstance(chunk_size, bool) or not isinstance(chunk_size, int) or chunk_size <= 0:
        raise ValueError("embedding_chunk_size must be a positive integer")
    if isinstance(concurrency, bool) or not isinstance(concurrency, int) or concurrency <= 0:
        raise ValueError("embedding_max_concurrency must be a positive integer")
    if isinstance(cache_max_size, bool) or not isinstance(cache_max_size, int) or cache_max_size <= 0:
        raise ValueError("embedding_cache_max_size must be a positive integer")
    if dimensions is not None and (isinstance(dimensions, bool) or not isinstance(dimensions, int) or dimensions <= 0):
        raise ValueError("embedding_dimensions must be a positive integer or None")
    if max_tokens is not None and (
        isinstance(max_tokens, bool)
        or not isinstance(max_tokens, int)
        or max_tokens <= 0
        or max_tokens > OPENAI_MAX_EMBEDDING_TOKENS
    ):
        raise ValueError(f"max_tokens must be a positive integer <= {OPENAI_MAX_EMBEDDING_TOKENS}")


def validate_embedding_vector(
    vector: list[float] | tuple[float, ...],
    expected_dimensions: int | None = None,
) -> None:
    """Validate numeric integrity, finite values, and dimensionality of an embedding vector."""
    if not vector:
        raise ValueError("Embedding vector cannot be empty")
    if expected_dimensions is not None and len(vector) != expected_dimensions:
        raise ValueError(f"Embedding dimension mismatch: expected {expected_dimensions}, got {len(vector)}")
    for v in vector:
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            raise ValueError("Embedding contains invalid or non-finite numeric values")


class ResilientEmbeddingModel(OpenAIEmbeddings):
    """Production-grade embedding model wrapping OpenAIEmbeddings with:

    - Full lifecycle state machine (OPEN -> CLOSING -> CLOSED) with recoverable timeout.
    - True shutdown ownership to prevent duplicate/concurrent cleanup calls.
    - Unified single-lock condition synchronization to prevent lock-order inversion deadlocks.
    - Independent async background worker tasks tracked in a managed backpressured registry.
    - Deadlock-free single-flight batch registration via deterministic key sorting.
    - Cancellation-shielded follower waiting to prevent cascade cancellation.
    - Weakref-backed event-loop-safe async semaphores.
    - Scope-aware cache keys with tenant/credential partition and model profile.
    - Preflight token validation synchronized with Chunking V3 limits.
    - Strict vector validity and dimension schema enforcement.
    """

    _lock: threading.RLock = PrivateAttr(default_factory=threading.RLock)
    _state: LifecycleState = PrivateAttr(default=LifecycleState.OPEN)
    _configured: bool = PrivateAttr(default=False)

    _active_requests: int = PrivateAttr(default=0)
    _drain_condition: threading.Condition | None = PrivateAttr(default=None)

    _background_tasks: set[asyncio.Task] = PrivateAttr(default_factory=set)
    _reserved_workers: int = PrivateAttr(default=0)
    _total_requests: int = PrivateAttr(default=0)
    _network_calls: int = PrivateAttr(default=0)
    _network_errors: int = PrivateAttr(default=0)
    _validation_errors: int = PrivateAttr(default=0)
    _cancellation_errors: int = PrivateAttr(default=0)
    _provider_calls: int = PrivateAttr(default=0)
    _dedup_hits: int = PrivateAttr(default=0)

    _shutdown_lock: threading.Lock = PrivateAttr(default_factory=threading.Lock)
    _shutdown_future: Future[None] | None = PrivateAttr(default=None)

    _cache: OrderedDict[str, tuple[float, ...]] = PrivateAttr(default_factory=OrderedDict)
    _cache_max_size: int = PrivateAttr(default=2000)
    _cache_enabled: bool = PrivateAttr(default=True)
    _cache_hits: int = PrivateAttr(default=0)
    _cache_misses: int = PrivateAttr(default=0)

    _in_flight: dict[str, Future[tuple[float, ...]]] = PrivateAttr(default_factory=dict)

    _sync_semaphore: threading.BoundedSemaphore = PrivateAttr(default_factory=lambda: threading.BoundedSemaphore(10))
    _async_semaphores: weakref.WeakKeyDictionary = PrivateAttr(default_factory=weakref.WeakKeyDictionary)
    _max_concurrency: int = PrivateAttr(default=10)

    _http_client: httpx.Client | None = PrivateAttr(default=None)
    _http_async_client: httpx.AsyncClient | None = PrivateAttr(default=None)
    _provider_id: str = PrivateAttr(default="openai")
    _endpoint_id: str = PrivateAttr(default="default")
    _scope_id: str = PrivateAttr(default="global")
    _max_tokens: int = PrivateAttr(default=OPENAI_MAX_EMBEDDING_TOKENS)
    _token_encoder: Any = PrivateAttr(default=None)

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        # Condition uses self._lock directly to avoid lock-order inversion
        self._drain_condition = threading.Condition(self._lock)

    @property
    def is_closed(self) -> bool:
        """Return True if model is closed or closing."""
        with self._lock:
            return self._state != LifecycleState.OPEN

    def _check_open_locked(self) -> None:
        """Caller must already hold self._lock. Validates that model is OPEN to accept new requests."""
        if self._state != LifecycleState.OPEN:
            raise RuntimeError(f"Embedding model is {self._state.value} and rejecting new requests")

    def _begin_request(self) -> None:
        """Register a new public embedding operation. Fail-fast if closed/closing or not configured."""
        with self._lock:
            self._check_open_locked()
            if not self._configured:
                raise RuntimeError("Embedding model is not configured")
            self._total_requests += 1
            self._active_requests += 1

    def _end_request(self) -> None:
        """Release the operation slot and wake shutdown."""
        with self._drain_condition:
            self._active_requests -= 1
            if self._active_requests < 0:
                raise RuntimeError("Active request counter underflow")
            self._drain_condition.notify_all()

    def _register_background_task(self, task: asyncio.Task) -> None:
        """Track background worker tasks to protect shutdown drain and prevent premature GC."""
        with self._drain_condition:
            if self._reserved_workers > 0:
                self._reserved_workers -= 1
            self._background_tasks.add(task)
            self._drain_condition.notify_all()
        task.add_done_callback(self._on_background_task_done)

    def _on_background_task_done(self, task: asyncio.Task) -> None:
        """Discard finished worker tasks and notify drain condition."""
        with self._drain_condition:
            self._background_tasks.discard(task)
            self._drain_condition.notify_all()

    def _cancel_remaining_background_tasks_locked(self) -> list[asyncio.Task]:
        """Request thread-safe cancellation across event loops."""
        remaining = list(self._background_tasks)
        for t in remaining:
            try:
                loop = t.get_loop()
                if not loop.is_closed() and loop.is_running():
                    loop.call_soon_threadsafe(t.cancel)
                elif not loop.is_closed():
                    t.cancel()
            except Exception:
                pass
        return remaining

    def configure_resilience(
        self,
        max_concurrency: int = 10,
        cache_enabled: bool = True,
        cache_max_size: int = 2000,
        http_client: httpx.Client | None = None,
        http_async_client: httpx.AsyncClient | None = None,
        provider_id: str = "openai",
        endpoint_id: str = "default",
        scope_id: str = "global",
        max_tokens: int = OPENAI_MAX_EMBEDDING_TOKENS,
        token_encoding: str | None = None,
    ) -> None:
        """Configure concurrency controls, network clients, cache limits, and token limits."""
        if isinstance(max_concurrency, bool) or not isinstance(max_concurrency, int) or max_concurrency <= 0:
            raise ValueError("max_concurrency must be a positive integer")
        if isinstance(cache_max_size, bool) or not isinstance(cache_max_size, int) or cache_max_size <= 0:
            raise ValueError("cache_max_size must be a positive integer")
        if (
            isinstance(max_tokens, bool)
            or not isinstance(max_tokens, int)
            or max_tokens <= 0
            or max_tokens > OPENAI_MAX_EMBEDDING_TOKENS
        ):
            raise ValueError(f"max_tokens must be a positive integer <= {OPENAI_MAX_EMBEDDING_TOKENS}")

        with self._lock:
            if self._configured:
                raise RuntimeError("Embedding model has already been configured")
            self._check_open_locked()

            self._max_concurrency = max_concurrency
            self._sync_semaphore = threading.BoundedSemaphore(self._max_concurrency)
            self._async_semaphores.clear()
            self._cache_enabled = cache_enabled
            self._cache_max_size = cache_max_size
            self._http_client = http_client
            self._http_async_client = http_async_client
            self._provider_id = provider_id
            self._endpoint_id = endpoint_id
            self._scope_id = scope_id
            self._max_tokens = max_tokens

            if token_encoding is not None:
                self._token_encoder = tiktoken.get_encoding(token_encoding)
            else:
                try:
                    self._token_encoder = tiktoken.encoding_for_model(self.model)
                except KeyError as exc:
                    raise ValueError(
                        f"Unknown tokenizer for embedding model: {self.model}. Provide token_encoding explicitly."
                    ) from exc

            self._configured = True

    def _validate_input_tokens(self, text: str) -> None:
        """Preflight input string and token budget validation against provider limit."""
        if not isinstance(text, str):
            raise TypeError("Embedding input must be a string")
        if not text or not text.strip():
            raise ValueError("Embedding input text cannot be empty or blank")
        if self._token_encoder is not None:
            token_count = len(self._token_encoder.encode_ordinary(text))
            if token_count > self._max_tokens:
                raise ValueError(f"Input exceeds token budget: {token_count} > {self._max_tokens}")

    def _expected_vector_dimensions(self) -> int | None:
        """Resolve expected dimensions: explicit setting or known model standard."""
        if self.dimensions is not None:
            return self.dimensions
        return KNOWN_DEFAULT_DIMENSIONS.get(self.model)

    def _get_async_semaphore(self) -> asyncio.Semaphore:
        """Retrieve or construct an asyncio.Semaphore safely tied to the running event loop."""
        loop = asyncio.get_running_loop()
        with self._lock:
            if self._state == LifecycleState.CLOSED:
                raise RuntimeError("Embedding model is CLOSED")
            sem = self._async_semaphores.get(loop)
            if sem is None:
                sem = asyncio.Semaphore(self._max_concurrency)
                self._async_semaphores[loop] = sem
            return sem

    def _compute_key(self, text: str) -> str:
        """Deterministic cache key based on scope, provider, model, dimensions, endpoint, and text."""
        text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        encoding_name = getattr(self._token_encoder, "name", "default") if self._token_encoder else "none"
        profile = {
            "scope": self._scope_id,
            "provider": self._provider_id,
            "endpoint": self._endpoint_id,
            "model": self.model,
            "dimensions": self.dimensions or 0,
            "encoding": encoding_name,
            "version": CURRENT_EMBEDDING_PROFILE_VERSION,
            "input_hash": text_hash,
        }
        profile_json = json.dumps(profile, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(profile_json.encode("utf-8")).hexdigest()

    @property
    def embedding_profile_id(self) -> str:
        """Stable index identity, independent of credentials and cache contents.

        Persist only the digest: an endpoint URL may contain private routing data.
        Bump the profile version whenever input preprocessing changes.
        """
        profile = {
            "provider": self._provider_id,
            "endpoint": self._endpoint_id,
            "model": self.model,
            "dimensions": self._expected_vector_dimensions(),
            "encoding": getattr(self._token_encoder, "name", None),
            "version": CURRENT_EMBEDDING_PROFILE_VERSION,
        }
        return hashlib.sha256(json.dumps(profile, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

    def _lookup_cache(self, key: str) -> list[float] | None:
        if not self._cache_enabled:
            return None
        with self._lock:
            if self._state == LifecycleState.CLOSED:
                return None
            cached_tuple = self._cache.get(key)
            if cached_tuple is not None:
                self._cache.move_to_end(key)
                self._cache_hits += 1
                return list(cached_tuple)
            self._cache_misses += 1
            return None

    def _store_cache(self, key: str, vector: list[float] | tuple[float, ...]) -> None:
        if not self._cache_enabled:
            return
        immutable_vector = tuple(vector)
        with self._lock:
            if self._state == LifecycleState.CLOSED:
                return
            self._cache[key] = immutable_vector
            self._cache.move_to_end(key)
            while len(self._cache) > self._cache_max_size:
                self._cache.popitem(last=False)

    def _finish_flight(
        self,
        key: str,
        future: Future[tuple[float, ...]],
        *,
        vector: tuple[float, ...] | None = None,
        error: BaseException | None = None,
    ) -> None:
        """Settle a flight once and remove only its own registry entry."""
        with self._lock:
            if not future.done():
                if error is not None:
                    # Mark exception as consumed to prevent unhandled exception warnings
                    future.add_done_callback(lambda f: f.exception() if not f.cancelled() else None)
                    future.set_exception(error)
                elif vector is not None:
                    future.set_result(vector)
                else:
                    raise ValueError("Missing flight result or error")
            if self._in_flight.get(key) is future:
                self._in_flight.pop(key, None)

    def _finish_owned_flights_with_error(
        self,
        flights: dict[str, Future[tuple[float, ...]]],
        error: BaseException,
    ) -> None:
        """Resolve all flights owned by a failed batch."""
        for key, future in flights.items():
            self._finish_flight(
                key,
                future,
                error=error,
            )

    def embed_query(self, text: str) -> list[float]:
        """Use one batch operation so provider dispatch cannot re-enter a query flight."""
        return self.embed_documents([text])[0]

    async def aembed_query(self, text: str) -> list[float]:
        """Queries and documents share admission, caching and cancellation semantics."""
        return (await self.aembed_documents([text]))[0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Public thread-safe synchronous document batch embedding."""
        self._begin_request()
        try:
            return self._embed_documents_impl(texts)
        finally:
            self._end_request()

    def _embed_documents_impl(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        for t in texts:
            self._validate_input_tokens(t)

        results: list[list[float] | None] = [None] * len(texts)

        # Step 1: Check cache & identify keys
        keys = [self._compute_key(t) for t in texts]
        key_to_indices: dict[str, list[int]] = {}
        for idx, (t, k) in enumerate(zip(texts, keys, strict=True)):
            cached = self._lookup_cache(k)
            if cached is not None:
                results[idx] = cached
            else:
                key_to_indices.setdefault(k, []).append(idx)

        if not key_to_indices:
            return [v for v in results if v is not None]

        # Step 2: Register single-flight futures in deterministic order to prevent cyclic deadlocks
        owned_keys: list[str] = []
        owned_texts: list[str] = []
        owned_futures: dict[str, Future[tuple[float, ...]]] = {}
        foreign_futures: dict[str, Future[tuple[float, ...]]] = {}

        sorted_uncached_keys = sorted(key_to_indices.keys())

        with self._lock:
            for k in sorted_uncached_keys:
                cached_tuple = self._cache.get(k)
                if cached_tuple is not None:
                    self._cache.move_to_end(k)
                    self._cache_hits += 1
                    for pos in key_to_indices[k]:
                        results[pos] = list(cached_tuple)
                    continue

                fut = self._in_flight.get(k)
                if fut is None:
                    new_fut = Future()
                    self._in_flight[k] = new_fut
                    owned_keys.append(k)
                    owned_futures[k] = new_fut
                    first_idx = key_to_indices[k][0]
                    owned_texts.append(texts[first_idx])
                else:
                    foreign_futures[k] = fut
                    self._dedup_hits += 1

        # Step 3: Fetch owned keys via API
        if owned_texts:
            computed_vectors = None
            try:
                with self._lock:
                    self._network_calls += 1
                    self._provider_calls += 1
                start = time.perf_counter()
                with self._sync_semaphore:
                    computed_vectors = super().embed_documents(owned_texts)
                elapsed_ms = (time.perf_counter() - start) * 1000
                logger.debug(
                    "Embedded %d owned documents via API in %.2fms",
                    len(owned_texts),
                    elapsed_ms,
                )

                if len(computed_vectors) != len(owned_texts):
                    raise RuntimeError(
                        f"Embedding provider returned {len(computed_vectors)} vectors for {len(owned_texts)} texts"
                    )

                # Batch atomicity: Validate ALL vectors before publishing or storing in cache
                exp_dim = self._expected_vector_dimensions()
                validated_immutables: list[tuple[float, ...]] = []
                for computed in computed_vectors:
                    validate_embedding_vector(computed, expected_dimensions=exp_dim)
                    validated_immutables.append(tuple(computed))
            except BaseException as exc:
                with self._lock:
                    if computed_vectors is None:
                        self._network_errors += 1
                    else:
                        self._validation_errors += 1
                self._finish_owned_flights_with_error(owned_futures, exc)
                raise

            # Atomic publication: Only after entire batch is valid
            for k, immutable in zip(owned_keys, validated_immutables, strict=True):
                self._store_cache(k, immutable)
                self._finish_flight(k, owned_futures[k], vector=immutable)
                for pos in key_to_indices[k]:
                    results[pos] = list(immutable)

        # Step 4: Wait for foreign futures
        for key, future in foreign_futures.items():
            vector = future.result()
            for position in key_to_indices[key]:
                results[position] = list(vector)

        if any(vector is None for vector in results):
            raise RuntimeError("Embedding results contain unresolved positions")

        return [vector for vector in results if vector is not None]

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        """Public coroutine-safe asynchronous document batch embedding."""
        self._begin_request()
        try:
            return await self._aembed_documents_impl(texts)
        finally:
            self._end_request()

    async def _aembed_documents_impl(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        for t in texts:
            self._validate_input_tokens(t)

        results: list[list[float] | None] = [None] * len(texts)

        keys = [self._compute_key(t) for t in texts]
        key_to_indices: dict[str, list[int]] = {}
        for idx, (t, k) in enumerate(zip(texts, keys, strict=True)):
            cached = self._lookup_cache(k)
            if cached is not None:
                results[idx] = cached
            else:
                key_to_indices.setdefault(k, []).append(idx)

        if not key_to_indices:
            return [v for v in results if v is not None]

        owned_keys: list[str] = []
        owned_texts: list[str] = []
        owned_futures: dict[str, Future[tuple[float, ...]]] = {}
        foreign_futures: dict[str, Future[tuple[float, ...]]] = {}

        sorted_uncached_keys = sorted(key_to_indices.keys())

        with self._lock:
            # Pre-admission capacity check BEFORE registering in-flight futures
            if any(self._in_flight.get(k) is None and k not in self._cache for k in sorted_uncached_keys):
                max_workers = self._max_concurrency * 4
                total_in_admission = len(self._background_tasks) + self._reserved_workers
                if total_in_admission >= max_workers:
                    raise RuntimeError(
                        f"Background worker saturation: active {total_in_admission} exceeds limit {max_workers}"
                    )
                self._reserved_workers += 1

            for k in sorted_uncached_keys:
                cached_tuple = self._cache.get(k)
                if cached_tuple is not None:
                    self._cache.move_to_end(k)
                    self._cache_hits += 1
                    for pos in key_to_indices[k]:
                        results[pos] = list(cached_tuple)
                    continue

                fut = self._in_flight.get(k)
                if fut is None:
                    new_fut = Future()
                    self._in_flight[k] = new_fut
                    owned_keys.append(k)
                    owned_futures[k] = new_fut
                    first_idx = key_to_indices[k][0]
                    owned_texts.append(texts[first_idx])
                else:
                    foreign_futures[k] = fut
                    self._dedup_hits += 1

        if owned_texts:
            try:
                # Spawn independent background worker task for owned documents
                async def _batch_worker():
                    try:
                        with self._lock:
                            self._network_calls += 1
                            self._provider_calls += 1
                        sem = self._get_async_semaphore()
                        start = time.perf_counter()
                        async with sem:
                            computed_vectors = await super(ResilientEmbeddingModel, self).aembed_documents(owned_texts)
                        elapsed_ms = (time.perf_counter() - start) * 1000
                        logger.debug(
                            "Async embedded %d owned documents via API in %.2fms",
                            len(owned_texts),
                            elapsed_ms,
                        )

                        if len(computed_vectors) != len(owned_texts):
                            raise RuntimeError(
                                f"Embedding provider returned {len(computed_vectors)} vectors for {len(owned_texts)} texts"
                            )
                    except asyncio.CancelledError as exc:
                        with self._lock:
                            self._cancellation_errors += 1
                        self._finish_owned_flights_with_error(owned_futures, exc)
                        raise
                    except BaseException as exc:
                        with self._lock:
                            self._network_errors += 1
                        logger.warning("Async batch worker network error for %d docs: %s", len(owned_texts), exc)
                        self._finish_owned_flights_with_error(owned_futures, exc)
                        return

                    try:
                        # Batch atomicity: Validate ALL vectors before publishing or storing in cache
                        exp_dim = self._expected_vector_dimensions()
                        validated_immutables: list[tuple[float, ...]] = []
                        for computed in computed_vectors:
                            validate_embedding_vector(computed, expected_dimensions=exp_dim)
                            validated_immutables.append(tuple(computed))
                    except BaseException as exc:
                        with self._lock:
                            self._validation_errors += 1
                        logger.warning("Async batch worker validation error for %d docs: %s", len(owned_texts), exc)
                        self._finish_owned_flights_with_error(owned_futures, exc)
                        return

                    # Atomic publication: Only after entire batch is valid
                    for k, immutable in zip(owned_keys, validated_immutables, strict=True):
                        self._store_cache(k, immutable)
                        self._finish_flight(k, owned_futures[k], vector=immutable)

                batch_task = asyncio.create_task(_batch_worker())
                self._register_background_task(batch_task)
            except BaseException as exc:
                with self._drain_condition:
                    if self._reserved_workers > 0:
                        self._reserved_workers -= 1
                    self._drain_condition.notify_all()
                self._finish_owned_flights_with_error(owned_futures, exc)
                raise

        # Await all futures (both owned and foreign) via cancellation-shielded helper
        all_futures_to_await = {**owned_futures, **foreign_futures}
        for key, future in all_futures_to_await.items():
            vector = await asyncio.shield(asyncio.wrap_future(future))
            for position in key_to_indices[key]:
                results[position] = list(vector)

        if any(vector is None for vector in results):
            raise RuntimeError("Embedding results contain unresolved positions")

        return [vector for vector in results if vector is not None]

    def _is_drained_locked(self) -> bool:
        """Check whether both caller operations and background workers have completed."""
        return self._active_requests == 0 and len(self._background_tasks) == 0

    def _wait_for_drain(self, timeout: float) -> bool:
        """Wait until all active requests and background workers have completed or timeout expires."""
        deadline = time.monotonic() + timeout
        with self._drain_condition:
            while not self._is_drained_locked():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return False
                self._drain_condition.wait(timeout=min(remaining, 0.05))
            return True

    async def _wait_for_drain_async(self, timeout: float) -> bool:
        """Asynchronously wait until all active requests and background workers have completed."""
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout
        while True:
            with self._lock:
                if self._is_drained_locked():
                    return True
            remaining = deadline - loop.time()
            if remaining <= 0:
                return False
            await asyncio.sleep(min(remaining, 0.02))

    def close(self, timeout: float = 10.0) -> None:
        """Gracefully transition to CLOSING, drain active requests/workers, and close sync network resources."""
        # Fail-fast check for running event loop in caller thread BEFORE state mutation or lock acquisition
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                raise RuntimeError(
                    "Synchronous close() cannot be called from within a running event loop "
                    "because async HTTP client cannot be synchronously joined without deadlocking. "
                    "Use 'await model.aclose()' in asynchronous applications."
                )
        except RuntimeError as exc:
            if "Synchronous close()" in str(exc):
                raise

        is_owner = False
        with self._shutdown_lock:
            with self._lock:
                if self._state == LifecycleState.CLOSED:
                    return
                if self._state == LifecycleState.CLOSING:
                    if self._shutdown_future is not None and not self._shutdown_future.done():
                        fut = self._shutdown_future
                    else:
                        fut = Future()
                        self._shutdown_future = fut
                        is_owner = True
                else:
                    self._state = LifecycleState.CLOSING
                    fut = Future()
                    self._shutdown_future = fut
                    is_owner = True

        if not is_owner:
            fut.result(timeout=timeout)
            return

        deadline = time.monotonic() + timeout
        try:
            drained = self._wait_for_drain(max(0.01, deadline - time.monotonic()))
            if not drained:
                with self._lock:
                    self._cancel_remaining_background_tasks_locked()
                raise TimeoutError("Embedding requests did not finish before shutdown timeout")

            # Close synchronous client
            if self._http_client is not None and not self._http_client.is_closed:
                self._http_client.close()

            # Close asynchronous client safely when not running inside an active event loop
            if self._http_async_client is not None and not self._http_async_client.is_closed:
                try:
                    asyncio.run(self._http_async_client.aclose())
                except RuntimeError:
                    pass

            with self._lock:
                self._state = LifecycleState.CLOSED
                self._in_flight.clear()
                self._cache.clear()

            if fut is not None and not fut.done():
                fut.set_result(None)
        except BaseException as exc:
            with self._lock:
                if fut is not None and not fut.done():
                    fut.set_exception(exc)
                self._shutdown_future = None
            raise

    async def aclose(self, timeout: float = 10.0) -> None:
        """Asynchronously transition to CLOSING, drain active requests/workers, and release network resources."""
        is_owner = False
        with self._shutdown_lock:
            with self._lock:
                if self._state == LifecycleState.CLOSED:
                    return
                if self._state == LifecycleState.CLOSING:
                    if self._shutdown_future is not None and not self._shutdown_future.done():
                        fut = self._shutdown_future
                    else:
                        fut = Future()
                        self._shutdown_future = fut
                        is_owner = True
                else:
                    self._state = LifecycleState.CLOSING
                    fut = Future()
                    self._shutdown_future = fut
                    is_owner = True

        if not is_owner:
            await asyncio.shield(asyncio.wrap_future(fut))
            return

        current_loop = asyncio.get_running_loop()
        deadline = current_loop.time() + timeout
        try:
            drained = await self._wait_for_drain_async(max(0.01, deadline - current_loop.time()))
            if not drained:
                with self._lock:
                    remaining_tasks = self._cancel_remaining_background_tasks_locked()
                # Await cancellation ONLY for tasks belonging to the current event loop, bounded by remaining deadline
                same_loop_tasks = [t for t in remaining_tasks if t.get_loop() is current_loop]
                if same_loop_tasks:
                    remaining_gather_timeout = max(0.01, deadline - current_loop.time())
                    try:
                        await asyncio.wait_for(
                            asyncio.gather(*same_loop_tasks, return_exceptions=True),
                            timeout=remaining_gather_timeout,
                        )
                    except TimeoutError:
                        pass
                raise TimeoutError("Embedding requests did not finish before shutdown timeout")

            rem_time = max(0.01, deadline - current_loop.time())
            if self._http_async_client is not None and not self._http_async_client.is_closed:
                await asyncio.wait_for(self._http_async_client.aclose(), timeout=rem_time)
            if self._http_client is not None and not self._http_client.is_closed:
                self._http_client.close()

            with self._lock:
                # Do not transition to CLOSED if there are still active background tasks or requests
                if len(self._background_tasks) > 0 or self._active_requests > 0:
                    raise TimeoutError(
                        f"Cannot mark CLOSED: {len(self._background_tasks)} background tasks and "
                        f"{self._active_requests} requests still active across loops"
                    )
                self._state = LifecycleState.CLOSED
                self._in_flight.clear()
                self._cache.clear()
                self._async_semaphores.clear()

            if fut is not None and not fut.done():
                fut.set_result(None)
        except BaseException as exc:
            with self._lock:
                if fut is not None and not fut.done():
                    fut.set_exception(exc)
                self._shutdown_future = None
            raise

    def clear_cache(self) -> None:
        """Clear all entries in the embedding LRU cache."""
        with self._lock:
            self._cache.clear()
            self._cache_hits = 0
            self._cache_misses = 0

    def cache_info(self) -> dict[str, Any]:
        """Return statistics on cache usage, efficiency, and worker observability."""
        with self._lock:
            active_cnt = self._active_requests
            worker_cnt = len(self._background_tasks)
            reserved_cnt = self._reserved_workers
            total = self._cache_hits + self._cache_misses
            hit_rate = (self._cache_hits / total) if total > 0 else 0.0
            return {
                "state": self._state.value,
                "active_requests": active_cnt,
                "active_workers": worker_cnt,
                "reserved_workers": reserved_cnt,
                "total_requests": self._total_requests,
                "logical_requests": self._total_requests,
                "provider_calls": self._provider_calls,
                "network_calls": self._network_calls,
                "network_errors": self._network_errors,
                "validation_errors": self._validation_errors,
                "cancellation_errors": self._cancellation_errors,
                "dedup_hits": self._dedup_hits,
                "size": len(self._cache),
                "max_size": self._cache_max_size,
                "in_flight": len(self._in_flight),
                "hits": self._cache_hits,
                "misses": self._cache_misses,
                "hit_rate": round(hit_rate, 4),
            }


# Thread-safe global singleton manager
_GLOBAL_MODEL_LOCK = threading.Lock()
_GLOBAL_EMBEDDING_INSTANCE: Embeddings | None = None
_GLOBAL_MANAGER_STATE: GlobalLifecycleState = GlobalLifecycleState.RUNNING


def reset_global_embedding_manager(force: bool = False) -> None:
    """Reset global manager state for test isolation.

    If an active instance is running and force is False, raises RuntimeError.
    """
    global _GLOBAL_EMBEDDING_INSTANCE, _GLOBAL_MANAGER_STATE
    with _GLOBAL_MODEL_LOCK:
        if (
            not force
            and _GLOBAL_EMBEDDING_INSTANCE is not None
            and isinstance(_GLOBAL_EMBEDDING_INSTANCE, ResilientEmbeddingModel)
            and not _GLOBAL_EMBEDDING_INSTANCE.is_closed
        ):
            raise RuntimeError(
                "Cannot reset global embedding manager while active instance is running. "
                "Close or shutdown the instance first, or pass force=True."
            )
        _GLOBAL_EMBEDDING_INSTANCE = None
        _GLOBAL_MANAGER_STATE = GlobalLifecycleState.RUNNING


def create_embedding_model(
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    settings: Settings | None = None,
    *,
    request_timeout: float | None = None,
    max_retries: int | None = None,
    chunk_size: int | None = None,
    dimensions: int | None = None,
    max_concurrency: int | None = None,
    cache_enabled: bool | None = None,
    cache_max_size: int | None = None,
    scope_id: str | None = None,
    token_encoding: str | None = None,
    max_tokens: int | None = None,
) -> Embeddings:
    """Create a production-grade, thread-safe, and resilient embedding model instance."""
    active_settings = settings or get_settings()
    resolved_api_key = api_key if api_key is not None else active_settings.openai_api_key
    resolved_model = model if model is not None else active_settings.embedding_model
    resolved_base_url = base_url if base_url is not None else active_settings.openai_base_url

    resolved_timeout = request_timeout if request_timeout is not None else active_settings.embedding_request_timeout
    resolved_retries = max_retries if max_retries is not None else active_settings.embedding_max_retries
    resolved_chunk_size = chunk_size if chunk_size is not None else active_settings.embedding_chunk_size
    resolved_dimensions = dimensions if dimensions is not None else active_settings.embedding_dimensions
    resolved_concurrency = max_concurrency if max_concurrency is not None else active_settings.embedding_max_concurrency
    resolved_cache_enabled = cache_enabled if cache_enabled is not None else active_settings.embedding_cache_enabled
    resolved_cache_max_size = cache_max_size if cache_max_size is not None else active_settings.embedding_cache_max_size

    resolved_max_tokens = (
        max_tokens
        if max_tokens is not None
        else (
            active_settings.rag_embedding_max_tokens
            if active_settings.rag_embedding_max_tokens is not None
            else OPENAI_MAX_EMBEDDING_TOKENS
        )
    )

    # Fail-fast validation of all input parameters
    _validate_config(
        model=resolved_model,
        api_key=resolved_api_key,
        timeout=resolved_timeout,
        retries=resolved_retries,
        chunk_size=resolved_chunk_size,
        concurrency=resolved_concurrency,
        cache_max_size=resolved_cache_max_size,
        dimensions=resolved_dimensions,
        max_tokens=resolved_max_tokens,
    )

    limits = httpx.Limits(
        max_connections=max(100, resolved_concurrency * 4),
        max_keepalive_connections=20,
    )
    http_client = httpx.Client(limits=limits, timeout=resolved_timeout)
    http_async_client = httpx.AsyncClient(limits=limits, timeout=resolved_timeout)

    endpoint_id = resolved_base_url or "openai_default"
    key_scope = hashlib.sha256(resolved_api_key.encode("utf-8")).hexdigest()[:12]
    resolved_scope = f"{scope_id or active_settings.rag_source_namespace}:{key_scope}"

    resolved_token_encoding = token_encoding or active_settings.rag_token_encoding

    kwargs: dict[str, Any] = {
        "model": resolved_model,
        "api_key": resolved_api_key,
        "request_timeout": resolved_timeout,
        "max_retries": resolved_retries,
        "chunk_size": resolved_chunk_size,
        "http_client": http_client,
        "http_async_client": http_async_client,
        "check_embedding_ctx_length": False,
        "tiktoken_enabled": True,
        "tiktoken_model_name": resolved_model,
    }
    if resolved_base_url:
        kwargs["base_url"] = resolved_base_url
    if resolved_dimensions is not None:
        kwargs["dimensions"] = resolved_dimensions

    try:
        instance = ResilientEmbeddingModel(**kwargs)
        instance.configure_resilience(
            max_concurrency=resolved_concurrency,
            cache_enabled=resolved_cache_enabled,
            cache_max_size=resolved_cache_max_size,
            http_client=http_client,
            http_async_client=http_async_client,
            provider_id="openai",
            endpoint_id=endpoint_id,
            scope_id=resolved_scope,
            max_tokens=resolved_max_tokens,
            token_encoding=resolved_token_encoding,
        )
        return instance
    except Exception:
        http_client.close()
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(http_async_client.aclose())
        except RuntimeError:
            try:
                asyncio.run(http_async_client.aclose())
            except RuntimeError:
                pass
        raise


def get_embedding_model(settings: Settings | None = None) -> Embeddings:
    """Thread-safe retrieval of the global singleton embedding model instance.

    NOTE: If custom `settings` is provided, a fresh dedicated instance is created
    and returned. The caller assumes full ownership of the custom instance's lifecycle
    (must call close() or aclose() explicitly).
    """
    global _GLOBAL_EMBEDDING_INSTANCE
    if settings is not None:
        return create_embedding_model(settings=settings)

    with _GLOBAL_MODEL_LOCK:
        if _GLOBAL_MANAGER_STATE in (
            GlobalLifecycleState.SHUTTING_DOWN,
            GlobalLifecycleState.STOPPED,
            GlobalLifecycleState.ERROR,
        ):
            raise RuntimeError(
                f"Global embedding manager is in {_GLOBAL_MANAGER_STATE.value} state; new instances cannot be allocated"
            )
        if _GLOBAL_EMBEDDING_INSTANCE is None or (
            isinstance(_GLOBAL_EMBEDDING_INSTANCE, ResilientEmbeddingModel) and _GLOBAL_EMBEDDING_INSTANCE.is_closed
        ):
            _GLOBAL_EMBEDDING_INSTANCE = create_embedding_model()
        return _GLOBAL_EMBEDDING_INSTANCE


async def shutdown_embedding_model() -> None:
    """Explicit application teardown: transitions global manager to SHUTTING_DOWN,

    awaits complete async cleanup, and only sets STOPPED upon successful completion.
    Retains instance reference and flags ERROR if teardown fails.
    """
    global _GLOBAL_EMBEDDING_INSTANCE, _GLOBAL_MANAGER_STATE
    with _GLOBAL_MODEL_LOCK:
        if _GLOBAL_MANAGER_STATE == GlobalLifecycleState.STOPPED:
            return
        _GLOBAL_MANAGER_STATE = GlobalLifecycleState.SHUTTING_DOWN
        instance = _GLOBAL_EMBEDDING_INSTANCE

    if instance is not None and isinstance(instance, ResilientEmbeddingModel):
        try:
            await instance.aclose()
        except BaseException as exc:
            logger.error("Failed to shutdown embedding model instance: %s", exc)
            with _GLOBAL_MODEL_LOCK:
                _GLOBAL_MANAGER_STATE = GlobalLifecycleState.ERROR
            raise

    with _GLOBAL_MODEL_LOCK:
        _GLOBAL_EMBEDDING_INSTANCE = None
        _GLOBAL_MANAGER_STATE = GlobalLifecycleState.STOPPED

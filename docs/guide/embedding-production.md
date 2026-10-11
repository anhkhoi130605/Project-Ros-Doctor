# Embedding integration and rollout

Query and document embedding use the same batch implementation. A query must not
register a separate flight before calling `OpenAIEmbeddings.embed_query`: that
method dispatches back into `self.embed_documents`, which would wait on its own
flight. Regression tests mock `client.create` / `async_client.create` to retain
the real LangChain dispatch path.

## Resource ownership

- FastAPI's lifespan owns the default embedding model. The lazy RAG pipeline
  borrows that instance. Shutdown closes the pipeline and then drains/closes the
  embedding model, including when the lifespan body raises.
- A standalone `MongoRAGPipeline(settings)` owns its embedding model. Call
  `close()` from synchronous code or `await aclose()` from async code.
- A store created without `embedding_function` owns its embedding model and
  exposes the same close methods. Injected embedding instances remain the
  caller's responsibility.
- Pipeline/store construction performs synchronous work. In async applications,
  construct them with `await asyncio.to_thread(...)`. The RAG node already does
  this for both lazy indexing and retrieval.

## Persistent index compatibility

Collection names include a digest of the source namespace and embedding profile.
The profile covers provider, endpoint, model, resolved dimensions, tokenizer and
`CURRENT_EMBEDDING_PROFILE_VERSION`. Collection metadata is checked on opening.
API credentials are excluded, so rotating a key does not rebuild the index.

Custom `Embeddings` implementations must supply a stable `embedding_profile` to
the pipeline/store factory. Change it when the model or preprocessing changes.
For the built-in model, bump `CURRENT_EMBEDDING_PROFILE_VERSION` when changing
input preprocessing, or when an endpoint changes its underlying model without
changing its public model name.

This release creates new collections instead of reusing the previous
`*_chunks_v3` collection. The next RAG initialization embeds authoritative sources
into the new index. Allow time, storage and provider budget for that rebuild;
test it in staging before switching traffic. Existing collections and revision
manifests are retained. Removal of old indexes is a separate administrative task.

## Verification and remaining release work

Run the local regression suite:

```powershell
.venv/Scripts/python.exe -m pytest tests/test_agents tests/test_api -q
```

The integration tests use local Chroma and fake provider responses; they do not
establish provider availability, production throughput or retrieval relevance.
Before production rollout, validate the provider configuration and rebuilt index
in staging, measure retrieval quality on representative queries, and load-test
against the expected traffic. End-to-end request deadlines, a shared sync/async
admission budget, exported latency/cost metrics and a reproducible dependency
lock remain separate hardening work. The existing HTTP timeout and async worker
limit do not provide all of those guarantees.

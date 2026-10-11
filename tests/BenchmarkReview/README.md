# Benchmark proposal and review

## Storage

Uses the existing MongoDB `benchmark_datasets` collection. No MySQL changes and no new collection.
Four top-level review fields: `is_published`, `version`, `updated_at`, `change_request`.
The model also maps the **existing** `provenance` field, so editing preserves the source description.

- Legacy records missing publication/version fields remain published at version 1.
- New proposals are unpublished, version 0, with proposed cases inside `change_request.proposed_data`.
- Updates leave the top-level official content untouched while pending.
- Admin approval atomically copies proposed content, increments version, and records the decision.
- Rejection requires a reason and does not change official content/version.
- Cancellation is restricted to the submitter and a still-pending request.
- One pending request per dataset. This compact design stores the **latest request/decision only**, not an unlimited audit history.
- All Engineers and Admins may view all datasets, including unpublished proposals. Ordinary Users have no access to the management API.
- Dataset codes are immutable uppercase identifiers; duplicate codes are rejected, not silently converted to updates.
- Test-case codes must be unique within a dataset (case-insensitive); timestamps must be finite and ordered.
- Approval uses request ID, pending status and base version in the Mongo update filter to reject stale/double reviews.
- Derived distribution summaries are removed on approval because edited cases may invalidate them. `total_cases` is recalculated.
- Existing evaluation documents are not rewritten. This change does **not** implement a new evaluation runner or historical benchmark snapshots.

## Endpoints (.NET backend)

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/benchmarks?page=1&pageSize=25` | Engineering, Admin; paginated summaries |
| GET | `/api/benchmarks/{code}` | Engineering, Admin; official data + latest request |
| POST | `/api/benchmarks/requests` | Engineering, Admin |
| POST | `/api/benchmarks/{code}/review` | Admin only |
| POST | `/api/benchmarks/{code}/cancel` | Pending request owner |

Proposal JSON:

```json
{
  "code": "BENCHMARK-EXAMPLE",
  "requestType": "Create",
  "baseVersion": 0,
  "proposedData": {
    "name": "Example dataset",
    "provenance": "Engineer-curated",
    "testCases": [{
      "code": "C01", "rosbagName": "example.db3", "topic": "/scan",
      "startSec": 0, "endSec": 10, "label": "frequency_drop", "groundTruth": "Expected fault"
    }]
  }
}
```

Review: `{ "requestId": "...", "approve": true, "note": "..." }`.
Cancel: `{ "requestId": "..." }`.
User/reviewer IDs, timestamps, publication and version are determined by the backend, never accepted from the client.
The management screen is at `/#/benchmark`, replacing the previous locally simulated dataset editor/results page.
It does not claim to run evaluations or show fabricated metrics.

## Deploy / existing data

1. Back up MongoDB and verify .NET `MongoDbSettings` and Python Mongo settings point to the same intended database.
2. Review and run `scripts/mongo/20261011_benchmark_review.js` in mongosh on that database.
   It checks duplicate codes, adds a unique code index, and fills only **missing** review fields.
   It never changes official case content or existing review decisions. Do not delete duplicates automatically.
   An existing incompatible index must be reconciled manually if MongoDB rejects the index operation.
3. Restart the .NET backend and deploy the frontend. Missing fields are also read compatibly without backfill;
   new/modified documents persist the four fields. Submission ensures the unique index before allowing writes.
4. Deploy the Python reader/RAG changes at the same time: public readers exclude unpublished documents;
   both RAG ingestion paths use only official benchmark fields, never proposal/reviewer metadata.
5. Rebuild/reconcile the RAG index using the project's ingestion workflow when approved data should enter retrieval.
   Admin approval does not itself trigger embeddings or AI calls. An already-running RAG process may retain its existing index.

Seed scripts now use insert-only upserts so rerunning them cannot bypass review or remove the new fields.
Do not run old versions of the seed scripts after deploying review.
No database migration or real Mongo write was run during implementation.

## Verification

```powershell
dotnet run --project tests/BenchmarkReview/BenchmarkReview.csproj
node --test "WebAPI/FrontEnd(ReactJS)/tests/benchmark-review.test.cjs"
python -m pytest tests/test_services/test_benchmark_publication.py tests/test_services/test_benchmark_dataset_service.py tests/test_agents/test_ingestion_loaders.py
```

.NET tests use real controllers/HTTP authorization with a limited in-memory Mongo driver double.
They test BSON defaults, rendered conditional updates, validation, authorization, and workflow transitions.
They do **not** verify server-side unique index creation, actual concurrent Mongo writes, or Mongo deployment compatibility.
Before production, verify these against a disposable Mongo database and test two simultaneous reviewers/submissions.

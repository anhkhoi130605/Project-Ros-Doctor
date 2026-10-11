// Run in mongosh against the SAME MongoDB database configured by the backend.
// Back up first. No new collection; no official benchmark content is overwritten.
if (!db.getCollectionNames().includes('benchmark_datasets')) {
  throw new Error('benchmark_datasets does not exist. Check the selected database.');
}
const benchmarks = db.getCollection('benchmark_datasets');
const duplicates = benchmarks.aggregate([
  { $group: { _id: '$code', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]).toArray();
if (duplicates.length) throw new Error('Duplicate codes detected. Resolve manually before migration.');
benchmarks.createIndex({ code: 1 }, { unique: true, name: 'benchmark_code_unique' });
benchmarks.updateMany({ is_published: { $exists: false } }, { $set: { is_published: true } });
benchmarks.updateMany({ version: { $exists: false } }, { $set: { version: 1 } });
benchmarks.updateMany({ updated_at: { $exists: false } }, { $set: { updated_at: null } });
benchmarks.updateMany({ change_request: { $exists: false } }, { $set: { change_request: null } });
print('Benchmark review fields ready; existing decisions and content preserved.');

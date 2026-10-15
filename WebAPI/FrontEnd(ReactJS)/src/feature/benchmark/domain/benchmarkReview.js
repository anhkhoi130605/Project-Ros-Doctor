import { stableJson } from './groundTruth.js';
export const emptyCase = () => ({ code: '', rosbagName: '', topic: '', startSec: 0, endSec: 0, label: '', groundTruth: '' });

export function proposalFrom(dataset) {
  const data = dataset?.changeRequest?.status !== 'Pending' && !dataset?.isPublished
    ? dataset?.changeRequest?.proposedData : dataset;
  return {
    code: dataset?.code || '', requestType: dataset?.isPublished ? 'Update' : 'Create',
    baseVersion: dataset?.version ?? 0,
    proposedData: { name: data?.name || '', provenance: data?.provenance || '',
      testCases: data?.testCases?.length ? structuredClone(data.testCases) : [emptyCase()] },
  };
}

export function compareCases(current = [], proposed = []) {
  const before = new Map(current.map(item => [item.code, item]));
  const after = new Map(proposed.map(item => [item.code, item]));
  const fields = ['rosbagName', 'topic', 'startSec', 'endSec', 'label', 'groundTruth', 'caseId', 'groundTruthDetail'];
  return [...new Set([...before.keys(), ...after.keys()])].map(code => {
    const oldCase = before.get(code), newCase = after.get(code);
    return { code, before: oldCase, after: newCase,
      status: !oldCase ? 'added' : !newCase ? 'removed' : fields.some(key =>
        stableJson(oldCase[key] ?? '') !== stableJson(newCase[key] ?? '')) ? 'changed' : 'unchanged' };
  });
}

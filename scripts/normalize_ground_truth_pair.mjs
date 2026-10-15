// Reuse the UI's validator/normalizer so manual and scripted imports have one format.
import fs from 'node:fs';
import { importGroundTruthPair } from '../WebAPI/FrontEnd(ReactJS)/src/feature/benchmark/domain/groundTruth.js';

const [viPath, enPath] = process.argv.slice(2);
if (!viPath || !enPath) throw new Error('Usage: node scripts/normalize_ground_truth_pair.mjs <vi.json> <en.json>');
const read = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
process.stdout.write(JSON.stringify(importGroundTruthPair(read(viPath), read(enPath))));

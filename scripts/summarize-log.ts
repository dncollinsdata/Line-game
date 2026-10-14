/**
 * Prints the section 8 metrics for an exported event log.
 *
 *   npm run summarize-log -- path/to/events.json
 */
import * as fs from 'fs';
import type { GameEvent } from '../lib/eventLog';
import { formatSummary, summarizeLog } from '../lib/logSummary';
import pack from '../levels/pack.json';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run summarize-log -- path/to/events.json');
  process.exit(1);
}

const events = JSON.parse(fs.readFileSync(file, 'utf8')) as GameEvent[];
const sizes = new Map(pack.levels.map((level) => [level.id, level.size]));
console.log(formatSummary(summarizeLog(events, (level) => sizes.get(level) ?? 0)));

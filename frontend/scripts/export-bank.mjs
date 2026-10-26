// Exports the curated word bank and the 5-letter guess dictionary to the
// backend's classpath, so client and server always share one source of truth.
// Run with: npm run export:bank   (requires Node 22.18+ / 23.6+ for .ts imports)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../backend/src/main/resources/words');
fs.mkdirSync(outDir, { recursive: true });

const { WORD_BANK } = await import('../src/data/wordBank.ts');

const rows = ['word,length,difficulty,commonness,category'];
for (const w of WORD_BANK) rows.push([w.word, w.length, w.difficulty, w.commonness, w.category].join(','));
fs.writeFileSync(path.join(outDir, 'bank.csv'), rows.join('\n') + '\n');
console.log(`bank.csv: ${WORD_BANK.length} words`);

const dictFile = 'words-5.txt';
fs.copyFileSync(path.resolve(here, '../src/data/dict', dictFile), path.join(outDir, 'dict-5.txt'));
console.log(`dict-5.txt copied from ${dictFile}`);

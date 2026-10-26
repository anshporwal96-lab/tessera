// Generates the accepted-guess dictionaries (src/data/dict/words-N.txt) from the
// MIT-licensed `word-list` package. Run with: npm run build:dict
// The curated answer bank is merged in at runtime, so every possible answer is
// always a valid guess even if it is missing from the source list.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import wordListPath from 'word-list';

const MIN_LENGTH = 4;
const MAX_LENGTH = 8;

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../src/data/dict');
fs.mkdirSync(outDir, { recursive: true });

const byLength = new Map();
for (const raw of fs.readFileSync(wordListPath, 'utf8').split('\n')) {
  const word = raw.trim().toLowerCase();
  if (!/^[a-z]+$/.test(word)) continue;
  if (word.length < MIN_LENGTH || word.length > MAX_LENGTH) continue;
  if (!byLength.has(word.length)) byLength.set(word.length, new Set());
  byLength.get(word.length).add(word.toUpperCase());
}

for (let n = MIN_LENGTH; n <= MAX_LENGTH; n++) {
  const words = [...(byLength.get(n) ?? [])].sort();
  fs.writeFileSync(path.join(outDir, `words-${n}.txt`), words.join('\n') + '\n');
  console.log(`words-${n}.txt: ${words.length} words`);
}

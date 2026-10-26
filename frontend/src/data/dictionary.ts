import { WORD_BANK } from './wordBank';

// Each length's accepted-guess list is a separate lazily loaded chunk, so a
// player only downloads the dictionary for the length they are playing.
const loaders = import.meta.glob<string>('./dict/words-*.txt', {
  query: '?raw',
  import: 'default',
});

const cache = new Map<number, Set<string>>();
const pending = new Map<number, Promise<Set<string>>>();

function bankWords(length: number): string[] {
  return WORD_BANK.filter((w) => w.length === length).map((w) => w.word);
}

export async function loadDictionary(length: number): Promise<Set<string>> {
  const cached = cache.get(length);
  if (cached) return cached;
  const inFlight = pending.get(length);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const words = new Set(bankWords(length));
    const loader = loaders[`./dict/words-${length}.txt`];
    if (loader) {
      try {
        const text = await loader();
        for (const line of text.split('\n')) {
          const w = line.trim().toUpperCase();
          if (w.length === length) words.add(w);
        }
      } catch (err) {
        console.warn(`Could not load ${length}-letter dictionary; accepting answer-bank words only.`, err);
      }
    } else {
      console.warn(`No ${length}-letter dictionary bundled; accepting answer-bank words only.`);
    }
    cache.set(length, words);
    pending.delete(length);
    return words;
  })();
  pending.set(length, promise);
  return promise;
}

/** Synchronous check; returns false until the dictionary for that length has loaded. */
export function isValidWord(word: string): boolean {
  const dict = cache.get(word.length);
  return dict ? dict.has(word.toUpperCase()) : false;
}

export function isDictionaryLoaded(length: number): boolean {
  return cache.has(length);
}

import type { LetterState } from './types';

/**
 * Scores a guess against the answer.
 *
 * Duplicate letters are handled in two passes: exact matches are claimed first,
 * then the remaining unmatched answer letters are handed out left-to-right as
 * "present". A letter therefore never earns more green/yellow tiles than it
 * appears in the answer.
 */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  if (g.length !== a.length) {
    throw new Error(`Guess length ${g.length} does not match answer length ${a.length}`);
  }

  const result: LetterState[] = new Array(g.length).fill('absent');
  const unmatched = new Map<string, number>();

  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      result[i] = 'correct';
    } else {
      unmatched.set(a[i], (unmatched.get(a[i]) ?? 0) + 1);
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue;
    const left = unmatched.get(g[i]) ?? 0;
    if (left > 0) {
      result[i] = 'present';
      unmatched.set(g[i], left - 1);
    }
  }

  return result;
}

export function isSolved(evaluation: LetterState[]): boolean {
  return evaluation.length > 0 && evaluation.every((s) => s === 'correct');
}

const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/** Best-known state for each letter, for colouring the keyboard. */
export function keyboardStates(
  guesses: string[],
  evaluations: LetterState[][],
): Record<string, LetterState> {
  const states: Record<string, LetterState> = {};
  guesses.forEach((guess, row) => {
    const evaluation = evaluations[row];
    if (!evaluation) return;
    [...guess.toUpperCase()].forEach((letter, i) => {
      const next = evaluation[i];
      const prev = states[letter];
      if (!prev || RANK[next] > RANK[prev]) states[letter] = next;
    });
  });
  return states;
}

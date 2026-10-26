import type { LetterState } from '../engine/types';

// Screen-reader announcements through a visually hidden live region
// (components/Announcer). Separate from toasts, which are short-lived visuals.

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function announce(message: string): void {
  listeners.forEach((l) => l(message));
}

export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SPOKEN: Record<LetterState, string> = {
  correct: 'correct',
  present: 'in the word, wrong spot',
  absent: 'not in the word',
};

/** e.g. "CRANE: C not in the word, R correct, …" */
export function describeGuess(guess: string, evaluation: LetterState[]): string {
  const letters = [...guess].map((l, i) => `${l} ${SPOKEN[evaluation[i]]}`);
  return `${guess}: ${letters.join(', ')}.`;
}

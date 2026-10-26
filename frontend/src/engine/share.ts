import type { LetterState } from './types';

const EMOJI: Record<LetterState, string> = { correct: '🟩', present: '🟨', absent: '⬛' };
const EMOJI_HIGH_CONTRAST: Record<LetterState, string> = { correct: '🟧', present: '🟦', absent: '⬛' };

export interface ShareInput {
  title: string;
  evaluations: LetterState[][];
  won: boolean;
  maxGuesses: number;
  highContrast?: boolean;
  url?: string;
}

/** Spoiler-free result grid, e.g. "Tessera #301 · Hard 4/6". */
export function buildShareText(input: ShareInput): string {
  const map = input.highContrast ? EMOJI_HIGH_CONTRAST : EMOJI;
  const score = input.won ? input.evaluations.length : 'X';
  const grid = input.evaluations.map((row) => row.map((s) => map[s]).join('')).join('\n');
  const lines = [`${input.title} ${score}/${input.maxGuesses}`, '', grid];
  if (input.url) lines.push('', input.url);
  return lines.join('\n');
}

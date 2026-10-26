export type LetterState = 'correct' | 'present' | 'absent';

/** Word-bank tiers. `veryhard` is reserved for Sunday dailies and Hard unlimited play. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'veryhard';

/** Difficulties a player can pick in Unlimited mode. */
export type UnlimitedDifficulty = 'easy' | 'medium' | 'hard';

export interface WordEntry {
  word: string;
  length: number;
  difficulty: Difficulty;
  /** Familiarity score, 1 (obscure) – 5 (everyday). */
  commonness: number;
  /** Short category used as an optional hint. */
  category: string;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  veryhard: 'Very Hard',
};

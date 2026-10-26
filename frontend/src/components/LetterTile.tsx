import type { CSSProperties } from 'react';
import type { LetterState } from '../engine/types';

interface Props {
  letter: string;
  state?: LetterState;
  /** Column index, used to stagger flip and bounce animations. */
  index: number;
  reveal?: boolean;
  bounce?: boolean;
}

/** Purely visual; the row's accessible name describes its letters (see GameBoard). */
export function LetterTile({ letter, state, index, reveal, bounce }: Props) {
  const classes = ['tile'];
  if (letter) classes.push('tile-filled');
  if (state) classes.push(`tile-${state}`);
  if (reveal) classes.push('tile-reveal');
  if (bounce) classes.push('tile-bounce');
  if (letter && !state) classes.push('tile-pop');

  return (
    <div className={classes.join(' ')} style={{ '--i': index } as CSSProperties} aria-hidden="true">
      {letter}
    </div>
  );
}

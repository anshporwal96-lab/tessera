import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '../engine/game';
import { describeGuess } from '../services/announcer';
import { LetterTile } from './LetterTile';

interface Props {
  game: GameState;
  revealingRow: number | null;
  shakeRow: boolean;
  bounceRow: number | null;
}

const GAP = 6;
const MAX_TILE = 62;

/** Largest square tile that lets the whole grid fit in the space available. */
function useTileSize(cols: number, rows: number) {
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(MAX_TILE);

  useLayoutEffect(() => {
    const node = area.current;
    if (!node) return;
    const measure = () => {
      const style = getComputedStyle(node);
      const w = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const h = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const byWidth = (w - GAP * (cols - 1)) / cols;
      const byHeight = (h - GAP * (rows - 1)) / rows;
      setSize(Math.max(20, Math.floor(Math.min(byWidth, byHeight, MAX_TILE))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [cols, rows]);

  return { area, size };
}

export function GameBoard({ game, revealingRow, shakeRow, bounceRow }: Props) {
  const rows = Array.from({ length: game.maxGuesses }, (_, r) => r);
  const currentRow = game.status === 'playing' ? game.guesses.length : -1;
  const { area, size } = useTileSize(game.wordLength, game.maxGuesses);

  return (
    <div className="board-area" ref={area}>
      <div
        className="board"
        role="group"
        aria-label={`Game board: ${game.wordLength}-letter word, ${game.maxGuesses} guesses`}
        style={{ '--cols': game.wordLength, '--tile': `${size}px`, '--gap': `${GAP}px` } as CSSProperties}
      >
        {rows.map((r) => {
          const submitted = r < game.guesses.length;
          const word = submitted ? game.guesses[r] : r === currentRow ? game.current : '';
          const evaluation = submitted ? game.evaluations[r] : undefined;
          const classes = ['board-row'];
          if (r === currentRow && shakeRow) classes.push('row-shake');
          const label =
            submitted && evaluation
              ? `Guess ${r + 1}, ${describeGuess(word, evaluation)}`
              : r === currentRow
                ? `Guess ${r + 1}, ${word ? `typing ${[...word].join(' ')}` : 'empty'}`
                : `Guess ${r + 1}, empty`;
          return (
            <div className={classes.join(' ')} role="group" key={r} aria-label={label}>
              {Array.from({ length: game.wordLength }, (_, c) => (
                <LetterTile
                  key={c}
                  index={c}
                  letter={word[c] ?? ''}
                  state={evaluation?.[c]}
                  reveal={r === revealingRow}
                  bounce={r === bounceRow}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

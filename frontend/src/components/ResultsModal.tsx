import type { ReactNode } from 'react';
import { Modal } from './Modal';

const WIN_LINES = ['Sublime!', 'Brilliant!', 'Splendid!', 'Great work!', 'Nicely done!', 'Solid solve!', 'Phew — got it!'];

export function winHeadline(guesses: number): string {
  return WIN_LINES[Math.min(guesses, WIN_LINES.length) - 1] ?? 'Solved!';
}

interface Props {
  open: boolean;
  onClose: () => void;
  won: boolean;
  answer?: string;
  guesses: number;
  maxGuesses: number;
  /** Optional eyebrow, e.g. "Daily #301 · Hard". */
  context?: string;
  children?: ReactNode;
}

export function ResultsModal({ open, onClose, won, answer, guesses, maxGuesses, context, children }: Props) {
  return (
    <Modal open={open} title={won ? winHeadline(guesses) : 'Out of guesses'} onClose={onClose}>
      <div className="result-hero">
        {context && <div className="result-context">{context}</div>}
        {answer && (
          <div className="result-answer" aria-label={`The answer was ${answer}`}>
            {[...answer].map((l, i) => (
              <span key={i} className={`tile tile-filled tile-small ${won ? 'tile-correct' : 'tile-answer'}`}>
                {l}
              </span>
            ))}
          </div>
        )}
        <p className="result-line">
          {won ? `Solved in ${guesses} of ${maxGuesses} guesses.` : 'The word was revealed above. Better luck next time!'}
        </p>
      </div>
      {children}
    </Modal>
  );
}

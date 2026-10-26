import { WEEKLY_SCHEDULE } from '../engine/daily';
import { DIFFICULTY_LABELS, type LetterState } from '../engine/types';
import { Modal } from './Modal';

function ExampleRow({ word, mark, state }: { word: string; mark: number; state: LetterState }) {
  return (
    <div className="example-row" aria-hidden="true">
      {[...word].map((l, i) => (
        <div key={i} className={`tile tile-filled tile-small${i === mark ? ` tile-${state}` : ''}`}>
          {l}
        </div>
      ))}
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="How to play" onClose={onClose} wide>
      <p className="lead">Find the hidden word. Each guess must be a real word of the right length.</p>
      <p>After each guess the tiles change colour to show how close you were:</p>

      <ExampleRow word="CRANE" mark={0} state="correct" />
      <p className="example-caption">
        <strong>C</strong> is in the word and in the right spot.
      </p>
      <ExampleRow word="PLUMB" mark={2} state="present" />
      <p className="example-caption">
        <strong>U</strong> is in the word but in the wrong spot.
      </p>
      <ExampleRow word="SHORT" mark={3} state="absent" />
      <p className="example-caption">
        <strong>R</strong> is not in the word at all.
      </p>
      <p className="muted small">
        Repeated letters are scored one at a time: if the answer has one E and you guess two, only one E lights up.
      </p>

      <h3>Two ways to play</h3>
      <ul className="rules-list">
        <li>
          <strong>Daily Challenge</strong> — one five-letter puzzle a day, the same for everyone. It resets at 00:00 UTC. Your
          progress is saved, so you can come back after a refresh, but you only get one attempt.
        </li>
        <li>
          <strong>Unlimited</strong> — play as much as you like with 4 to 8 letter words, choose a difficulty and a number of
          rounds.
        </li>
      </ul>

      <h3>Daily difficulty</h3>
      <p className="muted small">
        Weekday puzzles use everyday words. Weekends get tougher through less familiar words and harder letter patterns — not
        longer words.
      </p>
      <div className="schedule">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div className="schedule-day" key={d}>
            <span className="schedule-name">{DAYS[d]}</span>
            <span className={`badge badge-${WEEKLY_SCHEDULE[d]}`}>{DIFFICULTY_LABELS[WEEKLY_SCHEDULE[d]]}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

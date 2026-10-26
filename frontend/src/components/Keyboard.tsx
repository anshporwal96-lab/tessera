import type { LetterState } from '../engine/types';
import { Icon } from './Icon';

const ROWS: string[][] = [[...'QWERTYUIOP'], [...'ASDFGHJKL'], ['ENTER', ...'ZXCVBNM', 'BACKSPACE']];

interface Props {
  keyStates: Record<string, LetterState>;
  onKey: (key: string) => void;
  disabled?: boolean;
}

const STATE_LABEL: Record<LetterState, string> = {
  correct: 'correct',
  present: 'present',
  absent: 'absent',
};

export function Keyboard({ keyStates, onKey, disabled }: Props) {
  return (
    <div className="keyboard" role="group" aria-label="Keyboard">
      {ROWS.map((keys, i) => (
        <div className="keyboard-row" key={i}>
          {i === 1 && <div className="key-spacer" aria-hidden="true" />}
          {keys.map((key) => {
            const state = keyStates[key];
            const wide = key === 'ENTER' || key === 'BACKSPACE';
            const label =
              key === 'BACKSPACE' ? 'Delete letter' : key === 'ENTER' ? 'Submit guess' : `${key}${state ? `, ${STATE_LABEL[state]}` : ''}`;
            return (
              <button
                key={key}
                type="button"
                className={`key${wide ? ' key-wide' : ''}${state ? ` key-${state}` : ''}`}
                aria-label={label}
                disabled={disabled}
                // Prevent the button keeping focus so physical Enter still submits.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onKey(key)}
              >
                {key === 'BACKSPACE' ? <Icon name="backspace" size={22} /> : key === 'ENTER' ? 'Enter' : key}
              </button>
            );
          })}
          {i === 1 && <div className="key-spacer" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

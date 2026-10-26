import { useId, type KeyboardEvent } from 'react';
import type { UnlimitedDifficulty } from '../engine/types';

interface Option<T> {
  value: T;
  label: string;
  /** Accessible name when the visible label is a symbol. */
  ariaLabel?: string;
  /** Shown under the control while this option is selected. */
  description?: string;
}

interface SegmentedProps<T> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/** Radio group styled as a segmented control; arrow keys move the selection. */
export function SegmentedControl<T extends string | number>({ label, value, options, onChange }: SegmentedProps<T>) {
  const id = useId();
  const index = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[(index + delta + options.length) % options.length]?.focus();
  };

  return (
    <div className="field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={id} onKeyDown={onKeyDown}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className={`segment${selected ? ' segment-active' : ''}`}
              aria-label={o.ariaLabel}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {options[index]?.description && <p className="field-hint">{options[index].description}</p>}
    </div>
  );
}

export function WordLengthSelector({ value, lengths, onChange }: { value: number; lengths: number[]; onChange: (n: number) => void }) {
  return (
    <SegmentedControl
      label="Word length"
      value={value}
      options={lengths.map((n) => ({ value: n, label: String(n) }))}
      onChange={onChange}
    />
  );
}

export function DifficultySelector({ value, onChange }: { value: UnlimitedDifficulty; onChange: (d: UnlimitedDifficulty) => void }) {
  return (
    <SegmentedControl
      label="Difficulty"
      value={value}
      options={[
        { value: 'easy', label: 'Easy', description: 'Everyday words' },
        { value: 'medium', label: 'Medium', description: 'Familiar words, trickier letters' },
        { value: 'hard', label: 'Hard', description: 'Uncommon vocabulary and awkward patterns' },
      ]}
      onChange={onChange}
    />
  );
}

export const ROUND_OPTIONS = [1, 3, 5, 10, 0];

export function RoundsSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <SegmentedControl
      label="Rounds"
      value={value}
      options={ROUND_OPTIONS.map((n) => ({ value: n, label: n === 0 ? '∞' : String(n), ariaLabel: n === 0 ? 'Endless' : undefined }))}
      onChange={onChange}
    />
  );
}

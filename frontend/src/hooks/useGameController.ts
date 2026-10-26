import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isValidWord, loadDictionary } from '../data/dictionary';
import { keyboardStates } from '../engine/evaluate';
import { addLetter, applyEvaluation, checkSubmission, removeLetter, type GameState } from '../engine/game';
import type { LetterState } from '../engine/types';
import { announce, describeGuess } from '../services/announcer';
import { ApiError } from '../services/httpDailyService';
import { playSound, type SoundName } from '../services/sound';
import { showToast } from '../services/toast';
import { useSettings } from './settings';

/** Per-tile stagger and flip duration; keep in sync with the CSS in styles/game.css. */
export const FLIP_STAGGER_MS = 280;
export const FLIP_DURATION_MS = 520;

export interface Scored {
  evaluation: LetterState[];
  answer?: string;
}

interface Options {
  game: GameState;
  onChange: (game: GameState) => void;
  /** Scores a guess; `attempt` is 1-based. */
  evaluate: (guess: string, attempt: number) => Promise<Scored>;
  /** Called once the final reveal animation has finished. */
  onFinished: (game: GameState, answer: string | undefined) => void;
  /** Disable input (e.g. while a modal is open). */
  inputEnabled: boolean;
  /** Called when scoring fails for a reason other than an invalid word. */
  onError?: (err: unknown) => void;
}

export function useGameController({ game, onChange, evaluate, onFinished, inputEnabled, onError }: Options) {
  const { settings } = useSettings();
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [shakeRow, setShakeRow] = useState(false);
  const [bounceRow, setBounceRow] = useState<number | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const busy = useRef(false);
  const dictReadyRef = useRef(dictReady);
  dictReadyRef.current = dictReady;

  // Always read the freshest values inside async callbacks.
  const latest = useRef({ game, onChange, evaluate, onFinished, onError, settings });
  latest.current = { game, onChange, evaluate, onFinished, onError, settings };

  useEffect(() => {
    let alive = true;
    setDictReady(false);
    loadDictionary(game.wordLength).then(() => alive && setDictReady(true));
    return () => {
      alive = false;
    };
  }, [game.wordLength]);

  const sound = useCallback((name: SoundName) => {
    if (latest.current.settings.sound) playSound(name);
  }, []);

  const reject = useCallback(
    (message: string) => {
      showToast(message);
      sound('error');
      setShakeRow(true);
      window.setTimeout(() => setShakeRow(false), 600);
    },
    [sound],
  );

  const submit = useCallback(async () => {
    const { game: g, settings: s } = latest.current;
    if (busy.current || g.status !== 'playing') return;

    if (g.current.length === g.wordLength && !isValidWord(g.current) && !dictReadyRef.current) {
      showToast('Loading word list…');
      return;
    }
    const rejection = checkSubmission(g, isValidWord);
    if (rejection === 'incomplete') return reject('Not enough letters');
    if (rejection === 'invalid-word') return reject('Not in word list');
    if (rejection) return;

    busy.current = true;
    const guess = g.current;
    let scored: Scored;
    try {
      scored = await latest.current.evaluate(guess, g.guesses.length + 1);
    } catch (err) {
      busy.current = false;
      // The server re-validates every guess; its verdict wins over the local dictionary.
      if (err instanceof ApiError && err.code === 'invalid-word') return reject('Not in word list');
      if (err instanceof ApiError && err.code === 'incomplete') return reject('Not enough letters');
      console.error(err);
      showToast(err instanceof ApiError ? err.message : 'Something went wrong scoring that guess. Please try again.', 3000);
      latest.current.onError?.(err);
      return;
    }

    const next = applyEvaluation(latest.current.game, guess, scored.evaluation);
    const row = next.guesses.length - 1;
    latest.current.game = next;
    latest.current.onChange(next);

    const revealMs = s.animations ? (g.wordLength - 1) * FLIP_STAGGER_MS + FLIP_DURATION_MS : 0;
    if (s.animations) {
      setRevealingRow(row);
      for (let i = 0; i < g.wordLength; i++) window.setTimeout(() => sound('flip'), i * FLIP_STAGGER_MS + FLIP_DURATION_MS / 2);
    }

    window.setTimeout(() => {
      setRevealingRow(null);
      busy.current = false;
      let spoken = describeGuess(guess, scored.evaluation);
      if (next.status === 'won') spoken += ` Solved in ${next.guesses.length} of ${next.maxGuesses} guesses!`;
      else if (next.status === 'lost') spoken += ` Out of guesses.${scored.answer ? ` The word was ${scored.answer}.` : ''}`;
      else spoken += ` ${next.maxGuesses - next.guesses.length} guesses left.`;
      announce(spoken);
      if (next.status === 'won') {
        sound('win');
        if (latest.current.settings.animations) setBounceRow(row);
      } else if (next.status === 'lost') {
        sound('lose');
      }
      if (next.status !== 'playing') latest.current.onFinished(next, scored.answer);
    }, revealMs);
  }, [reject, sound]);

  const onKey = useCallback(
    (key: string) => {
      const g = latest.current.game;
      if (busy.current || g.status !== 'playing') return;
      // Update the ref straight away so keys arriving before the next render
      // (fast typing, key repeat) build on this one instead of overwriting it.
      const commit = (next: GameState) => {
        latest.current.game = next;
        latest.current.onChange(next);
      };
      if (key === 'ENTER') {
        void submit();
      } else if (key === 'BACKSPACE') {
        const next = removeLetter(g);
        if (next !== g) commit(next);
      } else if (/^[A-Z]$/.test(key)) {
        const next = addLetter(g, key);
        if (next !== g) {
          sound('key');
          commit(next);
        }
      }
    },
    [submit, sound],
  );

  // A new game (next round, restart, new day) clears leftover animation state.
  useEffect(() => {
    if (game.guesses.length === 0) {
      setBounceRow(null);
      setRevealingRow(null);
    }
  }, [game.guesses.length]);

  // Physical keyboard.
  useEffect(() => {
    if (!inputEnabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      // Let Enter/Space activate a focused button instead of submitting a guess.
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('button, a, input, select, textarea') && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.key === 'Enter') onKey('ENTER');
      else if (e.key === 'Backspace') onKey('BACKSPACE');
      else if (/^[a-zA-Z]$/.test(e.key)) onKey(e.key.toUpperCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inputEnabled, onKey]);

  // Keyboard colours update only after a row has finished flipping.
  const keyStates = useMemo(() => {
    const settled = revealingRow === null ? game.guesses.length : revealingRow;
    return keyboardStates(game.guesses.slice(0, settled), game.evaluations.slice(0, settled));
  }, [game.guesses, game.evaluations, revealingRow]);

  return { onKey, keyStates, revealingRow, shakeRow, bounceRow, dictReady };
}

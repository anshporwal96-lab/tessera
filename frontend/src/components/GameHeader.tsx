import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Wordmark } from './Logo';

interface Props {
  onHome?: () => void;
  onRules: () => void;
  onStats: () => void;
  onSettings: () => void;
  /** Small line under the wordmark, e.g. "Daily · #301 · Hard". */
  subtitle?: ReactNode;
  /** Page name for screen readers; becomes the page's h1 on inner pages. */
  title?: string;
}

export function GameHeader({ onHome, onRules, onStats, onSettings, subtitle, title }: Props) {
  return (
    <header className="game-header">
      {onHome && title && (
        <h1 className="sr-only" tabIndex={-1}>
          {title} — Tessera
        </h1>
      )}
      <div className="header-side">
        {onHome ? (
          <button type="button" className="icon-button" onClick={onHome} aria-label="Back to home">
            <Icon name="back" />
          </button>
        ) : (
          <button type="button" className="icon-button" onClick={onRules} aria-label="How to play">
            <Icon name="help" />
          </button>
        )}
      </div>
      <div className="header-title">
        {onHome ? (
          <button type="button" className="wordmark-button" onClick={onHome} aria-label="Tessera home">
            <Wordmark />
          </button>
        ) : (
          <h1 className="wordmark-heading" tabIndex={-1}>
            <Wordmark />
          </h1>
        )}
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>
      <div className="header-side header-side-right">
        {onHome && (
          <button type="button" className="icon-button" onClick={onRules} aria-label="How to play">
            <Icon name="help" />
          </button>
        )}
        <button type="button" className="icon-button" onClick={onStats} aria-label="Statistics">
          <Icon name="stats" />
        </button>
        <button type="button" className="icon-button" onClick={onSettings} aria-label="Settings">
          <Icon name="settings" />
        </button>
      </div>
    </header>
  );
}

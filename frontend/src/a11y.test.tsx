import { act, cleanup, fireEvent, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { SettingsProvider } from './hooks/settings';

// Structural accessibility checks for every page and dialog. Colour contrast
// needs real rendering, so it is checked in a browser instead (see docs).

beforeAll(() => {
  // jsdom lacks these browser APIs.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.scrollTo = () => {};
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tessera:v1:rules:seen', 'true');
  // No backend in unit tests: API calls fail and pages fall back gracefully.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function violations(): Promise<string[]> {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

async function renderAt(hash: string) {
  window.location.hash = hash;
  // Render into #root like index.html; dialogs mark it inert.
  document.getElementById('root')?.remove();
  const root = document.body.appendChild(document.createElement('div'));
  root.id = 'root';
  render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
    { container: root },
  );
  await act(() => new Promise((r) => setTimeout(r, 50)));
}

describe('accessibility', () => {
  it.each(['#/', '#/play', '#/stats'])('page %s has no violations', async (hash) => {
    await renderAt(hash);
    expect(await violations()).toEqual([]);
  });

  it('daily page error state has no violations', async () => {
    await renderAt('#/daily');
    expect(await violations()).toEqual([]);
  });

  it('every page has exactly one h1 and a main landmark', async () => {
    for (const hash of ['#/', '#/play', '#/stats', '#/daily']) {
      await renderAt(hash);
      expect(document.querySelectorAll('h1'), hash).toHaveLength(1);
      expect(document.querySelectorAll('main'), hash).toHaveLength(1);
      cleanup();
    }
  });

  it('dialogs have no violations and make the page behind them inert', async () => {
    await renderAt('#/play');
    fireEvent.click(document.querySelector('[aria-label="How to play"]')!);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.getElementById('root')?.inert).toBe(true);
    expect(await violations()).toEqual([]);
    fireEvent.click(document.querySelector('[role="dialog"] [aria-label="Close"]')!);
    await act(() => new Promise((r) => setTimeout(r, 0)));
    expect(document.getElementById('root')?.inert).toBe(false);

    fireEvent.click(document.querySelector('[aria-label="Settings"]')!);
    expect(await violations()).toEqual([]);
  });
});

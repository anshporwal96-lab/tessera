import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, HttpDailyService } from './httpDailyService';

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function fakeFetch(handler: Handler) {
  const calls: { url: string; auth?: string; method?: string }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, auth: headers.Authorization, method: init?.method });
    return handler(url, init);
  }) as typeof fetch;
  return { impl, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const STATE = {
  dateKey: '2026-10-27',
  puzzleNumber: 665,
  difficulty: 'easy',
  wordLength: 5,
  maxGuesses: 6,
  guesses: ['CRANE'],
  evaluations: [['correct', 'absent', 'absent', 'absent', 'absent']],
  status: 'playing',
};

describe('HttpDailyService', () => {
  beforeEach(() => localStorage.clear());

  it('registers an anonymous player once and sends the token', async () => {
    let tokens = 0;
    const { impl, calls } = fakeFetch((url) => {
      if (url.endsWith('/players')) return json(201, { token: `tok-${++tokens}` });
      return json(200, STATE);
    });
    const service = new HttpDailyService('/api', impl);
    const info = await service.getPuzzle();
    await service.getPuzzle();

    expect(tokens).toBe(1);
    expect(calls.filter((c) => c.url.endsWith('/daily/today')).map((c) => c.auth)).toEqual(['Bearer tok-1', 'Bearer tok-1']);
    expect(info.progress?.guesses).toEqual(['CRANE']);
    expect(info.progress?.answer).toBeUndefined();
  });

  it('creates only one player when several requests start at once', async () => {
    let tokens = 0;
    const { impl } = fakeFetch((url) => (url.endsWith('/players') ? json(201, { token: `tok-${++tokens}` }) : json(200, STATE)));
    const service = new HttpDailyService('/api', impl);
    await Promise.all([service.getPuzzle(), service.getPuzzle(), service.getStats()]);
    expect(tokens).toBe(1);
  });

  it('re-registers when the server no longer knows the token', async () => {
    localStorage.setItem('tessera:v1:player:token', JSON.stringify('stale'));
    const { impl, calls } = fakeFetch((url, init) => {
      if (url.endsWith('/players')) return json(201, { token: 'fresh' });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer fresh' ? json(200, STATE) : json(401, { error: 'unauthorized' });
    });
    await new HttpDailyService('/api', impl).getPuzzle();
    expect(calls.map((c) => c.auth ?? 'none')).toEqual(['Bearer stale', 'none', 'Bearer fresh']);
  });

  it('turns API errors into ApiError with the server code', async () => {
    localStorage.setItem('tessera:v1:player:token', JSON.stringify('t'));
    const { impl } = fakeFetch(() => json(400, { error: 'invalid-word', message: 'Not in word list' }));
    const err = await new HttpDailyService('/api', impl).submitGuess('2026-10-27', 'QZXJK').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('invalid-word');
    expect(err.status).toBe(400);
  });

  it('posts guesses to the dated endpoint and returns the answer only when given', async () => {
    localStorage.setItem('tessera:v1:player:token', JSON.stringify('t'));
    const { impl, calls } = fakeFetch(() =>
      json(200, { evaluation: Array(5).fill('correct'), solved: true, gameOver: true, attempt: 2, answer: 'CRANE' }),
    );
    const result = await new HttpDailyService('/api', impl).submitGuess('2026-10-27', 'CRANE');
    expect(calls[0]).toMatchObject({ url: '/api/daily/2026-10-27/guesses', method: 'POST' });
    expect(result).toEqual({ evaluation: Array(5).fill('correct'), solved: true, gameOver: true, answer: 'CRANE' });
  });

  it('reports an unreachable server as offline', async () => {
    localStorage.setItem('tessera:v1:player:token', JSON.stringify('t'));
    const { impl } = fakeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const err = await new HttpDailyService('/api', impl).getPuzzle().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('offline');
  });
});

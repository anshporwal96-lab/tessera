// Tiny synthesized sound effects — no audio files to download.

export type SoundName = 'key' | 'flip' | 'error' | 'win' | 'lose';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSound(name: SoundName): void {
  switch (name) {
    case 'key':
      tone(520, 0, 0.05, 'triangle', 0.04);
      break;
    case 'flip':
      tone(340, 0, 0.08, 'sine', 0.05);
      break;
    case 'error':
      tone(180, 0, 0.12, 'square', 0.03);
      tone(150, 0.1, 0.14, 'square', 0.03);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle', 0.06));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.15, 0.3, 'sine', 0.05));
      break;
  }
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect x="2" y="2" width="13" height="13" rx="3" fill="var(--correct)" />
      <rect x="17" y="2" width="13" height="13" rx="3" fill="var(--present)" />
      <rect x="2" y="17" width="13" height="13" rx="3" fill="var(--brand)" />
      <rect x="17" y="17" width="13" height="13" rx="3" fill="var(--correct)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark />
      <span>Tessera</span>
    </span>
  );
}

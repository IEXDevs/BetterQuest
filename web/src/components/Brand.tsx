export function Brand({ subtitle = 'An IEXDevs product' }: { subtitle?: string }) {
  return (
    <a className="brand" href="/" aria-label="BetterQuest home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>
        <strong>BetterQuest</strong>
        <small>{subtitle}</small>
      </span>
    </a>
  );
}

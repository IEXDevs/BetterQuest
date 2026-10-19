export function Brand({ subtitle = 'An IEXDevs product' }: { subtitle?: string }) {
  return (
    <a className="brand" href="/" aria-label="BetterQuest home">
      <img src="/brand/BetterQuestFavicon.svg" alt="BetterQuest logo" className="brand-mark" width="36" height="36" />
      <span>
        <strong>BetterQuest</strong>
        <small>{subtitle}</small>
      </span>
    </a>
  );
}

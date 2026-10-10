import { EXTENSION_INSTALL_URL } from '../content/links';

export function InstallExtensionButton({
  size = 'lg',
  label = 'Add to Chrome',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={EXTENSION_INSTALL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`rainbow-halo-btn rainbow-halo-btn--${size} install-extension-button ${className}`.trim()}
    >
      <span className="rainbow-halo-blur" aria-hidden="true" />
      <span className="rainbow-halo-ring" aria-hidden="true" />
      <span className="rainbow-halo-surface">
        <span className="rainbow-btn-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
            <path d="M12 3v5.2M12 15.8V21M3 12h5.2M15.8 12H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="rainbow-btn-text">{label}</span>
        <span className="rainbow-btn-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
  );
}

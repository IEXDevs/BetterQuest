import Magnet from '../bits/Magnet';
import SpecularButton from '../bits/SpecularButton';
import { EXTENSION_INSTALL_URL } from '../content/links';

export function InstallExtensionButton({
  size = 'lg',
  label = 'Add to Chrome',
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  return (
    <Magnet padding={36} magnetStrength={2.6} wrapperClassName="magnet-wrap install-magnet">
      <SpecularButton
        href={EXTENSION_INSTALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        size={size}
        radius={999}
        tint="#bf5700"
        tintOpacity={0.42}
        blur={10}
        textColor="#fff7ed"
        lineColor="#ffd7a8"
        baseColor="#8a4a12"
        intensity={1.35}
        shineSize={14}
        shineFade={48}
        thickness={1.4}
        speed={0.4}
        followMouse
        proximity={280}
        autoAnimate
        className="install-extension-button"
      >
        <span className="install-extension-button__mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
            <path d="M12 3v5.2M12 15.8V21M3 12h5.2M15.8 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        {label}
        <span aria-hidden="true">↗</span>
      </SpecularButton>
    </Magnet>
  );
}

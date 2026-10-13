import { Brand } from './Brand';
import { InstallExtensionButton } from './InstallExtensionButton';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({
  current,
}: {
  current: 'product' | 'privacy';
}) {
  return (
    <header className="site-header">
      <Brand />
      <div className="header-actions">
        <nav aria-label="Primary navigation">
          <a href="/" aria-current={current === 'product' ? 'page' : undefined}>Product</a>
          <a href="/#inside">Features</a>
          <a href="/privacy" aria-current={current === 'privacy' ? 'page' : undefined}>Privacy Policy</a>
          <InstallExtensionButton size="sm" label="Extension" className="nav-cta" />
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

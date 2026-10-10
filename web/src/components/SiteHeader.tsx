import { EXTENSION_INSTALL_URL } from '../content/links';
import { Brand } from './Brand';
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
          {current === 'product' ? (
            <a href="#inside">Inside the layer</a>
          ) : (
            <a href="/">Product</a>
          )}
          <a href="/privacy" aria-current={current === 'privacy' ? 'page' : undefined}>Privacy</a>
          <a className="nav-cta" href={EXTENSION_INSTALL_URL} target="_blank" rel="noopener noreferrer">
            Extension
          </a>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

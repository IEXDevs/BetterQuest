import { resolveTheme } from './preferences';
import type { ThemePreference } from '../../shared/models';

export const themeTokens = {
  light: { '--bq-surface': '#ffffff', '--bq-text': '#18253a', '--bq-border': '#d7e2f0', '--bq-accent': '#227ab0', '--bq-muted': '#748491', '--bq-raised': '#eef3f6', '--bq-good': '#26a69a', '--bq-warning': '#a96645' },
  dark: { '--bq-surface': '#182434', '--bq-text': '#e7eef8', '--bq-border': '#3b4b63', '--bq-accent': '#9cc9ff', '--bq-muted': '#a9b8ca', '--bq-raised': '#27394e', '--bq-good': '#76d4b4', '--bq-warning': '#ebc48b' },
} as const;

/** Custom properties only; future verified component styles opt in explicitly. */
export function createThemeScope(root: HTMLElement, window: Window, initial: ThemePreference) {
  if (root === root.ownerDocument.body || root === root.ownerDocument.documentElement) throw new Error('Global Quest theming is not configured.');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = initial;
  const original = Object.keys(themeTokens.light).map(key => ({ key, value: root.style.getPropertyValue(key), priority: root.style.getPropertyPriority(key) }));
  const apply = () => {
    const theme = resolveTheme(preference, media.matches);
    for (const [key, value] of Object.entries(themeTokens[theme])) root.style.setProperty(key, value);
  };
  media.addEventListener('change', apply);
  apply();
  return {
    update: (next: ThemePreference) => { preference = next; apply(); },
    dispose: () => { media.removeEventListener('change', apply); for (const item of original) {
      if (item.value) root.style.setProperty(item.key, item.value, item.priority); else root.style.removeProperty(item.key);
    } },
  };
}

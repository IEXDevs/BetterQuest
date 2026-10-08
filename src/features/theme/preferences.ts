import type { ThemePreference } from '../../shared/models';
import { execute, type Execute } from '../../shared/client';

export class ThemePreferences {
  constructor(private run: Execute = execute) {}
  async get(): Promise<ThemePreference> { return (await this.run({ kind: 'state:read' })).preferences.theme; }
  async set(preference: ThemePreference) { return this.run({ kind: 'theme:set', preference }); }
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

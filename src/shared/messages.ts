export const QUEST_ORIGIN = 'https://quest.cns.utexas.edu';

export function isStudentPage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === QUEST_ORIGIN &&
      (url.pathname === '/student' || url.pathname.startsWith('/student/'));
  } catch {
    return false;
  }
}

export interface Ping { type: 'betterquest:ping' }
export interface Pong { type: 'betterquest:pong'; version: string }

export function isPing(value: unknown): value is Ping {
  return !!value && typeof value === 'object' &&
    'type' in value && value.type === 'betterquest:ping';
}

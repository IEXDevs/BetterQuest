import type { LocalState } from './models';
import type { Command } from '../storage/commands';
import { isLocalState } from './validation';
import type { CommandResponse } from './messages';

export type Execute = (command: Command) => Promise<LocalState>;

/** True once the extension host is gone (reload/update) while this page still runs the old script. */
export function isContextInvalidated(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime) && chrome.runtime.id === undefined;
  } catch {
    return false;
  }
}

export function commandErrorMessage(error: unknown): string {
  if (error instanceof Error && /extension context invalidated/i.test(error.message)) {
    return 'Extension updated. Reload this page to continue.';
  }
  return error instanceof Error ? error.message : 'Request failed.';
}

export const execute: Execute = async command => {
  let response: CommandResponse | undefined;
  try {
    response = await chrome.runtime.sendMessage({ type: 'betterquest:command', command });
  } catch (error) {
    throw new Error(commandErrorMessage(error));
  }
  if (!response || !response.ok) throw new Error(response?.error || 'BetterQuest background connection unavailable. Refresh after reloading the extension.');
  if (!isLocalState(response.state)) throw new Error('Invalid BetterQuest response.');
  return response.state;
};

/** Worker notifications only; content scripts cannot read/write raw storage. */
export function subscribeLocal(callback: () => void): () => void {
  try {
    const port = chrome.runtime.connect({ name: 'betterquest:changes' });
    const listener = (message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message && message.type === 'betterquest:changed') callback();
    };
    port.onMessage.addListener(listener);
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
    });
    return () => {
      try { port.onMessage.removeListener(listener); } catch { /* host is gone */ }
      try { port.disconnect(); } catch { /* host is gone */ }
    };
  } catch {
    return () => {};
  }
}

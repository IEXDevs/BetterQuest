import type { LocalState } from './models';
import type { Command } from '../storage/commands';
import { isLocalState } from './validation';
import type { CommandResponse } from './messages';

export type Execute = (command: Command) => Promise<LocalState>;

export const execute: Execute = async command => {
  const response: CommandResponse | undefined = await chrome.runtime.sendMessage({ type: 'betterquest:command', command });
  if (!response || !response.ok) throw new Error(response?.error || 'BetterQuest background connection unavailable. Refresh after reloading the extension.');
  if (!isLocalState(response.state)) throw new Error('Invalid BetterQuest response.');
  return response.state;
};

/** Worker notifications only; content scripts cannot read/write raw storage. */
export function subscribeLocal(callback: () => void): () => void {
  const port = chrome.runtime.connect({ name: 'betterquest:changes' });
  const listener = (message: unknown) => {
    if (message && typeof message === 'object' && 'type' in message && message.type === 'betterquest:changed') callback();
  };
  port.onMessage.addListener(listener);
  return () => { port.onMessage.removeListener(listener); port.disconnect(); };
}

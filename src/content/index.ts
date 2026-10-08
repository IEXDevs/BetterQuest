import { startIntegration, type Integration } from './integration';
import type { Ping, Pong } from '../shared/messages';

// This property belongs to the extension's isolated world, not Quest's globals.
const context = window as Window & { __betterQuestController?: Integration };
context.__betterQuestController?.dispose();
context.__betterQuestController = startIntegration(document, window);

const ping: Ping = { type: 'betterquest:ping' };
void chrome.runtime.sendMessage(ping).then((response: Pong | undefined) => {
  if (response?.type !== 'betterquest:pong') console.debug('[BetterQuest] Worker handshake unavailable.');
}).catch(() => {
  // The in-page button remains functional during an extension reload/worker restart.
  console.debug('[BetterQuest] Refresh this page after reloading the extension.');
});

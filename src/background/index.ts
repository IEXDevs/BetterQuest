import { isPing, isStudentPage, type Pong } from '../shared/messages';
import { isCommand } from '../storage/commands';
import { chromeBackend, LocalRepository } from '../storage/repository';
import { object } from '../shared/validation';

const access = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const repository = new LocalRepository(chromeBackend());
const subscribers = new Set<chrome.runtime.Port>();
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'betterquest:changes' || port.sender?.id !== chrome.runtime.id ||
      !port.sender.url || !isStudentPage(port.sender.url)) { port.disconnect(); return; }
  subscribers.add(port);
  port.onDisconnect.addListener(() => subscribers.delete(port));
});

chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
  if (sender.id !== chrome.runtime.id ||
      !sender.url || !isStudentPage(sender.url)) return;

  if (isPing(message)) {
    const response: Pong = { type: 'betterquest:pong', version: chrome.runtime.getManifest().version };
    reply(response);
    return;
  }
  if (!object(message) || message.type !== 'betterquest:command') return;
  if (!isCommand(message.command)) { reply({ ok: false, error: 'Invalid BetterQuest command.' }); return; }
  const command = message.command;
  void access.then(() => repository.execute(command)).then(
    state => {
      reply({ ok: true, state });
      if (command.kind !== 'state:read') for (const port of subscribers) {
        try { port.postMessage({ type: 'betterquest:changed' }); } catch { subscribers.delete(port); }
      }
    },
    error => reply({ ok: false, error: error instanceof Error ? error.message : 'Local storage failed.' }),
  );
  return true;
});

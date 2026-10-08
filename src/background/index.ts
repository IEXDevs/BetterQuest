import { isPing, isStudentPage, type Pong } from '../shared/messages';

// A small typed handshake, not a persistent background process or data service.
chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
  if (!isPing(message) || sender.id !== chrome.runtime.id ||
      !sender.url || !isStudentPage(sender.url)) return;

  const response: Pong = {
    type: 'betterquest:pong',
    version: chrome.runtime.getManifest().version,
  };
  reply(response);
});

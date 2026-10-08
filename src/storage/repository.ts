import { emptyState, type LocalState } from '../shared/models';
import { isLocalState } from '../shared/validation';
import { applyCommand, type Command } from './commands';

export const STORAGE_KEY = 'betterquest.local.v1';
export interface StorageBackend {
  read: () => Promise<unknown | undefined>;
  write: (state: LocalState) => Promise<void>;
}

export function decodeState(raw: unknown): LocalState {
  if (raw === undefined) return emptyState();
  if (!isLocalState(raw)) throw new Error('Unsupported or invalid BetterQuest local data. Existing data has not been overwritten.');
  return structuredClone(raw);
}

/** One worker-owned queue serializes reads and writes across content-script tabs. */
export class LocalRepository {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private backend: StorageBackend) {}

  execute(command: Command): Promise<LocalState> {
    const job = this.tail.then(async () => {
      const current = decodeState(await this.backend.read());
      const next = applyCommand(current, command);
      if (command.kind !== 'state:read') {
        if (!isLocalState(next)) throw new Error('Invalid state update.');
        if (new TextEncoder().encode(JSON.stringify(next)).length > 7_000_000) throw new Error('BetterQuest local data limit reached.');
        await this.backend.write(next);
      }
      return structuredClone(next);
    });
    this.tail = job.catch(() => undefined);
    return job;
  }
}

export function chromeBackend(): StorageBackend {
  return {
    read: async () => (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY],
    write: async state => { await chrome.storage.local.set({ [STORAGE_KEY]: state }); },
  };
}

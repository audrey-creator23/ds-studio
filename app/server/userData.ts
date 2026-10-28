import path from 'node:path';
import { userDataSchema, type UserData } from '../shared/steps.js';
import { atomicWrite, readPrivate } from './files.js';
import { StudioError } from './store.js';

// Données de l'interface v3 (statuts d'étapes, pistes, notes) : fichier
// privé hors Git, écritures en file comme la checklist.
export class UserDataStore {
  private queue: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(directory: string) {
    this.file = path.join(directory, 'v3-data.json');
  }
  async read(): Promise<UserData> {
    try {
      return userDataSchema.parse(
        JSON.parse(await readPrivate(this.file, 512000)),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        return userDataSchema.parse({});
      throw new StudioError(
        'Données de suivi invalides ou inaccessibles. Original préservé.',
        500,
      );
    }
  }
  set<K extends keyof UserData>(key: K, value: UserData[K]) {
    const work = this.queue.then(async () => {
      const next = userDataSchema.parse({ ...(await this.read()), [key]: value });
      await atomicWrite(this.file, JSON.stringify(next, null, 2) + '\n');
      return next;
    });
    this.queue = work.catch(() => {});
    return work;
  }
}

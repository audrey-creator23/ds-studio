import path from 'node:path';
import { z } from 'zod';
import { atomicWrite, readPrivate } from './files.js';
import { StudioError } from './store.js';
import { compositionSchema, type Composition } from '../shared/composition.js';

// Compositions de pages enregistrées, privées et hors Git. Indépendantes des
// tokens : enregistrer une page ne modifie jamais le Design System.
const fileSchema = z
  .object({ compositions: z.array(compositionSchema).max(30) })
  .strict();

export class CompositionStore {
  private queue: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(directory: string) {
    this.file = path.join(directory, 'compositions.json');
  }
  async read(): Promise<Composition[]> {
    try {
      return fileSchema.parse(
        JSON.parse(await readPrivate(this.file, 2_000_000)),
      ).compositions;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new StudioError(
        'Compositions invalides ou inaccessibles. Original préservé.',
        500,
      );
    }
  }
  private write(change: (list: Composition[]) => Composition[]) {
    const work = this.queue.then(async () => {
      const next = change(await this.read());
      await atomicWrite(
        this.file,
        JSON.stringify({ compositions: next }, null, 2) + '\n',
      );
      return next;
    });
    this.queue = work.catch(() => {});
    return work;
  }
  save(composition: Composition) {
    return this.write((list) => {
      const saved = { ...composition, updatedAt: new Date().toISOString() };
      const exists = list.some((c) => c.id === composition.id);
      if (!exists && list.length >= 30)
        throw new StudioError('30 pages maximum. Supprimez-en une.', 409);
      return exists
        ? list.map((c) => (c.id === composition.id ? saved : c))
        : [...list, saved];
    });
  }
  remove(id: string) {
    return this.write((list) => list.filter((c) => c.id !== id));
  }
}

import path from 'node:path';
import {
  taskStateSchema,
  type TaskId,
  type TaskState,
  type TaskStatus,
} from '../shared/tasks.js';
import { atomicWrite, readPrivate } from './files.js';
import { StudioError } from './store.js';

// Statuts de la checklist PFE, privés et hors Git, comme le brief.
export class TaskStore {
  private queue: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(directory: string) {
    this.file = path.join(directory, 'tasks.json');
  }
  async read(): Promise<TaskState> {
    try {
      return taskStateSchema.parse(
        JSON.parse(await readPrivate(this.file, 16000)),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        return taskStateSchema.parse({});
      throw new StudioError(
        'Checklist invalide ou inaccessible. Original préservé.',
        500,
      );
    }
  }
  // Une mise à jour ne touche qu'une tâche : les autres statuts sont conservés.
  set(id: TaskId, status: TaskStatus) {
    const work = this.queue.then(async () => {
      const current = await this.read();
      const next = taskStateSchema.parse({
        statuses: { ...current.statuses, [id]: status },
      });
      await atomicWrite(this.file, JSON.stringify(next, null, 2) + '\n');
      return next;
    });
    this.queue = work.catch(() => {});
    return work;
  }
}

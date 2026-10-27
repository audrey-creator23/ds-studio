import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TaskStore } from '../app/server/tasks.js';
import { statusOf, taskUpdateSchema } from '../app/shared/tasks.js';
import {
  briefAsText,
  milestoneStatus,
  timeProgress,
} from '../app/shared/brief.js';

test('checklist : statuts persistants, isolés et original préservé', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ds-tasks-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new TaskStore(directory);
  const initial = await store.read();
  assert.equal(statusOf(initial, 'intention'), 'done');
  assert.equal(statusOf(initial, 'tests'), 'todo');
  await Promise.all([
    store.set('tests', 'done'),
    store.set('recherche', 'validated'),
  ]);
  const saved = await new TaskStore(directory).read();
  assert.equal(statusOf(saved, 'tests'), 'done');
  assert.equal(statusOf(saved, 'recherche'), 'validated');
  assert.equal(statusOf(saved, 'intention'), 'done');
  assert.throws(() =>
    taskUpdateSchema.parse({ id: 'inconnue', status: 'done' }),
  );
  assert.throws(() =>
    taskUpdateSchema.parse({ id: 'tests', status: 'peut-être' }),
  );
  await writeFile(path.join(directory, 'tasks.json'), '{broken');
  await assert.rejects(() => store.read(), /Original préservé/);
  await assert.rejects(() => store.set('tests', 'todo'));
  assert.equal(
    await readFile(path.join(directory, 'tasks.json'), 'utf8'),
    '{broken',
  );
});

test('frise : statuts réels, une date passée ne vaut pas validation', () => {
  const none = { statuses: {} };
  // Au 27 oct. 2026 : lancement passé, note de cadrage en cours.
  assert.equal(milestoneStatus(0, none, '2026-10-27'), 'past');
  assert.equal(milestoneStatus(1, none, '2026-10-27'), 'current');
  assert.equal(milestoneStatus(2, none, '2026-10-27'), 'upcoming');
  // Après l'échéance, sans tâches terminées : en retard, pas validé.
  assert.equal(milestoneStatus(1, none, '2026-12-01'), 'late');
  const done = { statuses: { intention: 'done', validation: 'done' } } as const;
  assert.equal(milestoneStatus(1, done, '2026-12-01'), 'done');
  const validated = {
    statuses: { intention: 'validated', validation: 'validated' },
  } as const;
  assert.equal(milestoneStatus(1, validated, '2026-12-01'), 'validated');
  assert.equal(timeProgress('2026-09-25'), 0);
  assert.equal(timeProgress('2027-03-12'), 1);
  assert.match(briefAsText(none, '2026-10-27'), /Note de cadrage.*En cours/);
});

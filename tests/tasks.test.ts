import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TaskStore } from '../app/server/tasks.js';
import { statusOf, taskUpdateSchema } from '../app/shared/tasks.js';

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

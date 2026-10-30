import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { skillStore } from '../app/server/skills.js';
import { sources } from '../scripts/vendor-skills.mjs';

const root = path.resolve('.');

test('skills : fichiers installés identiques aux versions auditées', async () => {
  for (const s of sources)
    for (const [name, sha] of Object.entries(s.skills)) {
      const text = await readFile(
        path.join(root, 'skills', s.plugin, 'skills', name, 'SKILL.md'),
        'utf8',
      );
      assert.equal(createHash('sha256').update(text).digest('hex'), sha);
    }
});

test('skills : désactivés par défaut, inconnu refusé, inactif non chargeable', async () => {
  const store = skillStore(root, await mkdtemp(path.join(os.tmpdir(), 'sk-')));
  assert.equal((await store.list()).length, 7);
  assert.deepEqual(await store.state(), { active: [], repoRead: false });
  await assert.rejects(store.save({ active: ['x:y'], repoRead: false }));
  await assert.rejects(store.resolve('caveman:caveman'));
  await store.save({ active: ['caveman:caveman'], repoRead: true });
  const k = await store.resolve('caveman:caveman');
  assert.equal(k.dir, path.join(root, 'skills', 'caveman'));
  assert.ok(k.tokens > 500 && k.tokens < 2000);
});

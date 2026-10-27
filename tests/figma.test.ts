import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { tokensSchema } from '../app/shared/model.js';
import {
  figmaConfigSchema,
  figmaSnapshotSchema,
  normalize,
  compare,
  pullTokens,
  pushPlan,
  verify,
} from '../connectors/figma/sync.js';

const run = promisify(execFile);
const seed = tokensSchema.parse(
  JSON.parse(await readFile('workspace/design-system.tokens.json', 'utf8')),
);
const config = figmaConfigSchema.parse(
  JSON.parse(await readFile('workspace/figma.config.example.json', 'utf8')),
);
const snapshot = figmaSnapshotSchema.parse({
  fileKey: config.fileKey,
  nodeId: '0-1',
  readAt: '2026-10-27T10:00:00.000Z',
  variables: {
    'color/brand': '#8a3b20ff',
    'color/text': '#19243D',
    'font/body': '18px',
    'radius/control': 'beaucoup',
    'color/extra': '#000000',
  },
  components: ['Button', 'Card'],
});

test('figma : normalisation explicite, sans deviner', () => {
  assert.deepEqual(normalize('color.brand', '#8a3b20'), { value: '#8A3B20' });
  assert.ok('error' in normalize('color.brand', '#8a3b2080'));
  assert.ok('error' in normalize('color.brand', 'rgb(0,0,0)'));
  assert.deepEqual(normalize('space.sm', 12), { value: 12 });
  assert.ok('error' in normalize('space.sm', 500));
  assert.deepEqual(normalize('font.family', 'Georgia'), { value: 'Georgia' });
  assert.ok('error' in normalize('font.family', 'Comic Sans'));
});

test('figma : comparaison, import local et cible refusée', () => {
  const report = compare(config, snapshot, seed);
  const status = Object.fromEntries(
    report.tokens.map((r) => [r.key, r.status]),
  );
  assert.equal(status['color.brand'], 'different');
  assert.equal(status['color.text'], 'same');
  assert.equal(status['font.body'], 'different');
  assert.equal(status['radius.control'], 'invalid');
  assert.equal(status['color.focus'], 'missing');
  assert.deepEqual(report.unmappedFigma, ['color/extra']);
  assert.deepEqual(report.components.matched, ['Button']);
  assert.deepEqual(report.components.unmappedFigma, ['Card']);
  const pulled = pullTokens(report, seed);
  assert.equal(pulled['color.brand'].$value, '#8A3B20');
  assert.equal(pulled['font.body'].$value, 18);
  assert.equal(pulled['radius.control'].$value, seed['radius.control'].$value);
  assert.throws(
    () => compare(config, { ...snapshot, fileKey: 'AutreFichier123' }, seed),
    /Cible refusée/,
  );
  assert.throws(() =>
    figmaConfigSchema.parse({
      ...config,
      variables: { a: 'color.brand', b: 'color.brand' },
    }),
  );
});

test('figma : plan lié au hash, vérifié avant et après écriture', () => {
  const plan = pushPlan(compare(config, snapshot, seed));
  assert.deepEqual(
    plan.changes.map((c) => c.key),
    ['color.brand', 'font.body'],
  );
  assert.deepEqual(verify(plan, config, snapshot, 'before'), []);
  const concurrent = {
    ...snapshot,
    variables: { ...snapshot.variables, 'color/brand': '#000000' },
  };
  assert.equal(verify(plan, config, concurrent, 'before').length, 1);
  const written = {
    ...snapshot,
    variables: {
      ...snapshot.variables,
      'color/brand': '#3154C4',
      'font/body': 16,
    },
  };
  assert.deepEqual(verify(plan, config, written, 'after'), []);
  assert.deepEqual(verify({ ...plan, changes: [] }, config, written, 'after'), [
    'Plan modifié : hash invalide.',
  ]);
});

test('figma : la CLI écrit seulement dans son dossier privé', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ds-figma-'));
  const data = await mkdtemp(path.join(os.tmpdir(), 'ds-figma-data-'));
  t.after(() =>
    Promise.all(
      [dir, data].map((d) => rm(d, { recursive: true, force: true })),
    ),
  );
  await writeFile(path.join(dir, 'config.json'), JSON.stringify(config));
  await writeFile(path.join(dir, 'snapshot.json'), JSON.stringify(snapshot));
  const env = {
    ...process.env,
    DS_STUDIO_FIGMA_DIR: dir,
    DS_STUDIO_DATA_DIR: data,
  };
  const cli = (...args: string[]) =>
    run(
      process.execPath,
      ['--import', 'tsx', 'scripts/figma-sync.ts', ...args],
      { env },
    );
  await cli('pull');
  const imported = tokensSchema.parse(
    JSON.parse(
      await readFile(path.join(dir, 'figma-import.tokens.json'), 'utf8'),
    ),
  );
  assert.equal(imported['color.brand'].$value, '#8A3B20');
  const { stdout } = await cli('plan');
  assert.match(stdout, /Validation humaine requise/);
  await cli('verify', 'before');
  await assert.rejects(() => cli('verify', 'after'));
  const audit = (await readFile(path.join(dir, 'audit.jsonl'), 'utf8'))
    .trim()
    .split('\n');
  assert.deepEqual(
    audit.map((l) => JSON.parse(l).ok),
    [true, false],
  );
  await assert.rejects(() => readFile(path.join(data, 'state.json')));
});

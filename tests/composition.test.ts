import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../app/server/store.js';
import { tokensSchema } from '../app/shared/model.js';
import { createStudioServer } from '../app/server/http.js';
import { ClaudeAssistant, type Composer } from '../connectors/agents/claude.js';
import { fakeComposer } from '../connectors/agents/fakeComposer.js';
import {
  composeSystem,
  describeChanges,
  newItem,
  normalizeComposition,
  type Composition,
} from '../app/shared/composition.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = tokensSchema.parse(
  JSON.parse(
    await readFile(
      path.join(root, 'workspace/design-system.tokens.json'),
      'utf8',
    ),
  ),
);
const page: Composition = {
  id: 'page-test',
  name: 'Test',
  sections: [
    {
      id: 'sec-a',
      name: 'En-tête',
      layout: 'stack',
      columns: 1,
      gap: 'md',
      align: 'stretch',
      justify: 'start',
      padding: 'none',
      margin: 'none',
      items: [{ ...newItem('heading'), id: 'titre' }],
    },
  ],
};

async function fixture(
  t: { after: (fn: () => Promise<void>) => void },
  composer?: Composer,
) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-compose-'));
  const store = new Store(directory, seed);
  await store.init();
  const app = await createStudioServer({ root, store, composer });
  await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const boot = await (await fetch(origin + '/api/bootstrap')).json();
  const post = (route: string, body: unknown) =>
    fetch(origin + '/api/' + route, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'X-DS-Studio': boot.csrf,
      },
      body: JSON.stringify(body),
    });
  return { directory, origin, post, store };
}

test('composition : normalisation sans composant inventé, bornes et id uniques', () => {
  const c = normalizeComposition({
    name: '  Ma page ',
    sections: [
      {
        id: 'Pas Valide!',
        layout: 'grid',
        columns: 9,
        items: [
          { id: 'x', kind: 'button', variant: 'inconnue', span: 7, rows: 0 },
          { id: 'x', kind: 'carousel', variant: 'a' },
          { id: 'y', kind: 'badge', size: 'xl', text: 'a'.repeat(500) },
        ],
      },
      { layout: 'masonry' },
    ],
  })!;
  assert.equal(c.name, 'Ma page');
  const [grid, stack] = c.sections;
  assert.equal(grid.columns, 4);
  assert.match(grid.id, /^sec-/);
  assert.deepEqual(
    grid.items.map((i) => i.kind),
    ['button', 'badge'],
  );
  assert.equal(grid.items[0].variant, 'primary');
  assert.equal(grid.items[0].span, 4);
  assert.equal(grid.items[0].rows, 1);
  assert.equal(grid.items[1].size, 'md');
  assert.equal(grid.items[1].text.length, 160);
  assert.equal(stack.layout, 'stack');
  assert.equal(stack.columns, 1);
  assert.equal(normalizeComposition(null), undefined);
});

test('composition : résumé des changements (ajout, déplacement, retrait)', () => {
  const after = structuredClone(page);
  after.sections[0].items.unshift({ ...newItem('button'), id: 'cta' });
  const lines = describeChanges(page, after);
  assert.ok(lines.some((l) => l.startsWith('Ajout : Bouton')));
  assert.ok(lines.some((l) => l.startsWith('Déplacement : Titre')));
  assert.ok(describeChanges(after, page).some((l) => l === 'Retrait : Bouton'));
  assert.deepEqual(describeChanges(page, page), []);
  // Instructions fixes : la composition passe dans la demande, pas ici.
  assert.ok(!composeSystem().includes('page-test'));
  assert.match(composeSystem(), /jamais les tokens/);
});

test('compositions : enregistrement privé, liste, suppression, tokens intacts', async (t) => {
  const { directory, origin, post, store } = await fixture(t);
  const before = store.snapshot().revision;
  const empty = await (await fetch(origin + '/api/compositions')).json();
  assert.deepEqual(empty.compositions, []);
  let r = await post('compositions', { composition: page });
  assert.equal(r.status, 200);
  const saved = (await r.json()).compositions;
  assert.equal(saved.length, 1);
  assert.ok(saved[0].updatedAt);
  r = await post('compositions', {
    composition: { ...page, name: 'Renommée' },
  });
  assert.equal((await r.json()).compositions[0].name, 'Renommée');
  const file = JSON.parse(
    await readFile(path.join(directory, 'compositions.json'), 'utf8'),
  );
  assert.equal(file.compositions.length, 1);
  assert.equal(
    (await stat(path.join(directory, 'compositions.json'))).mode & 0o077,
    0,
  );
  r = await post('compositions', {
    composition: {
      ...page,
      sections: [{ ...page.sections[0], items: [{ kind: 'carousel' }] }],
    },
  });
  assert.equal(r.status, 400);
  r = await post('compositions/delete', { id: page.id });
  assert.deepEqual((await r.json()).compositions, []);
  assert.equal(store.snapshot().revision, before);
});

test('compose : proposition validée par le serveur, jamais enregistrée', async (t) => {
  const { origin, post, store } = await fixture(t, fakeComposer);
  let r = await post('compose', {
    message: 'Place une grande card à gauche, trois petites à droite',
    composition: page,
    history: [],
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.question, false);
  assert.equal(body.proposal.sections.length, 2);
  const grid = body.proposal.sections[1];
  assert.equal(grid.layout, 'grid');
  // Variante vide de la simulation corrigée vers une variante existante.
  assert.equal(grid.items[1].variant, '📌');
  assert.equal(grid.items[0].rows, 3);
  assert.ok(
    body.changes.some((l: string) => l.startsWith('Ajout : Carte atelier')),
  );
  const listed = await (await fetch(origin + '/api/compositions')).json();
  assert.deepEqual(listed.compositions, []);
  assert.equal(listed.composer.available, true);
  assert.equal(store.snapshot().revision, 0);
  r = await post('compose', {
    message: 'Fais une page',
    composition: page,
    history: [],
  });
  const ask = await r.json();
  assert.equal(ask.question, true);
  assert.equal(ask.proposal, null);
  r = await post('compose', { message: 'x', composition: {}, history: [] });
  assert.equal(r.status, 400);
});

test('compose : clé absente refusée, sortie structurée demandée à Claude', async (t) => {
  const missing: Composer = {
    async status() {
      return { available: false, detail: 'Clé absente' };
    },
    async compose() {
      throw new Error('jamais appelé');
    },
  };
  const { post } = await fixture(t, missing);
  const r = await post('compose', {
    message: 'Ajoute un bouton',
    composition: page,
    history: [],
  });
  assert.equal(r.status, 503);
  const params: Record<string, unknown>[] = [];
  const client = {
    messages: {
      stream(p: Record<string, unknown>) {
        params.push(p);
        return {
          async finalMessage() {
            return {
              stop_reason: 'end_turn',
              usage: { input_tokens: 1, output_tokens: 1 },
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    reply: 'ok',
                    needsInput: false,
                    sections: [],
                  }),
                },
              ],
            };
          },
        };
      },
    },
  } as unknown as ConstructorParameters<typeof ClaudeAssistant>[1];
  const result = await new ClaudeAssistant(root, client).compose(
    'sys',
    [{ role: 'user', text: 'x' }],
    new AbortController().signal,
    'claude-sonnet-5-5',
  );
  assert.equal(result.output?.reply, 'ok');
  const config = params[0].output_config as {
    format: { type: string; schema: { properties: object } };
  };
  assert.equal(config.format.type, 'json_schema');
  assert.ok('sections' in config.format.schema.properties);
  assert.equal(params[0].model, 'claude-sonnet-5-5');
  assert.equal('tools' in params[0], false);
});

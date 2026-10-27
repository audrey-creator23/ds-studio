import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Store } from '../app/server/store.js';
import { tokensSchema } from '../app/shared/model.js';
import { createStudioServer } from '../app/server/http.js';
import {
  ClaudeAssistant,
  type Assistant,
  type ChatTurn,
} from '../connectors/agents/claude.js';
import Markdown from '../app/client/Markdown.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = tokensSchema.parse(
  JSON.parse(
    await readFile(
      path.join(root, 'workspace/design-system.tokens.json'),
      'utf8',
    ),
  ),
);

// Assistant simulé : aucun appel réseau, aucune clé.
function fake(fail = false) {
  const calls: { system: string; turns: ChatTurn[]; model: string }[] = [];
  const assistant: Assistant = {
    async status() {
      return { available: true, detail: 'Simulation' };
    },
    async *stream(system, turns, _signal, model) {
      calls.push({ system, turns, model });
      yield { type: 'text', text: 'Bonjour, ' };
      if (fail) throw new Error('coupure simulée');
      yield { type: 'text', text: '**Audrey**.\nSources : Brief' };
      yield {
        type: 'done',
        stopReason: 'end_turn',
        usage: { input: 10, output: 5 },
      };
    },
  };
  return { assistant, calls };
}

async function fixture(
  t: { after: (fn: () => Promise<void>) => void },
  assistant: Assistant,
) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-assistant-'));
  const store = new Store(directory, seed);
  await store.init();
  const app = await createStudioServer({ root, store, assistant });
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
  const lines = async (response: Response) =>
    (await response.text())
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
  return { origin, post, lines, directory };
}

test('assistant : flux, contexte en lecture seule, historique persistant', async (t) => {
  const { assistant, calls } = fake();
  const { origin, post, lines, directory } = await fixture(t, assistant);
  const info = await (await fetch(origin + '/api/assistant')).json();
  assert.equal(info.model, 'claude-opus-5-5');
  assert.equal(info.status.available, true);
  assert.deepEqual(info.messages, []);
  assert.ok(info.sources.some((s: { id: string }) => s.id === 'brief'));
  assert.equal(JSON.stringify(info).includes('ANTHROPIC'), false);

  const events = await lines(
    await post('assistant', { message: 'Qui suis-je ?' }),
  );
  assert.deepEqual(
    events.map((e) => e.type),
    ['start', 'text', 'text', 'done'],
  );
  assert.equal(events.at(-1).messages.length, 2);
  assert.match(calls[0].system, /lecture seule/);
  assert.match(
    calls[0].system,
    /<document source="Brief, planning et checklist">/,
  );
  assert.match(calls[0].system, /Note de cadrage/);
  assert.deepEqual(calls[0].turns, [{ role: 'user', text: 'Qui suis-je ?' }]);

  await lines(await post('assistant', { message: 'Et ensuite ?' }));
  assert.equal(calls[1].turns.length, 3);
  const saved = JSON.parse(
    await readFile(path.join(directory, 'assistant.json'), 'utf8'),
  );
  assert.equal(saved.messages.length, 4);
  assert.equal(saved.messages[1].text, 'Bonjour, **Audrey**.\nSources : Brief');

  assert.equal((await post('assistant', { message: ' ' })).status, 400);
  assert.equal(
    (await post('assistant', { message: 'x'.repeat(9000) })).status,
    400,
  );
  const cleared = await (await post('assistant/clear', {})).json();
  assert.deepEqual(cleared.messages, []);
});

test('assistant : erreur en cours de flux, réponse partielle conservée', async (t) => {
  const { assistant } = fake(true);
  const { origin, post, lines } = await fixture(t, assistant);
  const events = await lines(await post('assistant', { message: 'Test' }));
  assert.equal(events.at(-1).type, 'error');
  const info = await (await fetch(origin + '/api/assistant')).json();
  assert.equal(info.messages[1].text, 'Bonjour, ');
  assert.ok(info.messages[1].error);
});

test('assistant : sans clé API, indisponible et aucun appel', async (t) => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  t.after(() => {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  });
  const empty = await mkdtemp(path.join(tmpdir(), 'ds-nokey-'));
  t.after(() => rm(empty, { recursive: true, force: true }));
  const { origin, post } = await fixture(t, new ClaudeAssistant(empty));
  const info = await (await fetch(origin + '/api/assistant')).json();
  assert.equal(info.status.available, false);
  const refused = await post('assistant', { message: 'Bonjour' });
  assert.equal(refused.status, 503);
});

test('markdown : rendu sûr, sans HTML brut ni lien non http', () => {
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      text: '# Titre\n- **gras** et `code`\n<script>alert(1)</script>\n[ok](https://figma.com) [ko](javascript:alert(1))',
    }),
  );
  assert.match(html, /<strong>gras<\/strong>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/figma.com"/);
  assert.doesNotMatch(html, /href="javascript/);
});

test('assistant : choix du modèle mémorisé, liste fermée, utilisé pour les requêtes', async (t) => {
  const { assistant, calls } = fake();
  const { origin, post, lines, directory } = await fixture(t, assistant);
  const info = await (await fetch(origin + '/api/assistant')).json();
  assert.equal(info.model, 'claude-opus-5-5');
  assert.deepEqual(
    info.models.map((m: { id: string }) => m.id),
    ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  );
  assert.equal(
    (await post('assistant/model', { model: 'claude-3-opus' })).status,
    400,
  );
  const saved = await (
    await post('assistant/model', { model: 'claude-haiku-5-5' })
  ).json();
  assert.equal(saved.model, 'claude-haiku-5-5');
  await lines(await post('assistant', { message: 'Bonjour' }));
  assert.equal(calls[0].model, 'claude-haiku-5-5');
  const file = JSON.parse(
    await readFile(path.join(directory, 'assistant.json'), 'utf8'),
  );
  assert.equal(file.model, 'claude-haiku-5-5');
  assert.equal(file.messages.length, 2);
  const again = await (await fetch(origin + '/api/assistant')).json();
  assert.equal(again.model, 'claude-haiku-5-5');
});

test('assistant : repli serveur envoyé seulement aux modèles qui l’acceptent', async () => {
  const params: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        stream(p: Record<string, unknown>) {
          params.push(p);
          return {
            async *[Symbol.asyncIterator]() {},
            async finalMessage() {
              return {
                stop_reason: 'end_turn',
                usage: { input_tokens: 1, output_tokens: 1 },
              };
            },
          };
        },
      },
    },
  } as unknown as ConstructorParameters<typeof ClaudeAssistant>[1];
  const claude = new ClaudeAssistant(root, client);
  for (const model of ['claude-opus-5-5', 'claude-haiku-5-5'] as const)
    for await (const _ of claude.stream(
      's',
      [{ role: 'user', text: 'x' }],
      new AbortController().signal,
      model,
    ));
  assert.equal(params[0].model, 'claude-opus-5-5');
  assert.equal(params[0].fallbacks, 'default');
  assert.equal(params[1].model, 'claude-haiku-5-5');
  assert.equal('fallbacks' in params[1], false);
  assert.equal('betas' in params[1], false);
});

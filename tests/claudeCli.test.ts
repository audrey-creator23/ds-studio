import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Faux binaire `claude` : `auth status` et `-p` en stream-json, comme le
// CLI documenté. Aucun appel réseau, aucun identifiant.
const dir = await mkdtemp(path.join(os.tmpdir(), 'ds-cli-'));
const fake = path.join(dir, 'claude');
await writeFile(
  fake,
  `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'auth') { console.log(JSON.stringify({ loggedIn: process.env.FAKE_LOGGED !== '0' })); process.exit(0); }
fs.writeFileSync(${JSON.stringify(path.join(dir, 'args.json'))}, JSON.stringify({ args, stdin: fs.readFileSync(0, 'utf8'), key: process.env.ANTHROPIC_API_KEY ?? null }));
const out = (v) => process.stdout.write(JSON.stringify(v) + '\\n');
out({ type: 'system', subtype: 'init' });
for (const p of ['{"reply":"Je pro', 'pose une grille', '","needsInput":false'])
  out({ type: 'stream_event', event: { delta: { type: 'input_json_delta', partial_json: p } } });
if (process.env.FAKE_FAIL) { out({ type: 'result', is_error: true, result: 'Not logged in · Please run /login' }); process.exit(1); }
out({ type: 'result', is_error: false, stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 },
  structured_output: { reply: 'Je propose une grille.', needsInput: true, sections: [] } });
`,
);
await chmod(fake, 0o755);
process.env.DS_STUDIO_CLAUDE_BIN = fake;
const { ClaudeCliComposer, partialReply } =
  await import('../connectors/agents/claudeCli.js');

test('réponse partielle lue dans le JSON en cours', () => {
  assert.equal(partialReply('{"reply":"Bon'), 'Bon');
  assert.equal(partialReply('{"reply":"a\\"b'), 'a"b');
  assert.equal(partialReply('{"reply":"x\\u00'), 'x');
  assert.equal(partialReply('{"needs'), undefined);
});

test('passerelle Claude Code : flux, sortie structurée, sans clé ni outils', async () => {
  process.env.ANTHROPIC_API_KEY = 'ne-doit-pas-passer';
  const cli = new ClaudeCliComposer(dir);
  assert.equal((await cli.status()).available, true);
  const progress: unknown[] = [];
  const r = await cli.compose(
    'système',
    [
      { role: 'user', text: 'Bonjour' },
      { role: 'assistant', text: 'Salut' },
      { role: 'user', text: 'Une grille' },
    ],
    new AbortController().signal,
    'claude-sonnet-5-5',
    (p: unknown) => progress.push(p),
  );
  assert.equal(r.output?.reply, 'Je propose une grille.');
  assert.deepEqual(r.usage, { input: 10, output: 5 });
  assert.ok(
    progress.some(
      (p) => (p as { reply?: string }).reply === 'Je propose une grille',
    ),
  );
  const seen = JSON.parse(await readFile(path.join(dir, 'args.json'), 'utf8'));
  assert.equal(seen.key, null);
  assert.ok(seen.args.includes('--no-session-persistence'));
  // Schéma accepté par le CLI : pas de référence $schema.
  const sent = JSON.parse(seen.args[seen.args.indexOf('--json-schema') + 1]);
  assert.equal(sent.$schema, undefined);
  assert.equal(sent.type, 'object');
  assert.equal(seen.args[seen.args.indexOf('--tools') + 1], '');
  assert.match(
    seen.stdin,
    /Utilisatrice : Bonjour[\s\S]*Nouvelle demande :\nUne grille/,
  );
  delete process.env.ANTHROPIC_API_KEY;
});

test('erreurs lisibles (session non connectée)', async () => {
  process.env.FAKE_FAIL = '1';
  const cli = new ClaudeCliComposer(dir);
  await assert.rejects(
    cli.compose(
      's',
      [{ role: 'user', text: 'x' }],
      new AbortController().signal,
      'claude-sonnet-5-5',
    ),
    /claude auth login/,
  );
  delete process.env.FAKE_FAIL;
  process.env.FAKE_LOGGED = '0';
  assert.equal((await new ClaudeCliComposer(dir).status()).available, false);
  delete process.env.FAKE_LOGGED;
  await rm(dir, { recursive: true, force: true });
});

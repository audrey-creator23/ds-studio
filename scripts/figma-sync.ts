import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPrivate, atomicWrite } from '../app/server/files.js';
import { stateSchema, tokensSchema, type Tokens } from '../app/shared/model.js';
import {
  figmaConfigSchema,
  figmaSnapshotSchema,
  compare,
  pullTokens,
  pushPlan,
  verify,
  type PushPlan,
} from '../connectors/figma/sync.js';

// Lit des fichiers locaux préparés par l'agent via le MCP Figma officiel.
// N'écrit jamais l'état de DS-Studio ni Figma : seulement des fichiers privés.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(
  process.env.DS_STUDIO_FIGMA_DIR ?? path.join(root, 'workspace/private/figma'),
);
const dataDir = path.resolve(
  process.env.DS_STUDIO_DATA_DIR ?? path.join(root, '.ds-studio'),
);
const file = (name: string) => path.join(dir, name);
const json = async (name: string) => JSON.parse(await readPrivate(name));

async function currentTokens(): Promise<Tokens> {
  try {
    return stateSchema.parse(await json(path.join(dataDir, 'state.json')))
      .tokens;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return tokensSchema.parse(
      await json(path.join(root, 'workspace/design-system.tokens.json')),
    );
  }
}
async function write(name: string, value: unknown) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await atomicWrite(file(name), `${JSON.stringify(value, null, 2)}\n`);
}

const [command, phase] = process.argv.slice(2);
try {
  const config = figmaConfigSchema.parse(await json(file('config.json')));
  const snapshot = figmaSnapshotSchema.parse(await json(file('snapshot.json')));
  if (command === 'compare' || command === 'pull' || command === 'plan') {
    const tokens = await currentTokens();
    const report = compare(config, snapshot, tokens);
    await write('report.json', report);
    for (const r of report.tokens)
      console.log(
        `${r.status.padEnd(9)} ${r.key.padEnd(16)} local ${r.local} · figma ${r.figma ?? '—'}${r.error ? ` (${r.error})` : ''}`,
      );
    if (report.unmappedFigma.length)
      console.log(
        `Variables Figma non reliées : ${report.unmappedFigma.join(', ')}`,
      );
    const c = report.components;
    console.log(
      `Composants : ${c.matched.length} reliés, absents de Figma : ${c.missingInFigma.join(', ') || '—'}, non reliés : ${c.unmappedFigma.join(', ') || '—'}`,
    );
    if (command === 'pull') {
      await write('figma-import.tokens.json', pullTokens(report, tokens));
      console.log(
        `Prêt à importer dans DS-Studio (Importer un JSON → diff → validation) : ${file('figma-import.tokens.json')}`,
      );
    }
    if (command === 'plan') {
      const plan = pushPlan(report);
      await write('push-plan.json', plan);
      console.log(
        plan.changes.length
          ? `Plan ${plan.hash} : ${plan.changes.length} variable(s). Validation humaine requise avec ce hash.`
          : 'Aucun écart à pousser.',
      );
    }
  } else if (
    command === 'verify' &&
    (phase === 'before' || phase === 'after')
  ) {
    const plan = (await json(file('push-plan.json'))) as PushPlan;
    const errors = verify(plan, config, snapshot, phase);
    await fs.appendFile(
      file('audit.jsonl'),
      `${JSON.stringify({ date: new Date().toISOString(), phase, hash: plan.hash, readAt: snapshot.readAt, ok: !errors.length, errors })}\n`,
      { mode: 0o600 },
    );
    if (errors.length) {
      console.error(`Vérification ${phase} refusée :\n${errors.join('\n')}`);
      process.exitCode = 1;
    } else console.log(`Vérification ${phase} OK pour le plan ${plan.hash}.`);
  } else {
    console.error(
      'Usage : npm run figma -- compare | pull | plan | verify before|after',
    );
    process.exitCode = 2;
  }
} catch (error) {
  console.error(
    `Refus : ${error instanceof Error ? error.message : String(error)}. Aucun fichier de DS-Studio ni de Figma modifié.`,
  );
  process.exitCode = 1;
}

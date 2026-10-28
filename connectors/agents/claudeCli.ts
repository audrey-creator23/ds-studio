import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import {
  composeOutputSchema,
  type ComposeOutput,
} from '../../app/shared/composition.js';
import type {
  ChatTurn,
  ClaudeModel,
  Composer,
  ComposeProgress,
} from './claude.js';

// Passerelle locale vers Claude Code installé sur ce Mac (`claude -p`,
// mode non interactif documenté) : la session est celle de l'utilisatrice,
// ouverte par elle-même avec `claude auth login`. DS-Studio ne lit, ne
// stocke ni ne transmet aucun identifiant ; aucun cookie ; pas d'outils,
// pas de MCP, pas de session conservée par Claude Code (l'historique est
// celui du chat), dossier de travail vide. Quotas et limites de
// l'abonnement inchangés.
const candidates = [
  process.env.DS_STUDIO_CLAUDE_BIN,
  ...(process.env.PATH ?? '')
    .split(path.delimiter)
    .map((d) => path.join(d, 'claude')),
  path.join(os.homedir(), '.local/bin/claude'),
  '/opt/homebrew/bin/claude',
  '/usr/local/bin/claude',
];
export const findClaude = () => candidates.find((c) => c && existsSync(c));

const run = (bin: string, args: string[]) =>
  new Promise<string>((resolve) =>
    execFile(bin, args, { timeout: 15000 }, (_e, out) => resolve(out ?? '')),
  );

// Sans « $schema » : le CLI refuse la référence draft 2020-12 ajoutée par Zod.
const { $schema: _draft, ...jsonSchema } = z.toJSONSchema(composeOutputSchema);
const schema = JSON.stringify(jsonSchema);

// Texte de « reply » déjà généré, lu dans le JSON partiel en cours.
export function partialReply(json: string) {
  const m = /"reply"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(json);
  if (!m) return undefined;
  const raw = m[1].replace(/\\u?[0-9a-fA-F]{0,3}$|\\$/, '');
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return undefined;
  }
}

export class ClaudeCliComposer implements Composer {
  private checked?: {
    at: number;
    value: { available: boolean; detail: string };
  };
  constructor(private dataDir: string) {}
  async status() {
    if (this.checked && Date.now() - this.checked.at < 30000)
      return this.checked.value;
    const bin = findClaude();
    let value: { available: boolean; detail: string };
    if (!bin)
      value = {
        available: false,
        detail:
          'Claude Code introuvable sur ce Mac : installez-le, ou ajoutez une clé API.',
      };
    else {
      let logged = false;
      try {
        logged =
          JSON.parse(await run(bin, ['auth', 'status'])).loggedIn === true;
      } catch {
        /* Version sans « auth status » : considéré non connecté. */
      }
      value = logged
        ? {
            available: true,
            detail:
              'Via Claude Code (votre session, sur ce Mac). Aucune clé exposée.',
          }
        : {
            available: false,
            detail:
              'Claude Code non connecté : lancez « claude auth login » dans un terminal, puis rechargez.',
          };
    }
    this.checked = { at: Date.now(), value };
    return value;
  }
  async compose(
    system: string,
    turns: ChatTurn[],
    signal: AbortSignal,
    model: ClaudeModel,
    onProgress?: (p: ComposeProgress) => void,
  ) {
    const bin = findClaude();
    if (!bin) throw readable('Claude Code introuvable sur ce Mac.');
    const cwd = path.join(this.dataDir, 'claude-cli');
    await mkdir(cwd, { recursive: true, mode: 0o700 });
    const last = turns.at(-1)!;
    const prompt = [
      ...(turns.length > 1
        ? [
            'Conversation précédente :',
            ...turns
              .slice(0, -1)
              .map(
                (t) =>
                  `${t.role === 'user' ? 'Utilisatrice' : 'Toi'} : ${t.text}`,
              ),
            '',
            'Nouvelle demande :',
          ]
        : []),
      last.text,
    ].join('\n');
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const child = spawn(
      bin,
      [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--include-partial-messages',
        '--json-schema',
        schema,
        '--system-prompt',
        system,
        '--model',
        model,
        '--tools',
        '',
        '--strict-mcp-config',
        '--permission-mode',
        'dontAsk',
        '--no-session-persistence',
      ],
      { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const abort = () => child.kill('SIGINT');
    signal.addEventListener('abort', abort);
    child.stdin.end(prompt);
    onProgress?.({ status: 'Claude Code réfléchit…' });
    let buffer = '';
    let partial = '';
    let result: Record<string, unknown> | undefined;
    let stderr = '';
    child.stderr.on('data', (d) => (stderr = (stderr + d).slice(-2000)));
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        let ev: Record<string, any>;
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (ev.type === 'result') result = ev;
        if (ev.type === 'system' && ev.subtype === 'api_retry')
          onProgress?.({
            status: `Nouvelle tentative (${ev.attempt}/${ev.max_retries})…`,
          });
        const delta = ev.type === 'stream_event' ? ev.event?.delta : undefined;
        const piece = delta?.partial_json ?? delta?.text;
        if (typeof piece === 'string') {
          partial += piece;
          const reply = partialReply(partial);
          if (reply) onProgress?.({ reply });
        }
      }
    });
    const code = await new Promise<number | null>((resolve) =>
      child.on('close', resolve),
    );
    signal.removeEventListener('abort', abort);
    if (signal.aborted) throw readable('Réponse interrompue.');
    if (!result) throw readable(cliError(stderr, code));
    if (result.is_error)
      throw readable(cliError(String(result.result ?? ''), code));
    let output: ComposeOutput | null = null;
    const parsed = composeOutputSchema.safeParse(result.structured_output);
    if (parsed.success) output = parsed.data;
    const usage = (result.usage ?? {}) as Record<string, number>;
    return {
      output,
      stopReason: (result.stop_reason as string | null) ?? null,
      usage: {
        input:
          (usage.input_tokens ?? 0) +
          (usage.cache_read_input_tokens ?? 0) +
          (usage.cache_creation_input_tokens ?? 0),
        output: usage.output_tokens ?? 0,
      },
    };
  }
}

const readable = (message: string) =>
  Object.assign(new Error(message), { name: 'ClaudeCliError' });
// Erreurs lisibles, sans détail technique ni donnée de compte.
function cliError(text: string, code: number | null) {
  if (/does not support this model|claude update/i.test(text))
    return 'Claude Code trop ancien pour ce modèle : lancez « claude update » dans un terminal.';
  if (/log ?in|auth|credential/i.test(text))
    return 'Claude Code non connecté : lancez « claude auth login » dans un terminal.';
  if (/rate|limit|quota|usage/i.test(text))
    return 'Limite d’utilisation de votre abonnement atteinte. Réessayez plus tard.';
  if (/overloaded|529/i.test(text))
    return 'Claude est surchargé. Réessayez dans un moment.';
  return `Claude Code n’a pas répondu (code ${code ?? '?'}). Réessayez.`;
}

// Choix du connecteur : clé API si présente (inchangé), sinon Claude Code.
export class AutoComposer implements Composer {
  constructor(
    private api: Composer,
    private cli: Composer,
  ) {}
  private async pick() {
    return (await this.api.status()).available ? this.api : this.cli;
  }
  async status() {
    return (await this.pick()).status();
  }
  async compose(...args: Parameters<Composer['compose']>) {
    return (await this.pick()).compose(...args);
  }
}

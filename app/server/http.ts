import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { proposeSchema } from '../shared/model.js';
import { Store, StudioError } from './store.js';
import { ProjectStore } from './project.js';
import { projectSchema } from '../shared/project.js';
import { TaskStore } from './tasks.js';
import { UserDataStore } from './userData.js';
import { userDataUpdate } from '../shared/steps.js';
import { taskUpdateSchema } from '../shared/tasks.js';
import { CodexAdapter } from '../../connectors/agents/codex.js';
import { unvalidatedAdapter } from '../../connectors/agents/unvalidated.js';
import type { AgentAdapter } from '../../connectors/agents/types.js';
import { figmaStatus } from '../../connectors/figma/contract.js';
import {
  ClaudeAssistant,
  claudeModels,
  claudeModelIds,
  assistantLimits,
  describeAssistantError,
  type Assistant,
  type Composer,
} from '../../connectors/agents/claude.js';
import {
  AutoComposer,
  ClaudeCliComposer,
} from '../../connectors/agents/claudeCli.js';
import { ChatStore, buildContext } from './assistant.js';
import { CompositionStore } from './compositions.js';
import { FigmaBridge } from './figmaBridge.js';
import { CarteData } from './carteData.js';
import {
  compositionSchema,
  composeSystem,
  composeTurn,
  describeChanges,
  normalizeComposition,
} from '../shared/composition.js';
import type { RecordInfo } from '../../scripts/runtime.mjs';

// Pages de l'interface, pour situer une question posée depuis la bulle.
const pageKeys = ['home', 'workshop', 'assistant', 'brief', 'volcano'] as const;
const pageLabels: Record<(typeof pageKeys)[number], string> = {
  home: 'Accueil (tableau de bord)',
  workshop: 'Design (composition et tokens)',
  assistant: 'Contexte & Assistant',
  brief: 'Brief du projet',
  volcano: 'Dashboard Volcan',
};

export async function createStudioServer(options: {
  root: string;
  store: Store;
  agent?: AgentAdapter;
  assistant?: Assistant;
  composer?: Composer;
  dev?: boolean;
  control?: { record: RecordInfo; stop: () => void };
}) {
  const { root, store } = options;
  const adapters: Record<string, AgentAdapter> = {
    codex: options.agent ?? new CodexAdapter(),
    claude: unvalidatedAdapter('claude'),
    gemini: unvalidatedAdapter('gemini'),
  };
  const project = new ProjectStore(store.directory);
  const tasks = new TaskStore(store.directory);
  const userData = new UserDataStore(store.directory);
  const chat = new ChatStore(store.directory);
  const assistant = options.assistant ?? new ClaudeAssistant(root);
  // Clé API si présente, sinon Claude Code installé (session de l'utilisatrice).
  const composer =
    options.composer ??
    new AutoComposer(
      new ClaudeAssistant(root),
      new ClaudeCliComposer(store.directory),
    );
  const compositions = new CompositionStore(store.directory);
  const figmaBridge = new FigmaBridge(store.directory);
  const carteData = new CarteData();
  // Source externe indisponible : 503 lisible (jamais de valeur inventée).
  const external = async (load: () => Promise<unknown>) => {
    try {
      return await load();
    } catch (e) {
      const err = e as Error & { status?: number };
      throw new StudioError(
        err.message || 'Source indisponible.',
        err.status ?? 503,
      );
    }
  };
  let chatBusy = false;
  const csrf = randomBytes(32).toString('hex');
  let busy = false;
  const active = new Set<AbortController>();
  const vite = options.dev
    ? await (
        await import('vite')
      ).createServer({
        root,
        server: { middlewareMode: true, host: '127.0.0.1' },
        appType: 'spa',
      })
    : null;
  const server = http.createServer(async (req, res) => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const origin = `http://127.0.0.1:${port}`;
    const send = (status: number, value: unknown) => {
      if (!res.destroyed) {
        res.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify(value));
      }
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'${options.dev ? ' ws://127.0.0.1:*' : ''}; frame-src 'self' blob: https://embed.figma.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'`,
    );
    try {
      // Figma n'accepte que « localhost » dans le manifeste du plugin : cet
      // hôte est admis pour la seule route du plugin (origine null + code).
      const pluginPath = new URL(req.url ?? '/', origin).pathname;
      const pluginRead =
        req.headers.origin === 'null' &&
        [
          '/api/figma/scene',
          '/api/figma/scene/meta',
          '/api/figma/status',
        ].includes(pluginPath);
      if (
        req.headers.host !== `127.0.0.1:${port}` &&
        !(pluginRead && req.headers.host === `localhost:${port}`)
      )
        throw new StudioError(
          'Hôte refusé. Utilisez l’adresse 127.0.0.1 affichée au démarrage.',
          403,
        );
      // Plugin Figma (iframe isolée, origine « null »), avec le code
      // d'appairage privé : lecture de la dernière scène (ou de son en-tête,
      // interrogé en continu) et compte rendu d'import. Rien d'autre.
      if (pluginRead) {
        res.setHeader('Access-Control-Allow-Origin', 'null');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'X-DS-Figma, Content-Type',
        );
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') return void res.writeHead(204).end();
        if (!(await figmaBridge.accept(req.headers['x-ds-figma'])))
          throw new StudioError('Code d’appairage DS-Studio incorrect.', 401);
        figmaBridge.seen();
        if (pluginPath === '/api/figma/status') {
          if (req.method !== 'POST')
            throw new StudioError('Méthode non autorisée.', 405);
          let raw = '';
          for await (const chunk of req) {
            raw += chunk;
            if (raw.length > 4000)
              throw new StudioError('Requête trop volumineuse.', 413);
          }
          return send(200, figmaBridge.report(JSON.parse(raw || '{}')));
        }
        if (req.method !== 'GET')
          throw new StudioError('Méthode non autorisée.', 405);
        if (pluginPath === '/api/figma/scene/meta') {
          const s = await figmaBridge.get();
          return send(
            200,
            s
              ? { screenId: s.screenId, name: s.name, createdAt: s.createdAt }
              : null,
          );
        }
        const scene = await figmaBridge.get();
        if (!scene)
          throw new StudioError(
            'Aucun écran envoyé : dans DS-Studio, Enregistrer → Figma.',
            404,
          );
        return send(200, scene);
      }
      if (req.headers.origin && req.headers.origin !== origin)
        throw new StudioError('Origine non autorisée.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site')
        throw new StudioError('Requête externe refusée.', 403);
      const url = new URL(req.url ?? '/', origin);
      if (url.pathname.startsWith('/_studio/')) {
        const control = options.control;
        if (
          !control ||
          req.headers['x-studio-control'] !== control.record.token
        )
          throw new StudioError('Contrôle privé refusé.', 403);
        const { token: _token, ...identity } = control.record;
        if (url.pathname === '/_studio/health' && req.method === 'GET')
          return send(200, identity);
        if (url.pathname === '/_studio/stop' && req.method === 'POST') {
          send(200, identity);
          setImmediate(control.stop);
          return;
        }
        throw new StudioError('Route inconnue.', 404);
      }
      if (url.pathname.startsWith('/api/')) {
        if (req.method === 'GET') {
          if (url.pathname === '/api/bootstrap')
            return send(200, {
              csrf,
              figma: figmaStatus,
              agents: [],
            });
          if (url.pathname === '/api/agents')
            return send(
              200,
              await Promise.all(
                Object.values(adapters).map(async (a) => ({
                  id: a.id,
                  ...(await a.status()),
                })),
              ),
            );
          if (url.pathname === '/api/project')
            return send(200, await project.read());
          if (url.pathname === '/api/tasks')
            return send(200, await tasks.read());
          if (url.pathname === '/api/v3/data')
            return send(200, await userData.read());
          if (url.pathname === '/api/assistant') {
            const { sources } = await buildContext({
              root,
              tokens: store.snapshot().tokens,
              tasks: await tasks.read(),
              project: (await project.read()).project,
            });
            return send(200, {
              status: await assistant.status(),
              model: await chat.model(),
              models: claudeModels.map(({ id, label }) => ({ id, label })),
              limits: assistantLimits,
              sources,
              messages: await chat.read(),
            });
          }
          if (url.pathname === '/api/compositions')
            return send(200, {
              compositions: await compositions.read(),
              composer: await composer.status(),
              model: await chat.model(),
            });
          if (url.pathname === '/api/state') return send(200, store.snapshot());
          if (url.pathname === '/api/figma/status')
            return send(200, await figmaBridge.status());
          if (url.pathname === '/api/export')
            return send(200, store.snapshot().tokens);
          if (url.pathname === '/api/carte/situation')
            return send(
              200,
              await carteData.situation(url.searchParams.get('force') === '1'),
            );
          if (url.pathname === '/api/carte/seismes')
            return send(200, await external(() => carteData.seismes()));
          if (url.pathname === '/api/carte/commune')
            return send(
              200,
              await external(() =>
                carteData.commune(url.searchParams.get('insee') ?? ''),
              ),
            );
          throw new StudioError('Route inconnue.', 404);
        }
        if (req.method !== 'POST')
          throw new StudioError('Méthode non autorisée.', 405);
        if (req.headers['x-ds-studio'] !== csrf)
          throw new StudioError(
            'Validation de session manquante. Rechargez la page.',
            403,
          );
        if (!req.headers['content-type']?.startsWith('application/json'))
          throw new StudioError('JSON requis.', 415);
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (
            size > (url.pathname === '/api/figma/scene' ? 4_000_000 : 128_000)
          )
            throw new StudioError('Requête trop volumineuse.', 413);
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          throw new StudioError('JSON invalide.');
        }
        if (url.pathname === '/api/project') {
          const b = z
            .object({ base: z.string().max(64), project: projectSchema })
            .strict()
            .parse(body);
          return send(200, await project.save(b.base, b.project));
        }
        if (url.pathname === '/api/v3/data') {
          const b = userDataUpdate.parse(body);
          return send(200, await userData.set(b.key, b.value));
        }
        if (url.pathname === '/api/tasks') {
          const b = taskUpdateSchema.parse(body);
          return send(200, await tasks.set(b.id, b.status));
        }
        if (url.pathname === '/api/proposals') {
          const b = proposeSchema.parse(body);
          return send(200, store.propose(b.revision, b.changes));
        }
        if (url.pathname === '/api/import') {
          const b = z
            .object({
              revision: z.number().int().nonnegative(),
              tokens: z.unknown(),
            })
            .strict()
            .parse(body);
          return send(200, store.proposeImport(b.revision, b.tokens));
        }
        if (url.pathname === '/api/undo') {
          const b = z
            .object({
              revision: z.number().int().nonnegative(),
              id: z.string().uuid(),
            })
            .strict()
            .parse(body);
          return send(200, store.proposeUndo(b.revision, b.id));
        }
        if (url.pathname === '/api/commit') {
          const b = z.object({ id: z.string().uuid() }).strict().parse(body);
          return send(200, await store.commit(b.id));
        }
        if (url.pathname === '/api/agent') {
          const b = z
            .object({
              agent: z.enum(['codex', 'claude', 'gemini']),
              message: z.string().trim().min(1).max(8000),
              revision: z.number().int().nonnegative(),
              history: z
                .array(
                  z
                    .object({
                      role: z.enum(['user', 'assistant']),
                      text: z.string().max(12000),
                    })
                    .strict(),
                )
                .max(10),
            })
            .strict()
            .parse(body);
          if (b.revision !== store.snapshot().revision)
            throw new StudioError(
              'DS modifié depuis votre dernier affichage. Réessayez.',
              409,
            );
          if (busy)
            throw new StudioError('Une demande IA est déjà en cours.', 429);
          busy = true;
          const controller = new AbortController();
          active.add(controller);
          const cancel = () => controller.abort();
          res.once('close', cancel);
          try {
            const context = async (name: string) => {
              const file = path.join(root, 'workspace', name);
              const stat = await fs.lstat(file);
              if (stat.isSymbolicLink() || stat.size > 32_000)
                throw new StudioError(
                  `Contexte ${name} refusé (lien ou taille).`,
                );
              return fs.readFile(file, 'utf8');
            };
            const reply = await adapters[b.agent].reply(
              b.message,
              {
                tokens: store.snapshot().tokens,
                brief:
                  (await context('PFE.md')) +
                  '\nBrief privé DS-Studio :\n' +
                  JSON.stringify((await project.read()).project),
                rules: await context('DESIGN_RULES.md'),
                history: b.history,
              },
              controller.signal,
            );
            const proposal = reply.changes.length
              ? store.propose(b.revision, reply.changes, 'codex')
              : null;
            return send(200, { message: reply.message, proposal });
          } finally {
            busy = false;
            active.delete(controller);
            res.off('close', cancel);
          }
        }
        if (url.pathname === '/api/compositions') {
          const b = z
            .object({ composition: compositionSchema })
            .strict()
            .parse(body);
          return send(200, {
            compositions: await compositions.save(b.composition),
          });
        }
        if (url.pathname === '/api/compositions/delete') {
          const b = z
            .object({ id: z.string().max(32) })
            .strict()
            .parse(body);
          return send(200, { compositions: await compositions.remove(b.id) });
        }
        // Adresse : corps de requête (jamais dans l'URL ni les journaux).
        // Position : corps de requête (jamais dans l'URL ni les journaux).
        if (url.pathname === '/api/carte/reverse') {
          const b = z
            .object({ lat: z.number(), lon: z.number() })
            .strict()
            .parse(body);
          return send(
            200,
            await external(() => carteData.reverse(b.lat, b.lon)),
          );
        }
        if (url.pathname === '/api/carte/geocode')
          return send(
            200,
            await external(() =>
              carteData.geocode(
                z.object({ q: z.string() }).strict().parse(body).q,
              ),
            ),
          );
        if (url.pathname === '/api/figma/scene') {
          const scene = await figmaBridge.put(
            z.object({ scene: z.unknown() }).strict().parse(body).scene,
          );
          return send(200, {
            pairing: await figmaBridge.pairing(),
            nodes: JSON.stringify(scene.root).match(/"type":/g)?.length ?? 0,
            warnings: scene.warnings,
          });
        }
        if (url.pathname === '/api/compose') {
          const b = z
            .object({
              message: z.string().trim().min(1).max(4000),
              composition: compositionSchema,
              history: z
                .array(
                  z
                    .object({
                      role: z.enum(['user', 'assistant']),
                      text: z.string().max(4000),
                    })
                    .strict(),
                )
                .max(10),
            })
            .strict()
            .parse(body);
          const ready = await composer.status();
          if (!ready.available) throw new StudioError(ready.detail, 503);
          if (chatBusy)
            throw new StudioError('Une réponse de Claude est en cours.', 429);
          chatBusy = true;
          const controller = new AbortController();
          active.add(controller);
          const cancel = () => controller.abort();
          res.once('close', cancel);
          // Flux NDJSON si le client le demande : statuts et début de réponse
          // en direct, puis le résultat ({ type: 'done' }) ou l'erreur.
          const streaming = (req.headers.accept ?? '').includes(
            'application/x-ndjson',
          );
          const line = (v: unknown) => {
            if (!res.headersSent)
              res.writeHead(200, {
                'Content-Type': 'application/x-ndjson; charset=utf-8',
              });
            if (!res.destroyed) res.write(JSON.stringify(v) + '\n');
          };
          try {
            const history = [...b.history];
            while (history[0]?.role === 'assistant') history.shift();
            const result = await composer.compose(
              composeSystem(),
              [
                ...history,
                {
                  role: 'user',
                  text: composeTurn(b.composition, b.message),
                },
              ],
              controller.signal,
              await chat.model(),
              streaming ? (p) => line({ type: 'progress', ...p }) : undefined,
            );
            if (!result.output)
              throw new StudioError(
                result.stopReason === 'refusal'
                  ? 'Claude a décliné cette demande.'
                  : result.stopReason === 'max_tokens'
                    ? 'Réponse trop longue : simplifiez la demande.'
                    : 'Réponse de Claude illisible. Reformulez la demande.',
                502,
              );
            // Proposition seulement : rien n'est enregistré ici.
            const proposal = result.output.needsInput
              ? null
              : normalizeComposition(
                  {
                    ...b.composition,
                    sections: result.output.sections,
                  },
                  b.composition,
                )!;
            const changes = proposal
              ? describeChanges(b.composition, proposal)
              : [];
            const payload = {
              reply: result.output.reply.slice(0, 2000),
              question: result.output.needsInput,
              proposal: changes.length ? proposal : null,
              changes,
              usage: result.usage,
            };
            if (!streaming) return send(200, payload);
            line({ type: 'done', ...payload });
            return void res.end();
          } catch (e) {
            const error =
              e instanceof StudioError
                ? e
                : new StudioError(describeAssistantError(e), 502);
            if (!streaming) throw error;
            line({ type: 'error', error: error.message });
            return void res.end();
          } finally {
            chatBusy = false;
            active.delete(controller);
            res.off('close', cancel);
          }
        }
        if (url.pathname === '/api/assistant/model') {
          const b = z
            .object({ model: z.enum(claudeModelIds) })
            .strict()
            .parse(body);
          if (chatBusy) throw new StudioError('Une réponse est en cours.', 429);
          return send(200, { model: await chat.setModel(b.model) });
        }
        if (url.pathname === '/api/assistant/clear') {
          z.object({}).strict().parse(body);
          if (chatBusy) throw new StudioError('Une réponse est en cours.', 429);
          return send(200, { messages: await chat.clear() });
        }
        if (url.pathname === '/api/assistant') {
          const b = z
            .object({
              message: z
                .string()
                .trim()
                .min(1)
                .max(assistantLimits.messageChars),
              page: z.enum(pageKeys).optional(),
            })
            .strict()
            .parse(body);
          if (!(await assistant.status()).available)
            throw new StudioError(
              'Assistant indisponible : clé API Anthropic non configurée.',
              503,
            );
          if (chatBusy)
            throw new StudioError('Une réponse est déjà en cours.', 429);
          chatBusy = true;
          const controller = new AbortController();
          active.add(controller);
          const cancel = () => controller.abort();
          res.once('close', cancel);
          const asked = { role: 'user', text: b.message } as const;
          let text = '';
          try {
            const history = (await chat.read())
              .filter((m) => m.text)
              .slice(-assistantLimits.historyMessages)
              .map(({ role, text }) => ({ role, text }));
            while (history[0]?.role === 'assistant') history.shift();
            const { system, sources } = await buildContext({
              root,
              tokens: store.snapshot().tokens,
              tasks: await tasks.read(),
              project: (await project.read()).project,
            });
            res.writeHead(200, {
              'Content-Type': 'application/x-ndjson; charset=utf-8',
            });
            const line = (value: unknown) =>
              res.write(JSON.stringify(value) + '\n');
            line({ type: 'start', sources });
            let usage: { input: number; output: number } | undefined;
            let stopReason: string | null = null;
            for await (const event of assistant.stream(
              system,
              [
                ...history,
                // Page affichée : précisée à Claude, absente de l'historique.
                b.page
                  ? {
                      ...asked,
                      text: `[Page affichée dans DS-Studio : ${pageLabels[b.page]}]\n\n${asked.text}`,
                    }
                  : asked,
              ],
              controller.signal,
              await chat.model(),
            )) {
              if (event.type === 'text') {
                text += event.text;
                line(event);
              } else {
                usage = event.usage;
                stopReason = event.stopReason;
              }
            }
            const notice =
              stopReason === 'max_tokens'
                ? `Réponse tronquée : limite de ${assistantLimits.maxOutputTokens} tokens atteinte.`
                : stopReason === 'refusal'
                  ? 'Claude a décliné cette demande.'
                  : undefined;
            const date = new Date().toISOString();
            const messages = await chat.append(
              { ...asked, date },
              { role: 'assistant', text, date, usage, error: notice },
            );
            line({ type: 'done', usage, notice, messages });
          } catch (e) {
            const error = describeAssistantError(e);
            if (text) {
              const date = new Date().toISOString();
              await chat.append(
                { ...asked, date },
                { role: 'assistant', text, date, error },
              );
            }
            if (res.headersSent)
              res.write(JSON.stringify({ type: 'error', error }) + '\n');
            else throw new StudioError(error, 502);
          } finally {
            chatBusy = false;
            active.delete(controller);
            res.off('close', cancel);
            if (res.headersSent) res.end();
          }
          return;
        }
        throw new StudioError('Route inconnue.', 404);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD')
        throw new StudioError('Méthode non autorisée.', 405);
      if (vite) {
        const allowed = [
          '/app/client/',
          '/app/v3/',
          '/app/shared/',
          '/pfe-mobile/',
          '/node_modules/',
          '/@vite/',
          '/@id/',
        ];
        // Application PFE autonome (HMR en développement).
        if (url.pathname === '/pfe' || url.pathname === '/pfe/')
          req.url = '/pfe-mobile/index.html';
        else if (
          url.pathname !== '/' &&
          url.pathname !== '/index.html' &&
          url.pathname !== '/v3.html' &&
          !allowed.some((prefix) => url.pathname.startsWith(prefix))
        )
          throw new StudioError('Source privée non distribuée.', 403);
        vite.middlewares(req, res);
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('..') || pathname.includes('\\'))
        throw new StudioError('Chemin refusé.', 403);
      let file: string;
      if (pathname.startsWith('/assets/'))
        file = path.join(root, 'dist', pathname);
      // Interface v3 au lancement ; l'interface précédente (et sa route
      // d'aperçu ?preview=1) reste servie sur /index.html.
      else if (
        pathname === '/' ||
        pathname === '/v3' ||
        pathname === '/v3.html'
      )
        file = path.join(root, 'dist', 'v3.html');
      else if (pathname === '/index.html')
        file = path.join(root, 'dist', 'index.html');
      else if (pathname === '/pfe' || pathname === '/pfe/')
        file = path.join(root, 'dist', 'pfe-mobile', 'index.html');
      else throw new StudioError('Fichier introuvable.', 404);
      const data = await fs.readFile(file);
      const ext = path.extname(file);
      res.setHeader(
        'Content-Type',
        (
          {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.woff2': 'font/woff2',
          } as Record<string, string>
        )[ext] ?? 'application/octet-stream',
      );
      res.end(data);
    } catch (error) {
      if (error instanceof z.ZodError)
        return send(400, {
          error:
            'Données invalides : ' +
            error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; '),
        });
      if (error instanceof StudioError)
        return send(error.status, { error: error.message });
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return send(404, {
          error: 'Fichier introuvable. Exécutez npm run build avant npm start.',
        });
      return send(500, { error: urlSafeMessage(error) });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return {
    server,
    close: async () => {
      for (const c of active) c.abort();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await vite?.close();
    },
  };
}
function urlSafeMessage(error: unknown) {
  // Les erreurs agent sont rédigées dans l'adaptateur, jamais de stderr brut ni de stack.
  const message = (error as Error).message ?? '';
  if (
    /^(CLI |Codex |Version non|Échec Codex|Délai CLI|Demande interrompue|Le CLI|Réponse CLI|claude non|gemini non|Impossible de démarrer)/.test(
      message,
    )
  )
    return message;
  return 'Opération impossible. Aucune validation automatique. Vérifiez les données et relancez si nécessaire.';
}

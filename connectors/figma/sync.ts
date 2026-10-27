import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  tokenKeys,
  tokensSchema,
  applyChanges,
  type TokenKey,
  type TokenValue,
  type Tokens,
} from '../../app/shared/model.js';

// Fonctions pures : aucune connexion Figma ici. Les lectures et écritures passent
// par le MCP officiel d'un client autorisé (skill figma-sync), jamais par ce code.
export const localComponents = [
  'Button',
  'BookingCard',
  'ExampleForm',
  'Navigation',
] as const;
const fileKey = z.string().regex(/^[A-Za-z0-9]{10,64}$/, 'fileKey invalide');
const nodeId = z.string().regex(/^\d+[:-]\d+$/, 'nodeId attendu : 12:34');
const figmaName = z.string().min(1).max(200);

export const figmaConfigSchema = z
  .object({
    fileKey,
    nodeId,
    variables: z.record(
      figmaName,
      z.enum(tokenKeys as [TokenKey, ...TokenKey[]]),
    ),
    components: z.record(figmaName, z.enum(localComponents)).default({}),
  })
  .strict()
  .refine(
    (c) =>
      new Set(Object.values(c.variables)).size ===
      Object.values(c.variables).length,
    'Un token local ne peut être relié qu’à une seule variable Figma.',
  );
export type FigmaConfig = z.infer<typeof figmaConfigSchema>;

export const figmaSnapshotSchema = z
  .object({
    fileKey,
    nodeId,
    readAt: z.string().datetime(),
    variables: z.record(
      figmaName,
      z.union([z.string().max(200), z.number().finite()]),
    ),
    components: z.array(figmaName).max(1000).default([]),
  })
  .strict();
export type FigmaSnapshot = z.infer<typeof figmaSnapshotSchema>;

// Convertit une valeur lue dans Figma vers le format local, sans deviner.
export function normalize(
  key: TokenKey,
  raw: string | number,
): { value: TokenValue } | { error: string } {
  const type = tokensSchema.shape[key].shape.$type.value;
  if (type === 'color') {
    const match =
      typeof raw === 'string' &&
      /^#([0-9a-fA-F]{6})(?:[fF]{2})?$/.exec(raw.trim());
    return match
      ? { value: `#${match[1].toUpperCase()}` }
      : { error: 'Couleur #RRGGBB opaque attendue' };
  }
  if (type === 'dimension') {
    const n =
      typeof raw === 'number'
        ? raw
        : Number(/^(\d+(?:\.\d+)?)(px)?$/.exec(raw.trim())?.[1]);
    return Number.isFinite(n) && n >= 0 && n <= 128
      ? { value: n }
      : { error: 'Dimension 0–128 px attendue' };
  }
  const family = String(raw).trim();
  const allowed = tokensSchema.shape[key].shape.$value as z.ZodEnum;
  return allowed.safeParse(family).success
    ? { value: family }
    : { error: 'Famille hors liste locale' };
}

export interface TokenRow {
  key: TokenKey;
  figmaName: string;
  local: TokenValue;
  figma?: TokenValue | string | number;
  status: 'same' | 'different' | 'missing' | 'invalid';
  error?: string;
}
export interface Report {
  fileKey: string;
  nodeId: string;
  readAt: string;
  tokens: TokenRow[];
  unmappedFigma: string[];
  components: {
    matched: string[];
    missingInFigma: string[];
    unmappedFigma: string[];
  };
}

export function assertTarget(config: FigmaConfig, snapshot: FigmaSnapshot) {
  if (
    snapshot.fileKey !== config.fileKey ||
    snapshot.nodeId.replace('-', ':') !== config.nodeId.replace('-', ':')
  )
    throw new Error(
      'Cible refusée : la lecture ne vient pas du fichier/nœud autorisé.',
    );
}

export function compare(
  config: FigmaConfig,
  snapshot: FigmaSnapshot,
  tokens: Tokens,
): Report {
  assertTarget(config, snapshot);
  const rows = Object.entries(config.variables).map(([name, key]): TokenRow => {
    const local = tokens[key].$value;
    if (!(name in snapshot.variables))
      return { key, figmaName: name, local, status: 'missing' };
    const raw = snapshot.variables[name];
    const result = normalize(key, raw);
    if ('error' in result)
      return {
        key,
        figmaName: name,
        local,
        figma: raw,
        status: 'invalid',
        error: result.error,
      };
    return {
      key,
      figmaName: name,
      local,
      figma: result.value,
      status: result.value === local ? 'same' : 'different',
    };
  });
  const mappedComponents = Object.keys(config.components);
  return {
    fileKey: config.fileKey,
    nodeId: config.nodeId,
    readAt: snapshot.readAt,
    tokens: rows,
    unmappedFigma: Object.keys(snapshot.variables).filter(
      (n) => !(n in config.variables),
    ),
    components: {
      matched: mappedComponents.filter((n) => snapshot.components.includes(n)),
      missingInFigma: mappedComponents.filter(
        (n) => !snapshot.components.includes(n),
      ),
      unmappedFigma: snapshot.components.filter(
        (n) => !mappedComponents.includes(n),
      ),
    },
  };
}

// Figma → DS-Studio : un fichier complet à importer par l'interface (diff + validation).
export function pullTokens(report: Report, tokens: Tokens): Tokens {
  return applyChanges(
    tokens,
    report.tokens
      .filter((r) => r.status === 'different')
      .map((r) => ({ key: r.key, value: r.figma as TokenValue })),
  );
}

export interface PushPlan {
  fileKey: string;
  nodeId: string;
  basedOn: string;
  changes: {
    figmaName: string;
    key: TokenKey;
    from: TokenValue;
    to: TokenValue;
  }[];
  hash: string;
}

// DS-Studio → Figma : plan borné, lié à la cible et à la lecture par un hash.
export function pushPlan(report: Report): PushPlan {
  const body = {
    fileKey: report.fileKey,
    nodeId: report.nodeId,
    basedOn: report.readAt,
    changes: report.tokens
      .filter((r) => r.status === 'different')
      .map((r) => ({
        figmaName: r.figmaName,
        key: r.key,
        from: r.figma as TokenValue,
        to: r.local,
      })),
  };
  return { ...body, hash: planHash(body) };
}
export function planHash(body: Omit<PushPlan, 'hash'>) {
  return createHash('sha256')
    .update(
      JSON.stringify([body.fileKey, body.nodeId, body.basedOn, body.changes]),
    )
    .digest('hex')
    .slice(0, 16);
}

// Avant écriture : Figma doit encore valoir `from`. Après : il doit valoir `to`.
export function verify(
  plan: PushPlan,
  config: FigmaConfig,
  snapshot: FigmaSnapshot,
  phase: 'before' | 'after',
): string[] {
  if (planHash(plan) !== plan.hash) return ['Plan modifié : hash invalide.'];
  assertTarget(config, snapshot);
  if (plan.fileKey !== config.fileKey) return ['Plan hors cible autorisée.'];
  return plan.changes.flatMap((c) => {
    const raw = snapshot.variables[c.figmaName];
    const read = raw === undefined ? undefined : normalize(c.key, raw);
    const value = read && 'value' in read ? read.value : raw;
    const expected = phase === 'before' ? c.from : c.to;
    return value === expected
      ? []
      : [`${c.figmaName} : attendu ${expected}, lu ${value ?? 'absent'}`];
  });
}

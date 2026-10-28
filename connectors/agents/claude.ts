import Anthropic from '@anthropic-ai/sdk';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { readPrivate } from '../../app/server/files.js';
import {
  composeOutputSchema,
  type ComposeOutput,
} from '../../app/shared/composition.js';

// Assistant Claude en lecture seule : aucun outil, aucune écriture. La clé reste
// côté serveur (variable d'environnement ou .env ignoré par Git), jamais renvoyée.
// Modèles actuels de l'API Anthropic. Le repli serveur (`fallbacks`) n'existe
// pas pour Haiku : il n'est envoyé qu'aux modèles qui l'acceptent.
export const claudeModels = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', fallback: true },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', fallback: true },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', fallback: false },
] as const;
export type ClaudeModel = (typeof claudeModels)[number]['id'];
export const claudeModelIds = claudeModels.map((m) => m.id) as [
  ClaudeModel,
  ...ClaudeModel[],
];
export const DEFAULT_MODEL: ClaudeModel = 'claude-opus-5-5';
export const assistantLimits = {
  maxOutputTokens: 8000,
  historyMessages: 20,
  messageChars: 8000,
} as const;

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}
export type AssistantEvent =
  | { type: 'text'; text: string }
  | {
      type: 'done';
      stopReason: string | null;
      usage: { input: number; output: number };
    };
export interface Assistant {
  status(): Promise<{ available: boolean; detail: string }>;
  stream(
    system: string,
    turns: ChatTurn[],
    signal: AbortSignal,
    model: ClaudeModel,
  ): AsyncGenerator<AssistantEvent>;
}

// Avancement d'une composition : statut et début de la réponse.
export type ComposeProgress = { status?: string; reply?: string };
// Composition de page : sortie JSON structurée, validée ensuite côté serveur.
export interface Composer {
  status(): Promise<{ available: boolean; detail: string }>;
  compose(
    system: string,
    turns: ChatTurn[],
    signal: AbortSignal,
    model: ClaudeModel,
    onProgress?: (p: ComposeProgress) => void,
  ): Promise<{
    output: ComposeOutput | null;
    stopReason: string | null;
    usage: { input: number; output: number };
  }>;
}

export async function readApiKey(root: string) {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    return parseEnv(await readPrivate(path.join(root, '.env'), 16000))
      .ANTHROPIC_API_KEY;
  } catch {
    return undefined;
  }
}

export class ClaudeAssistant implements Assistant, Composer {
  constructor(
    private root: string,
    private client?: Anthropic,
  ) {}
  async status() {
    return this.client || (await readApiKey(this.root))
      ? {
          available: true,
          detail: 'Connecté à l’API Anthropic depuis le serveur local.',
        }
      : {
          available: false,
          detail:
            'Clé API absente : ajoutez ANTHROPIC_API_KEY dans .env (ignoré par Git) puis rechargez la page.',
        };
  }
  async *stream(
    system: string,
    turns: ChatTurn[],
    signal: AbortSignal,
    model: ClaudeModel,
  ) {
    const fallback = claudeModels.find((m) => m.id === model)?.fallback;
    const client =
      this.client ??
      new Anthropic({ apiKey: await readApiKey(this.root), maxRetries: 1 });
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: assistantLimits.maxOutputTokens,
        output_config: { effort: 'medium' },
        // Repli serveur si le modèle décline une demande (Opus, Sonnet).
        ...(fallback
          ? {
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default' as const,
            }
          : {}),
        system: [
          { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        ],
        messages: turns.map((t) => ({ role: t.role, content: t.text })),
      },
      { signal },
    );
    for await (const event of stream)
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      )
        yield { type: 'text', text: event.delta.text } as const;
    const final = await stream.finalMessage();
    yield {
      type: 'done',
      stopReason: final.stop_reason,
      usage: usageOf(final.usage),
    } as const;
  }
  async compose(
    system: string,
    turns: ChatTurn[],
    signal: AbortSignal,
    model: ClaudeModel,
  ) {
    const client =
      this.client ??
      new Anthropic({ apiKey: await readApiKey(this.root), maxRetries: 1 });
    const stream = client.messages.stream(
      {
        model,
        max_tokens: assistantLimits.maxOutputTokens,
        output_config: {
          effort: 'medium',
          format: zodOutputFormat(composeOutputSchema),
        },
        system: [
          { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        ],
        messages: turns.map((t) => ({ role: t.role, content: t.text })),
      },
      { signal },
    );
    const final = await stream.finalMessage();
    const text = final.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');
    let output: ComposeOutput | null = null;
    try {
      const parsed = composeOutputSchema.safeParse(JSON.parse(text));
      if (parsed.success) output = parsed.data;
    } catch {
      /* Réponse tronquée ou refus : traité par l'appelant. */
    }
    return {
      output,
      stopReason: final.stop_reason,
      usage: usageOf(final.usage),
    };
  }
}

function usageOf(usage: Anthropic.Usage) {
  return {
    input:
      usage.input_tokens +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0),
    output: usage.output_tokens,
  };
}

// Messages d'erreur lisibles, sans détail technique ni secret.
export function describeAssistantError(error: unknown) {
  if (error instanceof Anthropic.APIUserAbortError)
    return 'Réponse interrompue.';
  if (error instanceof Anthropic.AuthenticationError)
    return 'Clé API refusée par Anthropic. Vérifiez ANTHROPIC_API_KEY dans .env.';
  if (error instanceof Anthropic.PermissionDeniedError)
    return 'Accès refusé pour ce modèle avec cette clé.';
  if (error instanceof Anthropic.RateLimitError)
    return 'Limite d’utilisation atteinte. Réessayez dans un moment.';
  if (error instanceof Anthropic.BadRequestError)
    return 'Requête refusée (conversation trop longue ?). Effacez l’historique puis réessayez.';
  if (error instanceof Anthropic.APIConnectionError)
    return 'Connexion à l’API Anthropic impossible. Vérifiez Internet.';
  if (error instanceof Anthropic.APIError)
    return `Service Anthropic indisponible (${error.status ?? 'erreur'}). Réessayez plus tard.`;
  // Passerelle Claude Code : messages déjà rédigés pour l'utilisatrice.
  if (error instanceof Error && error.name === 'ClaudeCliError')
    return error.message;
  return 'Erreur inattendue de l’assistant.';
}

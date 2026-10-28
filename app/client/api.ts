import type { State, Proposal, Tokens } from '../shared/model.js';
export interface Bootstrap {
  csrf: string;
  figma: { label: string; connected: boolean };
  agents: { id: string; available: boolean; detail: string }[];
}
let csrf = '';
export async function request<T>(
  url: string,
  body?: unknown,
  signal?: AbortSignal,
  retrySession = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${url}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers:
        body === undefined
          ? {}
          : { 'Content-Type': 'application/json', 'X-DS-Studio': csrf },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error(
      'Serveur local inaccessible. Relancez DS-Studio depuis son panneau. Votre dernière validation reste sur disque.',
    );
  }
  const result = await response.json();
  if (
    response.status === 403 &&
    body !== undefined &&
    retrySession &&
    result.error?.startsWith('Validation de session manquante')
  ) {
    await bootstrap();
    return request<T>(url, body, signal, false);
  }
  if (!response.ok)
    throw new Error(result.error ?? 'Le serveur ne répond pas.');
  return result;
}
// Réponse en flux NDJSON : chaque ligne d'avancement est transmise à
// onLine ; renvoie la ligne finale { type: 'done' } (erreur sinon).
export async function requestStream<T>(
  url: string,
  body: unknown,
  onLine: (line: Record<string, unknown>) => void,
  signal?: AbortSignal,
  retrySession = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        'X-DS-Studio': csrf,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error('Serveur local inaccessible.');
  }
  if (!(response.headers.get('Content-Type') ?? '').includes('ndjson')) {
    const result = await response.json();
    if (
      response.status === 403 &&
      retrySession &&
      result.error?.startsWith('Validation de session manquante')
    ) {
      await bootstrap();
      return requestStream<T>(url, body, onLine, signal, false);
    }
    if (!response.ok)
      throw new Error(result.error ?? 'Le serveur ne répond pas.');
    return result;
  }
  const reader = response
    .body!.pipeThrough(new TextDecoderStream())
    .getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop()!;
    for (const raw of lines) {
      if (!raw.trim()) continue;
      const line = JSON.parse(raw) as Record<string, unknown>;
      if (line.type === 'done') return line as T;
      if (line.type === 'error') throw new Error(String(line.error));
      onLine(line);
    }
  }
  throw new Error('Réponse interrompue.');
}
export async function bootstrap() {
  const b = await request<Bootstrap>('bootstrap');
  csrf = b.csrf;
  return b;
}
export const getState = () => request<State>('state');
export const commit = (proposal: Proposal) =>
  request<State>('commit', { id: proposal.id });
export async function exportTokens() {
  const tokens = await request<Tokens>('export');
  downloadText(
    'design-system.tokens.json',
    JSON.stringify(tokens, null, 2) + '\n',
    'application/json',
  );
}
export function downloadText(
  name: string,
  text: string,
  type = 'text/markdown',
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
// Flux NDJSON (une ligne JSON par événement) pour les réponses de l'assistant.
export async function* postStream<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
  retrySession = true,
): AsyncGenerator<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DS-Studio': csrf },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error('Serveur local inaccessible. Relancez DS-Studio.');
  }
  if (!response.ok || !response.body) {
    const result = await response.json().catch(() => ({}));
    if (
      response.status === 403 &&
      retrySession &&
      result.error?.startsWith('Validation de session manquante')
    ) {
      await bootstrap();
      yield* postStream<T>(url, body, signal, false);
      return;
    }
    throw new Error(result.error ?? 'Le serveur ne répond pas.');
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as T;
  }
}

import { useEffect, useRef, useState } from 'react';
import { postStream, request } from './api.js';
import Markdown from './Markdown.js';
import { BentoCard } from './ProjectContent.js';
import type { ChatMessage, ContextSource } from '../server/assistant.js';

interface AssistantInfo {
  status: { available: boolean; detail: string };
  model: string;
  limits: {
    maxOutputTokens: number;
    historyMessages: number;
    messageChars: number;
  };
  sources: ContextSource[];
  messages: ChatMessage[];
}
type StreamEvent =
  | { type: 'start'; sources: ContextSource[] }
  | { type: 'text'; text: string }
  | {
      type: 'done';
      notice?: string;
      messages: ChatMessage[];
    }
  | { type: 'error'; error: string };

export default function AssistantPage() {
  const [info, setInfo] = useState<AssistantInfo>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string>();
  const [streaming, setStreaming] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    request<AssistantInfo>('assistant').then(
      (i) => {
        setInfo(i);
        setMessages(i.messages);
      },
      (e: Error) => setError(e.message),
    );
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, streaming, pending]);
  const busy = pending !== undefined;
  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setError('');
    setPending(text);
    setStreaming('');
    const abort = new AbortController();
    controller.current = abort;
    let received = '';
    try {
      for await (const event of postStream<StreamEvent>(
        'assistant',
        { message: text },
        abort.signal,
      )) {
        if (event.type === 'text') {
          received += event.text;
          setStreaming(received);
        } else if (event.type === 'done') {
          setMessages(event.messages);
          setDraft('');
          if (event.notice) setError(event.notice);
        } else if (event.type === 'error') {
          setError(event.error);
          if (received)
            setMessages((m) => [
              ...m,
              { role: 'user', text, date: new Date().toISOString() },
              {
                role: 'assistant',
                text: received,
                date: new Date().toISOString(),
                error: event.error,
              },
            ]);
        }
      }
    } catch (e) {
      setError(
        abort.signal.aborted
          ? 'Réponse interrompue. Votre message reste dans la zone de saisie.'
          : (e as Error).message,
      );
    } finally {
      setPending(undefined);
      setStreaming('');
      controller.current = null;
    }
  }
  async function clear() {
    if (!window.confirm('Effacer tout l’historique de la conversation ?'))
      return;
    try {
      setMessages(
        (await request<{ messages: ChatMessage[] }>('assistant/clear', {}))
          .messages,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const lastUsage = [...messages].reverse().find((m) => m.usage)?.usage;
  const available = info?.status.available ?? false;
  return (
    <section className="assistant-page" aria-labelledby="assistant-title">
      <header className="brief-head">
        <div>
          <h2 id="assistant-title" tabIndex={-1}>
            Contexte & Assistant
          </h2>
          <p>
            Claude consulte votre projet en lecture seule. Rien n’est modifié
            sans votre validation dans DS-Studio.
          </p>
        </div>
        <dl className="brief-kpis">
          <div>
            <dt>Modèle</dt>
            <dd>{info?.model ?? '…'}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>{info ? (available ? 'Connecté' : 'Clé absente') : '…'}</dd>
          </div>
        </dl>
      </header>
      <div className="bento assistant-bento">
        <BentoCard emoji="💬" title="Conversation" className="assistant-chat">
          <div
            className="chat-thread"
            ref={log}
            aria-live="polite"
            aria-busy={busy}
          >
            {!messages.length && !busy && (
              <p className="chat-empty">
                Posez une question sur votre brief, votre planning, vos tâches
                ou votre Design System.
              </p>
            )}
            {messages.map((m, i) => (
              <article key={i} className={`chat-bubble ${m.role}`}>
                <strong>{m.role === 'user' ? 'Vous' : 'Claude'}</strong>
                {m.role === 'user' ? (
                  <p>{m.text}</p>
                ) : (
                  <Markdown text={m.text} />
                )}
                {m.error && <p className="chat-note">{m.error}</p>}
              </article>
            ))}
            {busy && (
              <>
                <article className="chat-bubble user">
                  <strong>Vous</strong>
                  <p>{pending}</p>
                </article>
                <article className="chat-bubble assistant">
                  <strong>Claude</strong>
                  {streaming ? (
                    <Markdown text={streaming} />
                  ) : (
                    <p className="chat-loading" role="status">
                      Claude consulte le contexte…
                    </p>
                  )}
                </article>
              </>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor="assistant-input">
              Votre message
            </label>
            <textarea
              id="assistant-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              maxLength={info?.limits.messageChars ?? 8000}
              rows={3}
              placeholder={
                available
                  ? 'Votre question… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)'
                  : 'Configurez la clé API pour discuter avec Claude.'
              }
              disabled={!available || busy}
            />
            <div className="chat-actions">
              <small>
                {draft.length} / {info?.limits.messageChars ?? 8000}
              </small>
              {busy ? (
                <button
                  type="button"
                  onClick={() => controller.current?.abort()}
                >
                  Arrêter
                </button>
              ) : (
                <button
                  className="studio-primary"
                  disabled={!available || !draft.trim()}
                >
                  Envoyer
                </button>
              )}
            </div>
          </form>
        </BentoCard>
        <BentoCard emoji="📚" title="Contexte consulté">
          <ul className="assistant-sources">
            {info?.sources.map((s) => (
              <li key={s.id} className={s.available ? '' : 'is-missing'}>
                <span aria-hidden="true">{s.available ? '✓' : '–'}</span>{' '}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
                {!s.available && <small> · vide</small>}
              </li>
            ))}
          </ul>
          <p className="bento-summary">
            Lecture seule. Envoyé à Anthropic à chaque question.
          </p>
        </BentoCard>
        <BentoCard emoji="🔐" title="Connexion">
          <p className="bento-summary">{info?.status.detail ?? '…'}</p>
          <p className="chat-note">
            Clé conservée côté serveur, jamais envoyée au navigateur.
          </p>
        </BentoCard>
        <BentoCard emoji="📏" title="Limites">
          <ul className="volcano-kpis">
            <li>
              {info?.limits.maxOutputTokens ?? '…'} tokens max par réponse
            </li>
            <li>{info?.limits.historyMessages ?? '…'} messages de mémoire</li>
            {lastUsage && (
              <li>
                Dernière réponse : {lastUsage.input} entrée · {lastUsage.output}{' '}
                sortie
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => void clear()}
            disabled={busy || !messages.length}
          >
            Effacer l’historique ({messages.length})
          </button>
        </BentoCard>
      </div>
    </section>
  );
}

import { Button } from '@mantine/core';
import { useEffect, useRef } from 'react';
import Markdown from './Markdown.js';
import { useAssistantChat } from './useAssistantChat.js';

// Fil de conversation et saisie, communs à la page Assistant et à la bulle.
export default function ChatConversation({
  inputId,
  compact = false,
  autoFocus = false,
}: {
  inputId: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const chat = useAssistantChat();
  const {
    info,
    messages,
    draft,
    setDraft,
    pending,
    streaming,
    error,
    busy,
    available,
    send,
  } = chat;
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, streaming, pending]);
  return (
    <>
      <div
        className="chat-thread"
        ref={log}
        aria-live="polite"
        aria-busy={busy}
      >
        {!messages.length && !busy && (
          <p className="chat-empty">
            Posez une question sur votre brief, votre planning, vos tâches ou
            votre Design System.
          </p>
        )}
        {messages.map((m, i) => (
          <article key={i} className={`chat-bubble ${m.role}`}>
            <strong>{m.role === 'user' ? 'Vous' : 'Claude'}</strong>
            {m.role === 'user' ? <p>{m.text}</p> : <Markdown text={m.text} />}
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
        <label className="sr-only" htmlFor={inputId}>
          Votre message
        </label>
        <textarea
          id={inputId}
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          maxLength={info?.limits.messageChars ?? 8000}
          rows={compact ? 2 : 3}
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
            <button type="button" onClick={() => chat.stop()}>
              Arrêter
            </button>
          ) : (
            <Button type="submit" disabled={!available || !draft.trim()}>
              Envoyer
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

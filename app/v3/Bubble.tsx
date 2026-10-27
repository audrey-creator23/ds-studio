import { useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import Markdown from '../client/Markdown.js';
import { useAssistantChat } from '../client/useAssistantChat.js';
import { Button } from './ui.js';

// Bulle Claude globale de la v3 : même conversation et même clé (serveur)
// que l'assistant actuel ; la page affichée est transmise à Claude.
export default function Bubble({ pageLabel }: { pageLabel: string }) {
  const chat = useAssistantChat();
  const [open, setOpen] = useState(false);
  const id = useId();
  const log = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat.messages, chat.streaming, open]);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  return (
    <div className="bubble-root">
      {open && (
        <section
          id={id}
          className="bubble-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Chat Claude"
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <div className="panel-head">
            <div>
              <h2>Claude</h2>
              <small className="muted">Contexte : {pageLabel}</small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fermer le chat"
              onClick={close}
            >
              <X size={16} aria-hidden="true" />
            </Button>
          </div>
          <div className="thread" ref={log} aria-live="polite">
            {!chat.messages.length && !chat.busy && (
              <p className="muted">
                Une question sur le brief, le planning ou le Design System ?
              </p>
            )}
            {chat.messages.map((m, i) =>
              m.role === 'user' ? (
                <p key={i} className="msg" data-role="user">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="msg" data-role="assistant">
                  <Markdown text={m.text} />
                </div>
              ),
            )}
            {chat.busy && (
              <>
                <p className="msg" data-role="user">
                  {chat.pending}
                </p>
                <div className="msg" data-role="assistant" role="status">
                  {chat.streaming ? (
                    <Markdown text={chat.streaming} />
                  ) : (
                    <>
                      <span className="typing" aria-hidden="true" /> Claude
                      consulte le contexte…
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {chat.error && (
            <p className="alert" role="alert">
              {chat.error}
            </p>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void chat.send();
            }}
          >
            <label className="sr-only" htmlFor={`${id}-input`}>
              Votre message
            </label>
            <textarea
              id={`${id}-input`}
              className="input"
              rows={2}
              autoFocus
              value={chat.draft}
              disabled={!chat.available || chat.busy}
              maxLength={chat.info?.limits.messageChars ?? 8000}
              placeholder={
                chat.available
                  ? 'Votre question…'
                  : 'Clé API absente (serveur).'
              }
              onChange={(e) => chat.setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void chat.send();
                }
              }}
            />
            <div className="row">
              <small className="muted">Lecture seule · vous validez</small>
              {chat.busy ? (
                <Button variant="outline" size="sm" onClick={chat.stop}>
                  Arrêter
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!chat.available || !chat.draft.trim()}
                >
                  Envoyer
                </Button>
              )}
            </div>
          </form>
        </section>
      )}
      <button
        ref={button}
        type="button"
        className="bubble"
        aria-label={open ? 'Fermer le chat Claude' : 'Ouvrir le chat Claude'}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <MessageCircle size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

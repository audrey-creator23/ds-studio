import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle, X } from 'lucide-react';
import Markdown from '../client/Markdown.js';
import { useAssistantChat } from '../client/useAssistantChat.js';
import { Button } from './ui.js';

// Position du bouton, déplaçable partout dans la fenêtre (glisser ou
// Alt + flèches) et mémorisée ; par défaut en bas à droite.
type Pos = { x: number; y: number };
const KEY = 'ds-v3-bubble-pos';
const SIZE = 48;
const clamp = (p: Pos): Pos => ({
  x: Math.round(Math.min(Math.max(8, p.x), innerWidth - SIZE - 8)),
  y: Math.round(Math.min(Math.max(8, p.y), innerHeight - SIZE - 8)),
});
function readPos(): Pos | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return Number.isFinite(v?.x) && Number.isFinite(v?.y) ? v : null;
  } catch {
    return null;
  }
}

// Bulle Claude globale de la v3 : même conversation et même clé (serveur)
// que l'assistant actuel ; la page affichée est transmise à Claude.
export default function Bubble({ pageLabel }: { pageLabel: string }) {
  const chat = useAssistantChat();
  const [open, setOpen] = useState(false);
  const id = useId();
  const log = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState(readPos);
  // Toujours dans la fenêtre, même après un redimensionnement.
  const [, relayout] = useState(0);
  useEffect(() => {
    const onResize = () => relayout((n) => n + 1);
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);
  const save = (p: Pos) => {
    setPos(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Stockage indisponible : position gardée pour la session.
    }
  };
  // Glisser : au-delà de 4 px, c'est un déplacement, pas un clic.
  const drag = useRef<{ px: number; py: number; from: Pos; moved: boolean }>(
    null,
  );
  const dragged = useRef(false);
  const shown = pos && clamp(pos);
  const W = Math.min(380, innerWidth - 24);
  const above = !shown || shown.y > innerHeight / 2;
  // Fenêtre du chat ancrée au bouton : au-dessus ou en dessous, alignée à
  // droite sur lui, dans la fenêtre.
  const panelStyle: CSSProperties | undefined = shown
    ? {
        left: Math.min(Math.max(12, shown.x + SIZE - W), innerWidth - W - 12),
        right: 'auto',
        ...(above
          ? { bottom: innerHeight - shown.y + 12, top: 'auto' }
          : { top: shown.y + SIZE + 12, bottom: 'auto' }),
        height: Math.min(
          520,
          above ? shown.y - 24 : innerHeight - shown.y - SIZE - 24,
        ),
      }
    : undefined;
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat.messages, chat.streaming, open]);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const trigger = (
    <button
      ref={button}
      type="button"
      className="bubble"
      style={
        shown
          ? { left: shown.x, top: shown.y, right: 'auto', bottom: 'auto' }
          : undefined
      }
      aria-label={open ? 'Fermer le chat Claude' : 'Ouvrir le chat Claude'}
      title="Chat Claude · glisser ou Alt + flèches pour déplacer"
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        drag.current = {
          px: e.clientX,
          py: e.clientY,
          from: { x: r.left, y: r.top },
          moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        d.moved = true;
        setPos(clamp({ x: d.from.x + dx, y: d.from.y + dy }));
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d?.moved) return;
        dragged.current = true;
        const r = e.currentTarget.getBoundingClientRect();
        save({ x: r.left, y: r.top });
      }}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 16;
        const d = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        }[e.key];
        if (!e.altKey || !d) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        save(clamp({ x: r.left + d[0], y: r.top + d[1] }));
      }}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        setOpen(!open);
      }}
    >
      <MessageCircle size={20} aria-hidden="true" />
    </button>
  );
  return (
    <div className="bubble-root">
      {open && (
        <section
          id={id}
          className="bubble-panel"
          style={panelStyle}
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
      {trigger}
    </div>
  );
}

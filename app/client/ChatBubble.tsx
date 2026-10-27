import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  ActionIcon,
  CloseButton,
  Indicator,
  Paper,
  Tooltip,
  Transition,
} from '@mantine/core';
import ChatConversation from './ChatConversation.js';
import { useAssistantChat } from './useAssistantChat.js';
import { pageTitles, type Page } from './Sidebar.js';

// Bulle Claude flottante, présente sur toutes les pages. Déplaçable à la
// souris, au doigt ou au clavier (flèches), position mémorisée et gardée à
// l'écran. Le panneau est compact, non modal, et se ferme avec Échap.
const storageKey = 'ds-studio-bubble-v1';
const SIZE = 52;
const MARGIN = 12;
// Position = distances aux bords droit et bas : la bulle reste dans son coin
// quand la fenêtre change de taille.
type Spot = { right: number; bottom: number };
const initial: Spot = { right: 20, bottom: 20 };

function clamp(spot: Spot): Spot {
  const maxRight = Math.max(MARGIN, innerWidth - SIZE - MARGIN);
  const maxBottom = Math.max(MARGIN, innerHeight - SIZE - MARGIN);
  return {
    right: Math.round(Math.min(Math.max(spot.right, MARGIN), maxRight)),
    bottom: Math.round(Math.min(Math.max(spot.bottom, MARGIN), maxBottom)),
  };
}
function load(): Spot {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Number.isFinite(raw?.right) && Number.isFinite(raw?.bottom))
      return clamp(raw);
  } catch {
    /* Préférence facultative. */
  }
  return clamp(initial);
}

export default function ChatBubble({
  page,
  onPage,
}: {
  page: Page;
  onPage: (page: Page) => void;
}) {
  const chat = useAssistantChat();
  const [spot, setSpot] = useState<Spot>(load);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    from: Spot;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);
  const bubble = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const inputId = useId();

  const save = useCallback((next: Spot) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Préférence facultative. */
    }
  }, []);
  useEffect(() => {
    const onResize = () => setSpot((s) => clamp(s));
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  function close() {
    setOpen(false);
    bubble.current?.focus();
  }
  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, from: spot, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setDragging(true);
    setSpot(clamp({ right: d.from.right - dx, bottom: d.from.bottom - dy }));
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    dragged.current = !!d?.moved;
    if (d?.moved) setSpot((s) => (save(s), s));
  }
  function onClick() {
    // Un glisser n'ouvre pas le panneau.
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setOpen((o) => !o);
  }
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const step = e.shiftKey ? 64 : 16;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (e.key === 'Escape' && open) return close();
    const move = delta[e.key];
    if (!move) return;
    e.preventDefault();
    const next = clamp({
      right: spot.right + move[0],
      bottom: spot.bottom + move[1],
    });
    setSpot(next);
    save(next);
  }

  // Le panneau s'ouvre du côté où il y a de la place.
  const [side, setSide] = useState({ left: false, below: false });
  useLayoutEffect(() => {
    setSide({
      left: spot.right > innerWidth / 2,
      below: spot.bottom > innerHeight / 2,
    });
  }, [spot, open]);

  return (
    <div className="bubble-root">
      <Transition mounted={open} transition="pop" duration={160}>
        {(styles) => (
          <Paper
            id={panelId}
            className="bubble-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Chat Claude"
            shadow="lg"
            radius="md"
            style={{
              ...styles,
              ...(side.left
                ? { left: innerWidth - spot.right - SIZE }
                : { right: spot.right }),
              ...(side.below
                ? { top: innerHeight - spot.bottom + 8 }
                : { bottom: spot.bottom + SIZE + 10 }),
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                close();
              }
            }}
          >
            <header className="bubble-head">
              <div>
                <strong>Claude</strong>
                <small>Contexte : {pageTitles[page]}</small>
              </div>
              <button
                type="button"
                className="bubble-full"
                onClick={() => {
                  setOpen(false);
                  onPage('assistant');
                }}
              >
                Plein écran
              </button>
              <CloseButton
                aria-label="Fermer le chat Claude"
                onClick={close}
                size="md"
              />
            </header>
            <div className="bubble-body">
              <ChatConversation inputId={inputId} compact autoFocus />
            </div>
            {!chat.available && chat.info && (
              <p className="bubble-note">
                {chat.info.status.detail} La clé reste sur le serveur.
              </p>
            )}
          </Paper>
        )}
      </Transition>
      <Tooltip
        label="Chat Claude · glisser ou flèches pour déplacer"
        disabled={open || dragging}
        position="left"
      >
        <Indicator
          processing
          disabled={!chat.busy}
          color="blue"
          size={12}
          offset={6}
          className="bubble-indicator"
          style={{ right: spot.right, bottom: spot.bottom }}
        >
          <ActionIcon
            ref={bubble}
            className={`bubble${dragging ? ' is-dragging' : ''}`}
            size={SIZE}
            radius="xl"
            variant="filled"
            color="neutral"
            aria-label={
              open ? 'Fermer le chat Claude' : 'Ouvrir le chat Claude'
            }
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            <span aria-hidden="true" className="bubble-glyph">
              ✳
            </span>
          </ActionIcon>
        </Indicator>
      </Tooltip>
    </div>
  );
}

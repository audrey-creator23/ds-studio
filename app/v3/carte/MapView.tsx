import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MapIcon, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui.js';
import type { RiskId } from './risks.js';
import type { CarteScene, Hover, Quake, Volcano } from './scene.js';

// Carte 3D partagée (Carte interactive, Prévention & ressources) :
// moteur chargé à l'ouverture, balises suivies par la 3D, survol des
// zones simulées, zoom / rotation / recentrage, clavier, repli sans WebGL.
export type Pin = {
  id: string;
  lat: number;
  lon: number;
  sea?: boolean;
  label: string;
  icon: LucideIcon;
  // Statut affiché (niveau officiel, « Observé », « Non disponible »…).
  status?: string;
  // Couleur de vigilance officielle seulement si publiée.
  level?: 'vert' | 'jaune' | 'orange' | 'rouge' | 'violet' | null;
  kind?: 'home' | 'eye' | 'place';
  // Lieu personnel : pastille de couleur (palette DS), jamais un niveau.
  color?: string;
  onClick?: () => void;
};
export const levelNames = ['faible', 'modéré', 'élevé'];
export const reducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MapView({
  risk,
  effects = true,
  volcano,
  brume = 2,
  cycloneT = null,
  quakes = null,
  pulses = null,
  pins,
  hintLabel,
  onPickZone,
  onCyclone,
  onEngine,
  onPickPoint,
  top,
  bottom,
  fallback,
  children,
}: {
  risk: RiskId | null;
  // Faux : zones seules, sans effet animé de simulation.
  effects?: boolean;
  volcano?: Volcano;
  brume?: 1 | 2 | 3;
  cycloneT?: number | null;
  quakes?: Quake[] | null;
  pulses?: { lat: number; lon: number }[] | null;
  pins: Pin[];
  hintLabel?: string;
  onPickZone?: (h: Hover) => void;
  onCyclone?: (t: number) => void;
  onEngine?: (e: CarteScene | null) => void;
  onPickPoint?: (lat: number, lon: number) => void;
  top?: ReactNode;
  bottom?: ReactNode;
  fallback: ReactNode;
  children?: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<CarteScene>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>(
    'loading',
  );
  const [hover, setHover] = useState<Hover & { x: number; y: number }>();
  // Limites communales officielles (IGN), nom au survol / au toucher.
  const [communes, setCommunes] = useState(false);
  const [commune, setCommune] = useState<{
    nom: string;
    x: number;
    y: number;
  }>();
  // Anti-chevauchement : à chaque image, une étiquette qui en recouvre une
  // plus prioritaire (logement d'abord, puis ordre des balises) s'efface.
  const pos = useRef(new Map<string, { x: number; y: number; v: boolean }>());
  const sizes = useRef(new Map<string, [number, number]>());
  const order = useRef<string[]>([]);
  order.current = [
    ...pins.filter((p) => p.kind === 'home').map((p) => p.id),
    ...pins.filter((p) => p.kind !== 'home').map((p) => p.id),
  ];
  const pointer = useRef({ x: 0, y: 0 });
  const reduced = useMemo(reducedMotion, []);
  const cb = useRef({ onPickZone, onCyclone, onEngine, onPickPoint });
  cb.current = { onPickZone, onCyclone, onEngine, onPickPoint };

  useEffect(() => {
    let alive = true;
    let made: CarteScene | undefined;
    import('./scene.js')
      .then(({ createScene }) =>
        createScene(host.current!, {
          reduced,
          place(id, x, y, visible) {
            const el = els.current.get(id);
            if (!el) return;
            el.style.transform = `translate(${x}px, ${y}px)`;
            el.hidden = !visible;
            pos.current.set(id, { x, y, v: visible });
          },
          settle() {
            const kept: number[][] = [];
            for (const id of order.current) {
              const el = els.current.get(id);
              const p = pos.current.get(id);
              if (!el || !p?.v) continue;
              let sz = sizes.current.get(id);
              if (!sz || !sz[0]) {
                sz = [el.offsetWidth, el.offsetHeight];
                sizes.current.set(id, sz);
              }
              // Boîte de l'étiquette : centrée, au-dessus du point.
              const b = [
                p.x - sz[0] / 2,
                p.y - sz[1] - 6,
                p.x + sz[0] / 2,
                p.y,
              ];
              const hit = kept.some(
                (k) => b[0] < k[2] && b[2] > k[0] && b[1] < k[3] && b[3] > k[1],
              );
              if (hit) el.dataset.collide = '';
              else {
                delete el.dataset.collide;
                kept.push(b);
              }
            }
          },
          onCommune: (nom) =>
            setCommune(nom ? { nom, ...pointer.current } : undefined),
          onHover: (h) =>
            setHover(h ? { ...h, ...pointer.current } : undefined),
          onPick: (h) => cb.current.onPickZone?.(h),
          onCyclone: (t) => cb.current.onCyclone?.(t),
          onPoint: (lat, lon) => cb.current.onPickPoint?.(lat, lon),
        }),
      )
      .then((s) => {
        made = s;
        if (!alive) return s.dispose();
        engine.current = s;
        (window as unknown as { __carte?: CarteScene }).__carte = s;
        cb.current.onEngine?.(s);
        setState('ready');
      })
      .catch(() => alive && setState('fallback'));
    return () => {
      alive = false;
      made?.dispose();
      engine.current = null;
      cb.current.onEngine?.(null);
    };
  }, [reduced]);

  const pinKey = pins.map((p) => `${p.id}:${p.lat}:${p.lon}`).join('|');
  useEffect(() => {
    const s = engine.current;
    if (!s) return;
    s.setRisk(risk, effects);
    s.setMarkers(pins.map(({ id, lat, lon, sea }) => ({ id, lat, lon, sea })));
    setHover(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk, effects, pinKey, state]);
  useEffect(() => {
    if (volcano) engine.current?.setVolcano(volcano);
  }, [volcano, state]);
  useEffect(() => {
    engine.current?.setBrume(brume);
  }, [brume, state]);
  useEffect(() => {
    engine.current?.setCyclone(cycloneT);
  }, [cycloneT, state]);
  useEffect(() => {
    engine.current?.setQuakes(quakes);
  }, [quakes, state]);
  useEffect(() => {
    engine.current?.setCommunes(communes);
    if (!communes) setCommune(undefined);
  }, [communes, state]);
  useEffect(() => {
    engine.current?.setPulses(pulses);
  }, [pulses, state, risk]);

  const track = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onKey = (e: React.KeyboardEvent) => {
    const s = engine.current;
    if (!s || e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 0.2 : 0.08;
    const act: Record<string, () => void> = {
      ArrowLeft: () => s.orbit(step, 0),
      ArrowRight: () => s.orbit(-step, 0),
      ArrowUp: () => s.orbit(0, -step),
      ArrowDown: () => s.orbit(0, step),
      '+': () => s.zoom(0.85),
      '=': () => s.zoom(0.85),
      '-': () => s.zoom(1.18),
      '0': () => s.reset(),
    };
    if (!act[e.key]) return;
    e.preventDefault();
    act[e.key]();
  };

  return (
    <div className="carte-stage">
      <div
        className="carte-view"
        ref={host}
        tabIndex={0}
        role="application"
        aria-label="Carte 3D. Glisser ou flèches : incliner et tourner. Molette, + ou − : zoom. 0 : recentrer."
        aria-busy={state === 'loading'}
        data-ready={state === 'ready' || undefined}
        onKeyDown={onKey}
        onPointerMove={track}
        // Toucher : pas de survol préalable, position prise à l'appui.
        onPointerDown={track}
      >
        {state === 'loading' && (
          <p className="carte-state" role="status">
            Chargement du relief…
          </p>
        )}
        {state === 'fallback' && <div className="carte-state">{fallback}</div>}
        {pins.map((p) => {
          const Tag = p.onClick ? 'button' : 'span';
          return (
            <Tag
              key={p.id}
              {...(p.onClick
                ? { type: 'button' as const, onClick: p.onClick }
                : {})}
              className={`carte-pin${p.kind ? ` carte-pin--${p.kind}` : ''}`}
              data-level={p.level ?? undefined}
              data-place={p.color ? '' : undefined}
              style={p.color ? { ['--pin' as string]: p.color } : undefined}
              data-status={p.status ? '' : undefined}
              hidden
              title={p.status ? `${p.label} : ${p.status}` : p.label}
              aria-label={
                p.onClick
                  ? `${p.label}${p.status ? ` : ${p.status}` : ''}, ouvrir le détail`
                  : undefined
              }
              ref={(el: HTMLElement | null) => {
                if (el) els.current.set(p.id, el);
                else els.current.delete(p.id);
              }}
            >
              <p.icon size={14} aria-hidden="true" />
              <span>{p.label}</span>
              {p.status && <small>{p.status}</small>}
            </Tag>
          );
        })}
        {communes && commune && !hover && (
          <span
            className="carte-hint carte-hint--commune"
            role="status"
            style={{
              transform: `translate(${commune.x + 14}px, ${commune.y + 14}px)`,
            }}
          >
            {commune.nom}
          </span>
        )}
        {hover && hintLabel && (
          <span
            className="carte-hint"
            style={{
              transform: `translate(${hover.x + 14}px, ${hover.y + 14}px)`,
            }}
            aria-hidden="true"
          >
            <i data-level={hover.level} /> {hintLabel} : zone simulée{' '}
            {levelNames[hover.level - 1]} · {hover.alt} m
          </span>
        )}
      </div>
      <div className="carte-top">
        {top ?? <span />}
        <div className="carte-tools">
          <Button
            variant="outline"
            size="icon"
            className="carte-tool-communes"
            title="Limites des communes"
            aria-label="Limites des communes"
            aria-pressed={communes}
            onClick={() => setCommunes(!communes)}
          >
            <MapIcon size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="carte-tool-nav"
            title="Zoom avant"
            aria-label="Zoom avant"
            onClick={() => engine.current?.zoom(0.85)}
          >
            <ZoomIn size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="carte-tool-nav"
            title="Zoom arrière"
            aria-label="Zoom arrière"
            onClick={() => engine.current?.zoom(1.18)}
          >
            <ZoomOut size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="carte-tool-nav"
            title="Recentrer la vue"
            aria-label="Recentrer la vue"
            onClick={() => engine.current?.reset()}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {bottom && <div className="carte-bottom">{bottom}</div>}
      {children}
    </div>
  );
}

// Fiche compacte (dialogue non modal) : lignes libellé / contenu.
export function FicheView({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: [string, ReactNode][];
  onClose: () => void;
}) {
  return (
    <aside
      className="carte-fiche"
      role="dialog"
      aria-label={`Fiche : ${title}`}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <header>
        <h2>{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fermer la fiche"
          title="Fermer"
          autoFocus
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </header>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

import { Surface } from '../Card.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Tokens } from '../../shared/model.js';
import type { ComponentConfig } from './componentSpecs.js';
import type { Composition } from '../../shared/composition.js';

// Aperçu réel : l'iframe charge les vrais composants React du projet et
// reçoit les tokens du brouillon par postMessage (même origine uniquement).
export const devices = [
  { id: 'iphone', label: 'iPhone · 393 × 852', w: 393, h: 852 },
  { id: 'ipad', label: 'iPad · 820 × 1180', w: 820, h: 1180 },
  { id: 'desktop', label: 'Desktop · 1280 × 800', w: 1280, h: 800 },
  { id: 'compact', label: 'Compact · 320 × 640', w: 320, h: 640 },
] as const;
const breakpoints = [320, 375, 430, 700, 1024];
// Point de rupture réel du scénario (styles.css : @media min-width 700px).
const layoutBreakpoint = 700;
const screens = [
  ['cards', 'Découvrir'],
  ['form', 'Inscription'],
  ['components', 'Composants'],
] as const;
export type Screen = (typeof screens)[number][0];

export default function Simulator({
  draftTokens,
  savedTokens,
  draftCount,
  config,
  screen,
  onScreen,
  compose,
}: {
  draftTokens: Tokens;
  savedTokens: Tokens;
  draftCount: number;
  config: ComponentConfig;
  screen: Screen;
  onScreen: (s: Screen) => void;
  // Mode composition : la page construite remplace les écrans d'exemple.
  compose?: {
    draft: Composition;
    saved?: Composition;
    proposal: boolean;
    dirty: boolean;
    selected?: string;
    onSelect: (id: string) => void;
  };
}) {
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 393,
    h: 852,
  });
  const [device, setDevice] = useState<string>('iphone');
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [version, setVersion] = useState<'draft' | 'saved'>('draft');
  const [space, setSpace] = useState({ w: 600, h: 700 });
  const [interact, setInteract] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(([e]) =>
      setSpace({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale =
    zoom === 'fit'
      ? Math.min(1, (space.w - 24) / size.w, (space.h - 24) / size.h)
      : zoom;
  const tokens = version === 'draft' ? draftTokens : savedTokens;
  const composition = compose
    ? version === 'draft'
      ? compose.draft
      : (compose.saved ?? { ...compose.draft, sections: [] })
    : undefined;
  const selected = compose?.selected;
  const onSelect = compose?.onSelect;
  // Envoi à l'iframe à chaque changement, et à sa demande quand elle est prête.
  useEffect(() => {
    const send = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'ds-preview',
          tokens,
          screen,
          config,
          composition,
          selected,
          interact,
        },
        location.origin,
      );
    send();
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== frame.current?.contentWindow
      )
        return;
      if (e.data?.type === 'ds-preview-ready') send();
      if (e.data?.type === 'ds-select' && typeof e.data.id === 'string')
        onSelect?.(e.data.id);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [tokens, screen, config, composition, selected, interact, onSelect]);
  const changed = compose ? compose.proposal || compose.dirty : draftCount > 0;
  function choose(id: string) {
    setDevice(id);
    const d = devices.find((x) => x.id === id);
    if (d) setSize({ w: d.w, h: d.h });
  }
  // Redimensionnement par glisser-déposer (bord droit, bas ou coin).
  function drag(axis: 'x' | 'y' | 'xy') {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY, ...size };
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        setDevice('custom');
        setSize({
          w:
            axis === 'y'
              ? start.w
              : Math.round(
                  Math.min(
                    1600,
                    Math.max(280, start.w + (ev.clientX - start.x) / scale),
                  ),
                ),
          h:
            axis === 'x'
              ? start.h
              : Math.round(
                  Math.min(
                    1600,
                    Math.max(320, start.h + (ev.clientY - start.y) / scale),
                  ),
                ),
        });
      };
      const up = () => {
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
    };
  }
  const nudge = (axis: 'w' | 'h') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 10;
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? step
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -step
          : 0;
    if (!delta) return;
    e.preventDefault();
    setDevice('custom');
    setSize((s) => ({
      ...s,
      [axis]: Math.min(
        1600,
        Math.max(axis === 'w' ? 280 : 320, s[axis] + delta),
      ),
    }));
  };
  return (
    <Surface
      component="section"
      className="design-sim"
      aria-labelledby="mobile-title"
    >
      <div className="sim-head">
        <h2 id="mobile-title" tabIndex={-1}>
          Aperçu
        </h2>
        <div className="sim-version" role="group" aria-label="Version affichée">
          <button
            type="button"
            aria-pressed={version === 'draft'}
            onClick={() => setVersion('draft')}
          >
            {compose?.proposal
              ? 'Proposition'
              : `Brouillon${!compose && draftCount ? ` · ${draftCount}` : ''}`}
          </button>
          <button
            type="button"
            aria-pressed={version === 'saved'}
            onClick={() => setVersion('saved')}
          >
            Enregistré
          </button>
        </div>
      </div>
      <div className="sim-toolbar">
        {compose ? (
          <div
            className="sim-version"
            role="group"
            aria-label="Clic dans l’aperçu"
          >
            <button
              type="button"
              aria-pressed={!interact}
              onClick={() => setInteract(false)}
            >
              Sélection
            </button>
            <button
              type="button"
              aria-pressed={interact}
              onClick={() => setInteract(true)}
            >
              Interaction
            </button>
          </div>
        ) : (
          <label className="field">
            Écran
            <select
              value={screen}
              onChange={(e) => onScreen(e.target.value as Screen)}
            >
              {screens.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Appareil
          <select value={device} onChange={(e) => choose(e.target.value)}>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
            <option value="custom">Personnalisé</option>
          </select>
        </label>
        <label className="field sim-num">
          Largeur
          <input
            type="number"
            min={280}
            max={1600}
            value={size.w}
            onChange={(e) => {
              setDevice('custom');
              setSize((s) => ({ ...s, w: Number(e.target.value) || 280 }));
            }}
          />
        </label>
        <label className="field sim-num">
          Hauteur
          <input
            type="number"
            min={320}
            max={1600}
            value={size.h}
            onChange={(e) => {
              setDevice('custom');
              setSize((s) => ({ ...s, h: Number(e.target.value) || 320 }));
            }}
          />
        </label>
        <label className="field">
          Zoom
          <select
            value={String(zoom)}
            onChange={(e) =>
              setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))
            }
          >
            <option value="fit">Ajuster</option>
            <option value="0.5">50 %</option>
            <option value="0.75">75 %</option>
            <option value="1">100 %</option>
          </select>
        </label>
      </div>
      <p className="sim-meta" role="status">
        <strong>
          {size.w} × {size.h} px
        </strong>{' '}
        · {Math.round(scale * 100)} % ·{' '}
        {size.w < layoutBreakpoint
          ? `mise en page mobile (< ${layoutBreakpoint} px)`
          : `mise en page large (≥ ${layoutBreakpoint} px)`}
        {version === 'saved' && ' · version enregistrée'}
        {compose?.proposal &&
          version === 'draft' &&
          ' · proposition de Claude, non appliquée'}
        {compose &&
          version === 'saved' &&
          !compose.saved &&
          ' · page jamais enregistrée'}
      </p>
      <ol className="sim-breakpoints" aria-label="Points de rupture">
        {breakpoints.map((b) => (
          <li key={b} className={size.w >= b ? 'is-reached' : ''}>
            <button
              type="button"
              onClick={() => {
                setDevice('custom');
                setSize((s) => ({ ...s, w: b }));
              }}
            >
              {b}
            </button>
          </li>
        ))}
      </ol>
      <div className="sim-stage" ref={stage}>
        <div
          className={`sim-frame${version === 'draft' && changed ? ' is-draft' : ''}`}
          style={{ width: size.w * scale, height: size.h * scale }}
        >
          <iframe
            ref={frame}
            title={compose ? 'Aperçu de la page' : 'Aperçu responsive'}
            src={`/?preview=1&scenario=${compose ? 'compose' : screen === 'components' ? 'cards' : screen}`}
            width={size.w}
            height={size.h}
            style={{ transform: `scale(${scale})` }}
          />
          <div
            className="sim-handle sim-handle-x"
            role="slider"
            tabIndex={0}
            aria-label="Largeur de l’aperçu"
            aria-valuenow={size.w}
            aria-valuemin={280}
            aria-valuemax={1600}
            onPointerDown={drag('x')}
            onKeyDown={nudge('w')}
          />
          <div
            className="sim-handle sim-handle-y"
            role="slider"
            tabIndex={0}
            aria-label="Hauteur de l’aperçu"
            aria-valuenow={size.h}
            aria-valuemin={320}
            aria-valuemax={1600}
            onPointerDown={drag('y')}
            onKeyDown={nudge('h')}
          />
          <div
            className="sim-handle sim-handle-xy"
            aria-hidden="true"
            onPointerDown={drag('xy')}
          />
        </div>
      </div>
    </Surface>
  );
}

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import type { Tokens } from '../../shared/model.js';
import type { Composition } from '../../shared/composition.js';
import { defaultConfig } from '../../client/design/componentSpecs.js';
import type { DropEvent } from '../../client/design/CompositionView.js';

// Simulateur : 4 cadres. Dimensions CSS réelles (points) : iPhone 15 Pro
// 393 × 852, iPad Air 11" 820 × 1180, MacBook Pro 14" 1512 × 982 (réglage
// par défaut). Zones système (Dynamic Island, barre d'état, indicateur
// d'accueil, barre de menus) réservées : le contenu n'y passe jamais.
export const devices = {
  mobile: {
    label: 'Mobile',
    detail: 'iPhone 15 Pro',
    w: 393,
    h: 852,
    rotate: true,
  },
  tablet: {
    label: 'iPad',
    detail: 'iPad Air 11"',
    w: 820,
    h: 1180,
    rotate: true,
  },
  laptop: {
    label: 'MacBook',
    detail: 'MacBook Pro 14"',
    w: 1512,
    h: 982,
    rotate: false,
  },
  screen: { label: 'Screen', detail: 'Libre', w: 1024, h: 768, rotate: true },
} as const;
export type DeviceId = keyof typeof devices;
type Insets = { top: number; right: number; bottom: number; left: number };
function insets(device: DeviceId, landscape: boolean): Insets {
  if (device === 'mobile')
    return landscape
      ? { top: 0, right: 59, bottom: 21, left: 59 }
      : { top: 59, right: 0, bottom: 34, left: 0 };
  if (device === 'tablet') return { top: 24, right: 0, bottom: 20, left: 0 };
  if (device === 'laptop') return { top: 37, right: 0, bottom: 0, left: 0 };
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

export interface View {
  device: DeviceId;
  w: number;
  h: number;
  zoom: 'fit' | number;
}

export default function Device({
  view,
  onView,
  tokens,
  scheme,
  composition,
  selected,
  proposal,
  onSelect,
  onDrop,
  frameRef,
}: {
  view: View;
  onView: (v: Partial<View>) => void;
  tokens?: Tokens;
  scheme: 'light' | 'dark';
  composition: Composition;
  selected?: string | string[];
  proposal: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onDrop: (drop: DropEvent) => void;
  frameRef: RefObject<HTMLIFrameElement | null>;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const landscape = view.w > view.h;
  const inset = insets(view.device, landscape);
  const bezel =
    view.device === 'screen' ? 0 : view.device === 'laptop' ? 20 : 14;
  const base = view.device === 'laptop' ? 18 : 0;
  const outerW = view.w + bezel * 2 + (base ? 80 : 0);
  const outerH = view.h + bezel * 2 + base;
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () =>
      setFit(
        Math.min(
          1,
          (el.clientWidth - 32) / outerW,
          (el.clientHeight - 32) / outerH,
        ),
      );
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [outerW, outerH]);
  const scale = view.zoom === 'fit' ? fit : view.zoom;

  useEffect(() => {
    const send = () =>
      frameRef.current?.contentWindow?.postMessage(
        {
          type: 'ds-preview',
          tokens,
          screen: 'compose',
          config: defaultConfig,
          composition,
          selected: proposal ? undefined : selected,
          interact: false,
          scheme,
        },
        location.origin,
      );
    if (tokens) send();
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== frameRef.current?.contentWindow
      )
        return;
      if (e.data?.type === 'ds-preview-ready' && tokens) send();
      // Raccourcis annuler / rétablir saisis dans l'aperçu.
      if (e.data?.type === 'ds-key')
        dispatchEvent(new CustomEvent('ds-history', { detail: e.data.key }));
      if (proposal) return;
      if (e.data?.type === 'ds-select' && typeof e.data.id === 'string')
        onSelect(e.data.id, e.data.additive === true);
      if (e.data?.type === 'ds-drop' && typeof e.data.container === 'string')
        onDrop(e.data as DropEvent);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [
    tokens,
    composition,
    selected,
    proposal,
    scheme,
    onSelect,
    onDrop,
    frameRef,
  ]);

  // Redimensionnement (Screen) : poignée souris/tactile ou flèches.
  const drag = useRef<{ x: number; y: number; w: number; h: number }>(null);
  const clamp = (v: number) => Math.round(Math.min(2560, Math.max(280, v)));
  function down(e: PointerEvent<HTMLButtonElement>) {
    drag.current = { x: e.clientX, y: e.clientY, w: view.w, h: view.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    onView({
      w: clamp(d.w + (e.clientX - d.x) / scale),
      h: clamp(d.h + (e.clientY - d.y) / scale),
    });
  }

  return (
    <div className="device-stage" ref={stage}>
      <div
        className="device-scaler"
        style={{ width: outerW * scale, height: outerH * scale }}
      >
        <div
          className={`device device--${view.device}`}
          data-scheme={scheme}
          style={{
            transform: `scale(${scale})`,
            padding: bezel,
            marginLeft: base ? 40 : 0,
          }}
        >
          <div
            className="device-screen"
            style={{ width: view.w, height: view.h }}
          >
            {inset.top > 0 && (
              <div
                className="sys-top"
                style={{ height: inset.top }}
                aria-hidden="true"
              >
                {view.device === 'laptop' ? (
                  <>
                    <span>DS-Studio</span>
                    <i className="notch" />
                    <span>Lun. 9:41</span>
                  </>
                ) : (
                  <>
                    <span>9:41</span>
                    {view.device === 'mobile' && <i className="island" />}
                    <span className="sys-icons">
                      <Signal size={14} />
                      <Wifi size={14} />
                      <BatteryFull size={18} />
                    </span>
                  </>
                )}
              </div>
            )}
            <iframe
              ref={frameRef}
              title="Aperçu de l’écran"
              src="/index.html?preview=1&scenario=compose"
              style={{
                top: inset.top,
                left: inset.left,
                width: view.w - inset.left - inset.right,
                height: view.h - inset.top - inset.bottom,
              }}
            />
            {view.device === 'mobile' && landscape && (
              <i className="island island-side" aria-hidden="true" />
            )}
            {inset.bottom > 0 && (
              <div
                className="sys-bottom"
                style={{ height: inset.bottom }}
                aria-hidden="true"
              >
                <i className="home-indicator" />
              </div>
            )}
          </div>
          {view.device === 'screen' && (
            <button
              type="button"
              className="device-handle"
              aria-label={`Redimensionner l’écran (${view.w} × ${view.h}). Flèches pour ajuster.`}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={() => (drag.current = null)}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 50 : 10;
                const d: Record<string, [number, number]> = {
                  ArrowRight: [step, 0],
                  ArrowLeft: [-step, 0],
                  ArrowDown: [0, step],
                  ArrowUp: [0, -step],
                };
                if (!d[e.key]) return;
                e.preventDefault();
                onView({
                  w: clamp(view.w + d[e.key][0]),
                  h: clamp(view.h + d[e.key][1]),
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

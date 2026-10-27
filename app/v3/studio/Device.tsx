import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import type { Tokens } from '../../shared/model.js';
import type { Composition } from '../../shared/composition.js';
import { defaultConfig } from '../../client/design/componentSpecs.js';

// Simulateur : cadres d'appareils, rendu React réel dans une iframe (route
// d'aperçu existante), écran conservé d'un appareil à l'autre.
export const devices = [
  { id: 'iphone', label: 'iPhone 16', w: 393, h: 852, rotate: true },
  { id: 'android', label: 'Android (Pixel)', w: 412, h: 915, rotate: true },
  { id: 'tablet', label: 'iPad', w: 820, h: 1180, rotate: true },
  { id: 'macbook', label: 'MacBook', w: 1440, h: 900, rotate: false },
  { id: 'custom', label: 'Libre', w: 600, h: 800, rotate: true },
] as const;
export type DeviceId = (typeof devices)[number]['id'];
export const breakpoints = [360, 390, 768, 1024, 1280, 1440];

export interface View {
  device: DeviceId;
  w: number;
  h: number;
  zoom: 'fit' | number;
  scheme: 'light' | 'dark';
  interact: boolean;
}

export default function Device({
  view,
  onView,
  tokens,
  composition,
  selected,
  proposal,
  onSelect,
}: {
  view: View;
  onView: (v: Partial<View>) => void;
  tokens?: Tokens;
  composition: Composition;
  selected?: string;
  proposal: boolean;
  onSelect: (id: string) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [fit, setFit] = useState(1);
  const pad = view.device === 'macbook' ? 60 : 40;
  // Échelle « Ajuster » : l'appareil entier tient dans la zone d'aperçu.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () =>
      setFit(
        Math.min(
          1,
          (el.clientWidth - 32) / (view.w + pad),
          (el.clientHeight - 32) / (view.h + pad),
        ),
      );
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view.w, view.h, pad]);
  const scale = view.zoom === 'fit' ? fit : view.zoom;

  useEffect(() => {
    const send = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'ds-preview',
          tokens,
          screen: 'compose',
          config: defaultConfig,
          composition,
          selected: proposal ? undefined : selected,
          interact: view.interact,
          scheme: view.scheme,
        },
        location.origin,
      );
    if (tokens) send();
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== frame.current?.contentWindow
      )
        return;
      if (e.data?.type === 'ds-preview-ready' && tokens) send();
      if (e.data?.type === 'ds-select' && typeof e.data.id === 'string')
        if (!proposal) onSelect(e.data.id);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [
    tokens,
    composition,
    selected,
    proposal,
    view.interact,
    view.scheme,
    onSelect,
  ]);

  // Redimensionnement libre par la poignée (souris, doigt) ou au clavier.
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
      device: 'custom',
      w: clamp(d.w + (e.clientX - d.x) / scale),
      h: clamp(d.h + (e.clientY - d.y) / scale),
    });
  }

  return (
    <div className="device-stage" ref={stage} data-scheme={view.scheme}>
      <div
        className="device-scaler"
        style={{
          width: (view.w + pad) * scale,
          height: (view.h + pad) * scale,
        }}
      >
        <div
          className={`device device-${view.device}`}
          style={{ transform: `scale(${scale})` }}
        >
          <div
            className="device-screen"
            style={{ width: view.w, height: view.h }}
          >
            <iframe
              ref={frame}
              title="Aperçu de l’écran"
              src="/?preview=1&scenario=compose"
              width={view.w}
              height={view.h}
            />
          </div>
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
                device: 'custom',
                w: clamp(view.w + d[e.key][0]),
                h: clamp(view.h + d[e.key][1]),
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

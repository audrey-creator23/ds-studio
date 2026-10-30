import { useEffect, useRef, useState } from 'react';
import { Moon, Pause, Play, Sun, Undo2 } from 'lucide-react';
import Volcano from '../../client/Volcano.js';
import { webglAvailable } from '../../client/VolcanoGL.js';
import { reducedMotion } from '../carte/MapView.js';
import type { VolcanScene } from './scene.js';
import { phaseOf, phases } from './phases.js';

// Volcan 3D du Dashboard (phases : voir phases.ts).
const NIGHT = 'ds-v3-volcan-nuit';
const ANIM = 'ds-v3-volcan-anim';
const stored = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const store = (k: string, v: boolean) => {
  try {
    localStorage.setItem(k, v ? '1' : '0');
  } catch {
    // Préférence gardée pour la session.
  }
};

export default function Volcan({
  pct,
  preview,
  onFollow,
}: {
  pct: number;
  // Aperçu d'un jalon de la frise (phase + titre), sinon progression réelle.
  preview?: { phase: number; title: string } | null;
  onFollow: () => void;
}) {
  const real = phaseOf(pct);
  const phase = preview?.phase ?? real;
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<VolcanScene | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>(() =>
    webglAvailable() ? 'loading' : 'fallback',
  );
  const [night, setNight] = useState(() => stored(NIGHT) === '1');
  const [anim, setAnim] = useState(() =>
    stored(ANIM) ? stored(ANIM) === '1' : !reducedMotion(),
  );
  useEffect(() => {
    if (state === 'fallback') return;
    let alive = true;
    let made: VolcanScene | undefined;
    import('./scene.js')
      .then(({ createVolcan }) =>
        createVolcan(host.current!, { reduced: !anim }),
      )
      .then((s) => {
        made = s;
        if (!alive) return s.dispose();
        engine.current = s;
        // Accès de test (phases, jour / nuit), comme la carte (__carte).
        (window as unknown as { __volcan?: VolcanScene }).__volcan = s;
        setState('ready');
      })
      .catch(() => alive && setState('fallback'));
    return () => {
      alive = false;
      made?.dispose();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => engine.current?.setPhase(phase), [phase, state]);
  useEffect(() => engine.current?.setNight(night), [night, state]);
  useEffect(() => engine.current?.setAnimated(anim), [anim, state]);
  return (
    <div className="volcan" data-paused={!anim || undefined}>
      <div
        className="stage volcan-stage"
        ref={host}
        role="img"
        aria-label={`Volcan 3D, phase ${phase} sur 6 : ${phases[phase - 1]}${preview ? `, aperçu du jalon ${preview.title}` : ''}, avancement réel du PFE ${pct} %. Métaphore, pas l’activité réelle de la Pelée.`}
        data-phase={phase}
        data-ready={state === 'ready' || undefined}
        data-night={night || undefined}
      >
        {state === 'loading' && (
          <p className="stage-fallback" role="status">
            Chargement du volcan…
          </p>
        )}
        {state === 'fallback' && (
          <Volcano activity={(phase - 1) / 5} quality="light" />
        )}
      </div>
      <div className="volcan-bar">
        <span className="volcan-left">
          <p className="volcan-phase" aria-live="polite">
            <b>Phase {phase}/6</b> · {phases[phase - 1]}
            {preview && <small> · aperçu {preview.title}</small>}
          </p>
          {preview && (
            <button type="button" className="volcan-follow" onClick={onFollow}>
              <Undo2 size={14} aria-hidden="true" /> Suivre ma progression
            </button>
          )}
        </span>
        <span className="volcan-tools">
          <button
            type="button"
            className="volcan-tool"
            aria-pressed={!anim}
            aria-label={
              anim ? 'Réduire les animations' : 'Reprendre les animations'
            }
            title={anim ? 'Réduire les animations' : 'Reprendre les animations'}
            onClick={() => {
              store(ANIM, !anim);
              setAnim(!anim);
            }}
          >
            {anim ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
          </button>
          <span className="volcan-sky" role="group" aria-label="Ciel du volcan">
            <button
              type="button"
              aria-pressed={!night}
              aria-label="Jour"
              title="Jour"
              onClick={() => {
                store(NIGHT, false);
                setNight(false);
              }}
            >
              <Sun size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={night}
              aria-label="Nuit"
              title="Nuit"
              onClick={() => {
                store(NIGHT, true);
                setNight(true);
              }}
            >
              <Moon size={14} aria-hidden="true" />
            </button>
          </span>
        </span>
      </div>
    </div>
  );
}

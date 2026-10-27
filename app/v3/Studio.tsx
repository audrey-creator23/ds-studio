import { useCallback, useEffect, useRef, useState } from 'react';
import { Redo2, RotateCw, Save, Undo2 } from 'lucide-react';
import { getState } from '../client/api.js';
import { useComposition } from '../client/design/useComposition.js';
import type { DropEvent } from '../client/design/CompositionView.js';
import type { Tokens } from '../shared/model.js';
import {
  emptyComposition,
  normalizeComposition,
  type BlockKind,
  type Composition,
} from '../shared/composition.js';
import { Button } from './ui.js';
import StudioChat from './studio/StudioChat.js';
import LibraryPanel from './studio/LibraryPanel.js';
import LayersPanel from './studio/LayersPanel.js';
import PropsBar from './studio/PropsBar.js';
import ExportPanel from './studio/ExportPanel.js';
import Device, { devices, type DeviceId, type View } from './studio/Device.js';

// Mon espace Design : un seul état (useComposition) pour Claude, la
// bibliothèque, les calques, la barre de propriétés et l'aperçu. L'écran est
// enregistré automatiquement dans le projet (fichier privé, distinct des
// tokens) ; « Enregistrer » exporte. Rien ne touche le DS global.
const tabs = [
  ['claude', 'Claude'],
  ['library', 'Bibliothèque'],
  ['layers', 'Calques'],
  ['versions', 'Versions'],
  ['export', 'Export'],
] as const;
type Tab = (typeof tabs)[number][0];

function stored<T extends object>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return fallback;
  }
}
const persist = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Préférence facultative. */
  }
};
type Version = { date: string; composition: Composition };
const versionsKey = 'ds-v3-versions';

export default function Studio({ scheme }: { scheme: 'light' | 'dark' }) {
  const c = useComposition({
    draftKey: 'ds-v3-screen',
    starter: () => emptyComposition('Écran 1'),
  });
  const [tokens, setTokens] = useState<Tokens>();
  useEffect(() => {
    getState().then(
      (s) => setTokens(s.tokens),
      () => c.setError('État du DS indisponible : relancez le serveur.'),
    );
  }, []);
  const [ui, setUi] = useState(() =>
    stored('ds-v3-design', { split: 32, tab: 'library' as Tab }),
  );
  const [view, setView] = useState<View>(() => {
    const v = stored('ds-v3-view', {
      device: 'mobile' as DeviceId,
      w: 393,
      h: 852,
      zoom: 'fit' as View['zoom'],
    });
    return devices[v.device]
      ? v
      : { device: 'mobile', w: 393, h: 852, zoom: 'fit' };
  });
  useEffect(() => persist('ds-v3-design', ui), [ui]);
  useEffect(() => persist('ds-v3-view', view), [view]);
  const patchView = useCallback(
    (v: Partial<View>) => setView((x) => ({ ...x, ...v })),
    [],
  );
  const frame = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<Version[]>(
    () =>
      stored(versionsKey, {} as Record<string, Version[]>)[c.draft.id] ?? [],
  );

  // Sauvegarde projet automatique (fichier privé du serveur), distincte de
  // l'export ; pas pendant une proposition de Claude non validée.
  useEffect(() => {
    if (!c.dirty || c.proposal || c.busy) return;
    const t = setTimeout(() => void c.save(), 1200);
    return () => clearTimeout(t);
  }, [c.draft, c.dirty, c.proposal]);

  const select = useCallback((id: string) => c.select(id), [c.select]);
  const add = c.addItem;
  const moveTo = c.moveTo;
  const onDrop = useCallback(
    (d: DropEvent) => {
      if (d.block)
        add(d.block.kind as BlockKind, d.block.variant, d.container, d.index);
      else if (d.move) moveTo(d.move, d.container, d.index);
    },
    [add, moveTo],
  );

  // Séparateur redimensionnable : gauche ~30 %, aperçu ~70 %.
  const body = useRef<HTMLDivElement>(null);
  const resize = (x: number) => {
    const r = body.current!.getBoundingClientRect();
    setUi((u) => ({
      ...u,
      split: Math.round(
        Math.min(50, Math.max(20, ((x - r.left) / r.width) * 100)),
      ),
    }));
  };
  function snapshot() {
    const all = stored(versionsKey, {} as Record<string, Version[]>);
    const list = [
      { date: new Date().toISOString(), composition: c.draft },
      ...(all[c.draft.id] ?? []),
    ].slice(0, 20);
    all[c.draft.id] = list;
    persist(versionsKey, all);
    setVersions(list);
  }
  const shown = c.proposal?.composition ?? c.draft;
  const size = `${view.w} × ${view.h}`;
  const device = devices[view.device];

  return (
    <div className="studio">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Mon espace Design
        </h1>
        <p className="lead">
          Composez vos écrans avec les composants du DS, à la main ou avec
          Claude.
        </p>
      </header>
      <div
        className="studio-body"
        ref={body}
        style={{ gridTemplateColumns: `${ui.split}% 8px minmax(0, 1fr)` }}
      >
        <section className="panel side-panel" aria-label="Outils">
          <div className="tabs" role="tablist" aria-label="Outils du studio">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={ui.tab === id}
                aria-controls="studio-tab"
                tabIndex={ui.tab === id ? 0 : -1}
                onClick={() => setUi((u) => ({ ...u, tab: id }))}
                onKeyDown={(e) => {
                  const i = tabs.findIndex(([t]) => t === id);
                  const d =
                    e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                  if (!d) return;
                  const next = tabs[(i + d + tabs.length) % tabs.length][0];
                  setUi((u) => ({ ...u, tab: next }));
                  requestAnimationFrame(() =>
                    document.getElementById(`tab-${next}`)?.focus(),
                  );
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            id="studio-tab"
            role="tabpanel"
            aria-labelledby={`tab-${ui.tab}`}
            className="tab-body"
          >
            {ui.tab === 'claude' && <StudioChat c={c} />}
            {ui.tab === 'library' && (
              <LibraryPanel
                tokens={tokens}
                target={
                  c.draft.sections.find(
                    (s) =>
                      s.id === c.selected ||
                      s.items.some((i) => i.id === c.selected),
                  )?.name
                }
                onAdd={(k, v) => c.addItem(k, v)}
              />
            )}
            {ui.tab === 'layers' && <LayersPanel c={c} />}
            {ui.tab === 'versions' && (
              <div className="versions-tab">
                <Button size="sm" onClick={snapshot}>
                  Créer une version
                </Button>
                {versions.length ? (
                  <ul className="versions">
                    {versions.map((v) => (
                      <li key={v.date}>
                        <span>
                          {new Date(v.date).toLocaleString('fr-FR')}
                          <small className="muted">
                            {' '}
                            · {v.composition.sections.length} section(s)
                          </small>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const n = normalizeComposition(v.composition);
                            if (n) c.restore(n);
                          }}
                        >
                          Restaurer
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Aucune version pour cet écran.</p>
                )}
              </div>
            )}
            {ui.tab === 'export' && (
              <ExportPanel composition={c.draft} frameRef={frame} size={size} />
            )}
          </div>
        </section>
        <div
          className="splitter"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Largeur du panneau"
          aria-valuemin={20}
          aria-valuemax={50}
          aria-valuenow={ui.split}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={(e) => e.buttons === 1 && resize(e.clientX)}
          onKeyDown={(e) => {
            const d =
              e.key === 'ArrowLeft' ? -2 : e.key === 'ArrowRight' ? 2 : 0;
            if (d)
              setUi((u) => ({
                ...u,
                split: Math.min(50, Math.max(20, u.split + d)),
              }));
          }}
        />
        <section className="preview-col" aria-label="Aperçu">
          <div className="preview-bar">
            <input
              className="input input-sm screen-name"
              aria-label="Nom de l’écran"
              value={c.draft.name}
              maxLength={60}
              onChange={(e) => c.rename(e.target.value)}
            />
            <div className="toggle-group" role="group" aria-label="Appareil">
              {(Object.keys(devices) as DeviceId[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={view.device === d}
                  title={`${devices[d].detail} · ${devices[d].w} × ${devices[d].h}`}
                  onClick={() =>
                    patchView({ device: d, w: devices[d].w, h: devices[d].h })
                  }
                >
                  {devices[d].label}
                </button>
              ))}
            </div>
            <span className="muted small" aria-live="polite">
              {size}
            </span>
            <span className="bar-spacer" />
            <select
              className="input input-sm"
              aria-label="Zoom"
              value={String(view.zoom)}
              onChange={(e) =>
                patchView({
                  zoom:
                    e.target.value === 'fit' ? 'fit' : Number(e.target.value),
                })
              }
            >
              <option value="fit">Ajuster</option>
              <option value="0.5">50 %</option>
              <option value="0.75">75 %</option>
              <option value="1">100 %</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Pivoter"
              title="Pivoter"
              disabled={!device.rotate}
              onClick={() => patchView({ w: view.h, h: view.w })}
            >
              <RotateCw size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Annuler"
              title="Annuler"
              disabled={!c.canUndo}
              onClick={c.undo}
            >
              <Undo2 size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Rétablir"
              title="Rétablir"
              disabled={!c.canRedo}
              onClick={c.redo}
            >
              <Redo2 size={16} aria-hidden="true" />
            </Button>
            <Button size="sm" onClick={() => setSaving(true)}>
              <Save size={14} aria-hidden="true" /> Enregistrer
            </Button>
          </div>
          <p className="studio-status" role="status">
            {c.error ||
              (c.proposal
                ? 'Proposition de Claude affichée : appliquez ou refusez dans l’onglet Claude.'
                : c.dirty
                  ? 'Modifications en cours d’enregistrement…'
                  : 'Écran enregistré dans le projet.')}
          </p>
          <div className="preview-area">
            {c.proposal && <span className="preview-flag">Proposition</span>}
            <Device
              view={view}
              onView={patchView}
              tokens={tokens}
              scheme={scheme}
              composition={shown}
              selected={c.selected}
              proposal={!!c.proposal}
              onSelect={select}
              onDrop={onDrop}
              frameRef={frame}
            />
            <PropsBar c={c} />
          </div>
        </section>
      </div>

      {saving && (
        <div className="dialog-backdrop" onClick={() => setSaving(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setSaving(false)}
          >
            <div className="panel-head">
              <h2 id="save-title">Enregistrer l’écran</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                autoFocus
                onClick={() => setSaving(false)}
              >
                ✕
              </Button>
            </div>
            <ExportPanel composition={c.draft} frameRef={frame} size={size} />
          </div>
        </div>
      )}
    </div>
  );
}

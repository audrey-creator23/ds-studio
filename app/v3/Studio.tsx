import { useCallback, useEffect, useRef, useState } from 'react';
import {
  History,
  Layers,
  Library,
  MessageCircle,
  Plus,
  RotateCw,
  Save,
  X,
} from 'lucide-react';
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
// bibliothèque, les calques, la barre de propriétés et l'aperçu. Chaque
// écran est enregistré automatiquement dans le projet (fichier privé,
// distinct des tokens) ; « Enregistrer » exporte. Rien ne touche le DS global.
const tabs = [
  ['claude', 'Claude', MessageCircle],
  ['library', 'Bibliothèque', Library],
  ['layers', 'Calques', Layers],
] as const;
type Tab = (typeof tabs)[number][0];
const defaultNames = ['Écran 1', 'Nouvelle page'];

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
// Historique : les 10 dernières modifications de chaque écran, horodatées.
type Version = { date: string; composition: Composition };
const historyKey = 'ds-v3-history';
const readHistory = (id: string): Version[] =>
  stored(historyKey, {} as Record<string, Version[]>)[id] ?? [];

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
    stored('ds-v3-design', { split: 36, tab: 'library' as Tab }),
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
  const [showVersions, setShowVersions] = useState(false);
  const tab: Tab = tabs.some(([t]) => t === ui.tab) ? ui.tab : 'library';
  const [versions, setVersions] = useState(() => readHistory(c.draft.id));
  useEffect(() => setVersions(readHistory(c.draft.id)), [c.draft.id]);

  // Sauvegarde projet automatique (fichier privé du serveur), distincte de
  // l'export ; pas pendant une proposition de Claude non validée.
  useEffect(() => {
    if (!c.dirty || c.proposal || c.busy) return;
    const t = setTimeout(() => void c.save(), 1200);
    return () => clearTimeout(t);
  }, [c.draft, c.dirty, c.proposal]);
  // Chaque modification (après 1 s de calme) entre dans l'historique.
  useEffect(() => {
    const t = setTimeout(() => {
      const all = stored(historyKey, {} as Record<string, Version[]>);
      const list = all[c.draft.id] ?? [];
      if (
        list[0] &&
        JSON.stringify(list[0].composition) === JSON.stringify(c.draft)
      )
        return;
      all[c.draft.id] = [
        { date: new Date().toISOString(), composition: c.draft },
        ...list,
      ].slice(0, 10);
      persist(historyKey, all);
      setVersions(all[c.draft.id]);
    }, 1000);
    return () => clearTimeout(t);
  }, [c.draft]);

  // ⌘Z / Ctrl+Z annule ; ⇧⌘Z / Ctrl+Y rétablit (hors champs de saisie ;
  // relayés aussi depuis l'aperçu).
  const undo = useRef(c.undo);
  const redo = useRef(c.redo);
  undo.current = c.undo;
  redo.current = c.redo;
  useEffect(() => {
    const run = (key: string) =>
      key === 'undo' ? undo.current() : redo.current();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        !(e.metaKey || e.ctrlKey) ||
        t.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      const k = e.key.toLowerCase();
      const key =
        k === 'z' ? (e.shiftKey ? 'redo' : 'undo') : k === 'y' ? 'redo' : '';
      if (!key) return;
      e.preventDefault();
      run(key);
    };
    const onRelay = (e: Event) => run((e as CustomEvent<string>).detail);
    addEventListener('keydown', onKey);
    addEventListener('ds-history', onRelay);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('ds-history', onRelay);
    };
  }, []);

  // Sélection multiple : Maj / ⌘ + clic dans l'aperçu ou les calques.
  const [multi, setMulti] = useState<string[]>([]);
  const selectId = c.select;
  const selected = c.selected;
  const select = useCallback(
    (id: string, additive?: boolean) => {
      if (additive && selected) {
        setMulti((m) => {
          const base = m.length ? m : [selected];
          return base.includes(id)
            ? base.filter((x) => x !== id)
            : [...base, id];
        });
      } else setMulti([]);
      selectId(id);
    },
    [selected, selectId],
  );
  useEffect(() => {
    if (!c.selected) setMulti([]);
  }, [c.selected]);
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

  // Écrans : onglets en bas ; changer d'écran enregistre d'abord.
  async function switchTo(id: string) {
    if (c.dirty && !c.proposal) await c.save();
    c.open(id);
    setMulti([]);
  }
  const screens = c.saved.some((s) => s.id === c.draft.id)
    ? c.saved
    : [c.draft, ...c.saved];
  const screenName = (s: Composition, i: number) =>
    defaultNames.includes(s.name) ? `Écran ${i + 1}` : s.name;

  // Séparateur redimensionnable : gauche ~36 %, aperçu ~64 %.
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
        style={{ gridTemplateColumns: `${ui.split}% 12px minmax(0, 1fr)` }}
      >
        <section className="panel side-panel" aria-label="Outils">
          <div className="tabs" role="tablist" aria-label="Outils du studio">
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls="studio-tab"
                aria-label={label}
                title={label}
                tabIndex={tab === id ? 0 : -1}
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
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className="tab-label">{label}</span>
              </button>
            ))}
          </div>
          <div
            id="studio-tab"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="tab-body"
          >
            {tab === 'claude' && <StudioChat c={c} />}
            {tab === 'library' && (
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
            {tab === 'layers' && (
              <LayersPanel c={c} multi={multi} onSelect={select} />
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
        <section className="preview-col preview-card" aria-label="Aperçu">
          <div className="preview-bar">
            <div
              className="toggle-group devices"
              role="group"
              aria-label="Appareil"
            >
              {(Object.keys(devices) as DeviceId[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={view.device === d}
                  title={devices[d].detail}
                  onClick={() =>
                    patchView({ device: d, w: devices[d].w, h: devices[d].h })
                  }
                >
                  {devices[d].label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setSaving(true)}>
              <Save size={14} aria-hidden="true" /> Enregistrer
            </Button>
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
              size="sm"
              title="Pivoter : portrait / paysage"
              disabled={!device.rotate}
              onClick={() => patchView({ w: view.h, h: view.w })}
            >
              <RotateCw size={14} aria-hidden="true" /> Pivoter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="10 dernières modifications"
              onClick={() => setShowVersions(true)}
            >
              <History size={14} aria-hidden="true" /> Versions
            </Button>
          </div>
          <p className="studio-status" role="status">
            {c.error ||
              (c.proposal
                ? 'Proposition de Claude affichée : appliquez ou refusez dans l’onglet Claude.'
                : c.dirty
                  ? 'Modifications en cours d’enregistrement…'
                  : 'Écran enregistré · ⌘Z annuler · ⇧⌘Z rétablir')}
          </p>
          <div className="preview-area">
            {c.proposal && <span className="preview-flag">Proposition</span>}
            <Device
              view={view}
              onView={patchView}
              tokens={tokens}
              scheme={scheme}
              composition={shown}
              selected={multi.length > 1 ? multi : c.selected}
              proposal={!!c.proposal}
              onSelect={select}
              onDrop={onDrop}
              frameRef={frame}
            />
            <PropsBar c={c} multi={multi} onGrouped={() => setMulti([])} />
          </div>
          <div className="screens" role="tablist" aria-label="Écrans">
            {screens.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === c.draft.id}
                onClick={() => s.id !== c.draft.id && void switchTo(s.id)}
              >
                {screenName(s, i)}
              </button>
            ))}
            <button
              type="button"
              className="screen-new"
              disabled={c.busy}
              onClick={() => void switchTo('new')}
            >
              <Plus size={13} aria-hidden="true" /> Nouvel écran
            </button>
          </div>
        </section>
      </div>

      {showVersions && (
        <div className="dialog-backdrop" onClick={() => setShowVersions(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="versions-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setShowVersions(false)}
          >
            <div className="panel-head">
              <h2 id="versions-title">10 dernières modifications</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                autoFocus
                onClick={() => setShowVersions(false)}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
            {versions.length ? (
              <ol className="versions">
                {versions.map((v, i) => (
                  <li key={v.date}>
                    <span>
                      {new Date(v.date).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                      <small className="muted">
                        {' '}
                        ·{' '}
                        {v.composition.sections.reduce(
                          (n, s) => n + s.items.length,
                          0,
                        )}{' '}
                        élément(s){i === 0 ? ' · actuelle' : ''}
                      </small>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={i === 0}
                      onClick={() => {
                        const n = normalizeComposition(v.composition);
                        if (n) c.restore(n);
                        setShowVersions(false);
                      }}
                    >
                      Restaurer
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Aucune modification enregistrée.</p>
            )}
          </div>
        </div>
      )}
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
              <h2 id="save-title">Télécharger l’écran</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                onClick={() => setSaving(false)}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
            <ExportPanel
              composition={c.draft}
              frameRef={frame}
              size={size}
              onName={c.rename}
            />
          </div>
        </div>
      )}
    </div>
  );
}

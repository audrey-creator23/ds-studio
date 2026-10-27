import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import {
  Layers,
  Library,
  Maximize,
  Redo2,
  RotateCw,
  Save,
  Undo2,
  FileCode2,
  History,
} from 'lucide-react';
import { getState } from '../client/api.js';
import { useComposition } from '../client/design/useComposition.js';
import type { Tokens } from '../shared/model.js';
import {
  normalizeComposition,
  type BlockKind,
  type Composition,
} from '../shared/composition.js';
import { Button } from './ui.js';
import StudioChat from './studio/StudioChat.js';
import LibraryPanel, { dragType } from './studio/LibraryPanel.js';
import LayersPanel from './studio/LayersPanel.js';
import Device, { breakpoints, devices, type View } from './studio/Device.js';
import { exportReact } from './studio/exportReact.js';

// Studio Design v3 : chat IA et glisser-déposer sur un état unique
// (useComposition, partagé avec l'atelier actuel) ; aperçu React réel.
// Rien n'est enregistré ni appliqué au DS global sans validation.
function stored<T>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return fallback;
  }
}
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Préférence facultative. */
  }
};
// Versions locales : 10 dernières sauvegardes par écran, restaurables.
type Version = { date: string; composition: Composition };
const versionsKey = 'ds-v3-versions';
const readVersions = (): Record<string, Version[]> =>
  stored(versionsKey, {} as Record<string, Version[]>);

export default function Studio() {
  const c = useComposition();
  const [tokens, setTokens] = useState<Tokens>();
  useEffect(() => {
    getState().then(
      (s) => setTokens(s.tokens),
      () => undefined,
    );
  }, []);
  const [ui, setUi] = useState(() =>
    stored('ds-v3-studio', {
      split: 35,
      panel: 'layers' as 'library' | 'layers' | 'none',
    }),
  );
  const [view, setView] = useState<View>(() =>
    stored('ds-v3-device', {
      device: 'iphone',
      w: 393,
      h: 852,
      zoom: 'fit',
      scheme: 'light',
      interact: false,
    } as View),
  );
  useEffect(() => save('ds-v3-studio', ui), [ui]);
  useEffect(() => save('ds-v3-device', view), [view]);
  const patchView = useCallback(
    (v: Partial<View>) => setView((x) => ({ ...x, ...v })),
    [],
  );
  const [dialog, setDialog] = useState<'export' | 'versions'>();
  const [copied, setCopied] = useState(false);
  const [over, setOver] = useState(false);

  // Séparateur redimensionnable : chat 35 % par défaut.
  const body = useRef<HTMLDivElement>(null);
  function resize(clientX: number) {
    const r = body.current!.getBoundingClientRect();
    setUi((u) => ({
      ...u,
      split: Math.round(
        Math.min(60, Math.max(22, ((clientX - r.left) / r.width) * 100)),
      ),
    }));
  }

  const select = useCallback(
    (id: string) => {
      c.select(id);
      setUi((u) => ({ ...u, panel: 'layers' }));
    },
    [c.select],
  );
  const shown = c.proposal?.composition ?? c.draft;
  const target =
    c.draft.sections.find(
      (s) => s.id === c.selected || s.items.some((i) => i.id === c.selected),
    ) ?? c.draft.sections.at(-1);

  async function saveScreen() {
    await c.save();
    const all = readVersions();
    all[c.draft.id] = [
      { date: new Date().toISOString(), composition: c.draft },
      ...(all[c.draft.id] ?? []),
    ].slice(0, 10);
    save(versionsKey, all);
  }
  // Dépôt d'un composant de la bibliothèque sur l'aperçu : section ciblée.
  function dropOnPreview(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const raw = e.dataTransfer.getData(dragType);
    if (!raw) return;
    const { kind, variant } = JSON.parse(raw) as {
      kind: BlockKind;
      variant: string;
    };
    c.addItem(kind, variant);
  }
  const device = devices.find((d) => d.id === view.device)!;
  const code = dialog === 'export' ? exportReact(c.draft) : '';
  const versions = readVersions()[c.draft.id] ?? [];

  return (
    <div className="studio">
      <header className="studio-bar" aria-label="Barre d’outils">
        <div className="bar-group">
          <select
            className="input input-sm"
            aria-label="Écran"
            value={c.savedVersion ? c.draft.id : ''}
            onChange={(e) => {
              if (
                !c.dirty ||
                confirm('Abandonner les modifications non enregistrées ?')
              )
                c.open(e.target.value || 'new');
            }}
          >
            {!c.savedVersion && <option value="">Brouillon</option>}
            {c.saved.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="new">+ Nouvel écran</option>
          </select>
          <input
            className="input input-sm screen-name"
            aria-label="Nom de l’écran"
            value={c.draft.name}
            maxLength={60}
            onChange={(e) => c.rename(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Annuler"
            disabled={!c.canUndo}
            onClick={c.undo}
          >
            <Undo2 size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rétablir"
            disabled={!c.canRedo}
            onClick={c.redo}
          >
            <Redo2 size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="bar-group">
          <select
            className="input input-sm"
            aria-label="Appareil"
            value={view.device}
            onChange={(e) => {
              const d = devices.find((x) => x.id === e.target.value)!;
              patchView({ device: d.id, w: d.w, h: d.h });
            }}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <span className="dims" aria-label="Dimensions">
            <input
              className="input input-sm"
              type="number"
              aria-label="Largeur"
              min={280}
              max={2560}
              value={view.w}
              onChange={(e) =>
                patchView({
                  device: 'custom',
                  w: Number(e.target.value) || 280,
                })
              }
            />
            ×
            <input
              className="input input-sm"
              type="number"
              aria-label="Hauteur"
              min={280}
              max={2560}
              value={view.h}
              onChange={(e) =>
                patchView({
                  device: 'custom',
                  h: Number(e.target.value) || 280,
                })
              }
            />
          </span>
          <select
            className="input input-sm"
            aria-label="Point de rupture"
            value=""
            onChange={(e) =>
              e.target.value &&
              patchView({ device: 'custom', w: Number(e.target.value) })
            }
          >
            <option value="">Largeur…</option>
            {breakpoints.map((b) => (
              <option key={b} value={b}>
                {b} px
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Pivoter"
            disabled={!device.rotate}
            onClick={() => patchView({ w: view.h, h: view.w })}
          >
            <RotateCw size={16} aria-hidden="true" />
          </Button>
          <select
            className="input input-sm"
            aria-label="Zoom"
            value={String(view.zoom)}
            onChange={(e) =>
              patchView({
                zoom: e.target.value === 'fit' ? 'fit' : Number(e.target.value),
              })
            }
          >
            <option value="fit">Ajuster</option>
            <option value="0.5">50 %</option>
            <option value="0.75">75 %</option>
            <option value="1">100 %</option>
          </select>
          <div
            className="toggle-group"
            role="group"
            aria-label="Thème de l’aperçu"
          >
            {(['light', 'dark'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={view.scheme === s}
                onClick={() => patchView({ scheme: s })}
              >
                {s === 'light' ? 'Clair' : 'Sombre'}
              </button>
            ))}
          </div>
          <div
            className="toggle-group"
            role="group"
            aria-label="Mode de l’aperçu"
          >
            <button
              type="button"
              aria-pressed={!view.interact}
              onClick={() => patchView({ interact: false })}
            >
              Sélection
            </button>
            <button
              type="button"
              aria-pressed={view.interact}
              onClick={() => patchView({ interact: true })}
            >
              Interaction
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Plein écran"
            onClick={() =>
              document.querySelector('.preview-area')?.requestFullscreen?.()
            }
          >
            <Maximize size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="bar-group">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bibliothèque"
            aria-pressed={ui.panel === 'library'}
            onClick={() =>
              setUi((u) => ({
                ...u,
                panel: u.panel === 'library' ? 'none' : 'library',
              }))
            }
          >
            <Library size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Calques et propriétés"
            aria-pressed={ui.panel === 'layers'}
            onClick={() =>
              setUi((u) => ({
                ...u,
                panel: u.panel === 'layers' ? 'none' : 'layers',
              }))
            }
          >
            <Layers size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Versions"
            onClick={() => setDialog('versions')}
          >
            <History size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Exporter en React"
            onClick={() => setDialog('export')}
          >
            <FileCode2 size={16} aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            disabled={!c.dirty || c.busy || !!c.proposal}
            title={
              c.proposal
                ? 'Appliquez ou refusez la proposition d’abord.'
                : undefined
            }
            onClick={() => void saveScreen()}
          >
            <Save size={14} aria-hidden="true" />{' '}
            {c.busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </header>
      <p className="studio-status" role="status">
        {c.notice ||
          (c.proposal
            ? 'Proposition de Claude affichée dans l’aperçu : appliquez ou refusez.'
            : c.dirty
              ? 'Brouillon non enregistré (conservé localement).'
              : 'Écran enregistré.')}
      </p>

      <div
        className="studio-body"
        ref={body}
        style={{ gridTemplateColumns: `${ui.split}% 8px minmax(0, 1fr)` }}
      >
        <StudioChat c={c} />
        <div
          className="splitter"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Largeur du chat"
          aria-valuemin={22}
          aria-valuemax={60}
          aria-valuenow={ui.split}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={(e) => e.buttons === 1 && resize(e.clientX)}
          onKeyDown={(e) => {
            const d =
              e.key === 'ArrowLeft' ? -2 : e.key === 'ArrowRight' ? 2 : 0;
            if (d)
              setUi((u) => ({
                ...u,
                split: Math.min(60, Math.max(22, u.split + d)),
              }));
          }}
        />
        <div className="workspace" data-panel={ui.panel}>
          <div
            className="preview-area"
            data-over={over || undefined}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(dragType)) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={dropOnPreview}
          >
            {c.proposal && <span className="preview-flag">Proposition</span>}
            {over && (
              <div className="drop-hint" aria-hidden="true">
                Déposer dans « {target?.name ?? 'nouvelle section'} »
              </div>
            )}
            <Device
              view={view}
              onView={patchView}
              tokens={tokens}
              composition={shown}
              selected={c.selected}
              proposal={!!c.proposal}
              onSelect={select}
            />
          </div>
          {ui.panel === 'library' && (
            <LibraryPanel
              tokens={tokens}
              target={target?.name}
              onAdd={(k, v) => c.addItem(k, v)}
            />
          )}
          {ui.panel === 'layers' && <LayersPanel c={c} />}
        </div>
      </div>

      {dialog && (
        <div className="dialog-backdrop" onClick={() => setDialog(undefined)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setDialog(undefined)}
          >
            <div className="panel-head">
              <h2 id="studio-dialog">
                {dialog === 'export'
                  ? 'Export React / TS'
                  : 'Versions de l’écran'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                autoFocus
                onClick={() => setDialog(undefined)}
              >
                ✕
              </Button>
            </div>
            {dialog === 'export' ? (
              <>
                <pre className="code" tabIndex={0}>
                  <code>{code}</code>
                </pre>
                <div className="row">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(code)
                        .then(() => setCopied(true));
                    }}
                  >
                    {copied ? 'Copié' : 'Copier'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(
                        new Blob([code], { type: 'text/plain' }),
                      );
                      a.download = `${c.draft.name || 'ecran'}.tsx`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                  >
                    Télécharger .tsx
                  </Button>
                </div>
              </>
            ) : versions.length ? (
              <ul className="versions">
                {versions.map((v) => (
                  <li key={v.date}>
                    <span>
                      {new Date(v.date).toLocaleString('fr-FR')} ·{' '}
                      {v.composition.sections.length} section(s)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const n = normalizeComposition(v.composition);
                        if (n) c.restore(n);
                        setDialog(undefined);
                      }}
                    >
                      Restaurer
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                Aucune version : enregistrez l’écran pour en créer une.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

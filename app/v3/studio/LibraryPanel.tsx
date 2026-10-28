import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, X } from 'lucide-react';
import type { Tokens } from '../../shared/model.js';
import {
  blockKinds,
  blockSpecs,
  emptyComposition,
  newItem,
  newSection,
  type BlockKind,
} from '../../shared/composition.js';
import { defaultConfig } from '../../client/design/componentSpecs.js';
import { blockDrag as dragType } from '../../client/design/CompositionView.js';
export { dragType };

// Bibliothèque : composants réels du DS uniquement (registre blockSpecs).
// Chips = catégories principales ; plusieurs chips = union stricte. Les
// composants de niche (kit, planning…) se trouvent par la recherche. Sans
// filtre ni recherche : état vide, aucune galerie. La galerie rend chaque
// variante avec les vrais composants : glisser vers l'écran, ou clic.
const main: BlockKind[] = [
  'heading',
  'text',
  'button',
  'field',
  'badge',
  'card',
  'navigation',
  'form',
  'group',
];
export default function LibraryPanel({
  tokens,
  target,
  onAdd,
}: {
  tokens?: Tokens;
  target?: string;
  onAdd: (kind: BlockKind, variant: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<BlockKind[]>([]);
  const query = search.trim().toLowerCase();
  const idle = !picked.length && !query;
  const shown = blockKinds.filter(
    (k) =>
      !idle &&
      (!picked.length || picked.includes(k)) &&
      (!query ||
        `${blockSpecs[k].label} ${blockSpecs[k].description} ${blockSpecs[k].category} ${k}`
          .toLowerCase()
          .includes(query)),
  );
  const gallery = useMemo(() => {
    const c = emptyComposition('Bibliothèque');
    c.sections = shown.map((k) => ({
      ...newSection('grid', 2),
      gap: 'sm' as const,
      name: blockSpecs[k].label,
      items: blockSpecs[k].variants.map(([v]) => ({
        ...newItem(k, v),
        span: 1,
        children: undefined,
        box: undefined,
      })),
    }));
    return c;
  }, [shown.join()]);
  const frame = useRef<HTMLIFrameElement>(null);
  const add = useRef(onAdd);
  add.current = onAdd;
  useEffect(() => {
    const send = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'ds-preview',
          tokens,
          screen: 'compose',
          config: defaultConfig,
          composition: gallery,
          interact: false,
          palette: true,
        },
        location.origin,
      );
    if (tokens) send();
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === 'ds-preview-ready' && tokens) send();
      if (
        e.data?.type === 'ds-pick' &&
        blockKinds.includes(e.data.kind as BlockKind)
      )
        add.current(e.data.kind as BlockKind, String(e.data.variant));
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [gallery, tokens]);
  const toggle = (k: BlockKind) =>
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div className="library" aria-label="Bibliothèque du DS">
      <input
        type="search"
        className="input input-sm"
        aria-label="Rechercher un composant"
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="chips" role="group" aria-label="Filtrer par catégorie">
        {main.map((k) =>
          picked.includes(k) ? (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed="true"
              aria-label={`Retirer le filtre ${blockSpecs[k].label}`}
              onClick={() => toggle(k)}
            >
              {blockSpecs[k].label}
              <X size={12} aria-hidden="true" />
            </button>
          ) : (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed="false"
              onClick={() => toggle(k)}
            >
              {blockSpecs[k].label}
            </button>
          ),
        )}
        {picked.length > 1 && (
          <button
            type="button"
            className="chip chip-clear"
            onClick={() => setPicked([])}
          >
            Effacer les filtres
          </button>
        )}
      </div>
      {!idle && (
        <p className="muted small" aria-live="polite">
          {shown.length} composant{shown.length > 1 ? 's' : ''} · ajout dans{' '}
          <strong>{target ?? 'nouvelle section'}</strong>
        </p>
      )}
      {shown.length ? (
        <iframe
          ref={frame}
          className="gallery"
          title="Galerie des composants du DS"
          src="/index.html?preview=1&scenario=compose"
        />
      ) : idle ? (
        <div className="library-empty">
          <LayoutGrid size={20} aria-hidden="true" />
          <p>Choisissez une catégorie ou recherchez un composant.</p>
        </div>
      ) : (
        <p className="muted">Aucun composant du DS ne correspond.</p>
      )}
    </div>
  );
}

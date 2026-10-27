import { useEffect, useRef, useState } from 'react';
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
import { Badge, Button } from '../ui.js';

// Bibliothèque : composants réels du projet uniquement (registre
// blockSpecs). Glisser vers un calque ou une zone de l'aperçu, ou « + ».
import { blockDrag as dragType } from '../../client/design/CompositionView.js';
export { dragType };
const categories = [...new Set(blockKinds.map((k) => blockSpecs[k].category))];
// Composants demandés mais absents du DS : signalés, jamais inventés.
const missing = ['Modale', 'Menu déroulant', 'Onglets Lisière', 'Tableau'];

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
  const [focus, setFocus] = useState<BlockKind>('button');
  const query = search.trim().toLowerCase();
  const kinds = blockKinds.filter((k) =>
    `${blockSpecs[k].label} ${blockSpecs[k].description} ${blockSpecs[k].category} ${k}`
      .toLowerCase()
      .includes(query),
  );
  // Aperçu réel : toutes les variantes du composant choisi, rendues par la
  // route d'aperçu isolée.
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const spec = blockSpecs[focus];
    const gallery = emptyComposition(spec.label);
    gallery.sections = [
      {
        ...newSection('stack'),
        items: spec.variants.map(([v]) => ({
          ...newItem(focus, v),
          span: 4,
        })),
      },
    ];
    const send = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'ds-preview',
          tokens,
          screen: 'compose',
          config: defaultConfig,
          composition: gallery,
          interact: true,
        },
        location.origin,
      );
    if (tokens) send();
    const onReady = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && tokens) send();
    };
    addEventListener('message', onReady);
    return () => removeEventListener('message', onReady);
  }, [focus, tokens]);

  return (
    <div className="library" aria-label="Bibliothèque du DS">
      <p className="muted small">
        Ajout dans : <strong>{target ?? 'nouvelle section'}</strong>
      </p>
      <input
        type="search"
        className="input"
        aria-label="Rechercher un composant"
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="library-scroll">
        {categories.map((cat) => {
          const list = kinds.filter((k) => blockSpecs[k].category === cat);
          if (!list.length) return null;
          return (
            <section key={cat}>
              <h3 className="panel-sub">{cat}</h3>
              <ul className="library-list">
                {list.map((k) => (
                  <li
                    key={k}
                    draggable
                    aria-current={focus === k ? 'true' : undefined}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        dragType,
                        JSON.stringify({
                          kind: k,
                          variant: blockSpecs[k].variants[0][0],
                        }),
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                  >
                    <button
                      type="button"
                      className="library-pick"
                      onClick={() => setFocus(k)}
                    >
                      <strong>{blockSpecs[k].label}</strong>
                      <small>
                        {blockSpecs[k].variants.length} variante
                        {blockSpecs[k].variants.length > 1 ? 's' : ''} ·{' '}
                        {blockSpecs[k].family}
                      </small>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ajouter ${blockSpecs[k].label}`}
                      onClick={() => onAdd(k, blockSpecs[k].variants[0][0])}
                    >
                      +
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!kinds.length && (
          <p className="muted">Aucun composant existant ne correspond.</p>
        )}
        <section>
          <h3 className="panel-sub">Courants mais absents du DS</h3>
          <p className="missing">
            {missing.map((m) => (
              <Badge key={m} variant="outline">
                {m}
              </Badge>
            ))}
          </p>
          <p className="muted small">
            Import Figma, React ou tokens : prévu, non branché.
          </p>
        </section>
      </div>
      <figure className="library-preview">
        <figcaption>
          {blockSpecs[focus].label} · {blockSpecs[focus].description}
        </figcaption>
        <iframe
          ref={frame}
          title={`Aperçu des variantes : ${blockSpecs[focus].label}`}
          src="/index.html?preview=1&scenario=compose"
        />
      </figure>
    </div>
  );
}

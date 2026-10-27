import { useState } from 'react';
import type { Tokens } from '../../shared/model.js';
import {
  blockKinds,
  blockSpecs,
  newItem,
  type BlockKind,
  type Layout,
} from '../../shared/composition.js';
import { DSProvider } from '../DesignSystem.js';
import { Block } from './CompositionView.js';

const layoutsOffered: [Layout, number, string, string][] = [
  ['stack', 1, 'Pile verticale', 'Éléments les uns sous les autres.'],
  ['row', 1, 'Rangée', 'Côte à côte, passe à la ligne si besoin.'],
  ['grid', 2, 'Grille 2 colonnes', 'Une colonne sous 560 px.'],
  ['grid', 3, 'Grille 3 colonnes', 'Une colonne sous 560 px.'],
  ['grid', 4, 'Grille 4 colonnes', 'Une colonne sous 560 px.'],
];
const categories = [...new Set(blockKinds.map((k) => blockSpecs[k].category))];

function Entry({
  kind,
  tokens,
  onAdd,
}: {
  kind: BlockKind;
  tokens: Tokens;
  onAdd: (kind: BlockKind, variant: string) => void;
}) {
  const spec = blockSpecs[kind];
  const [variant, setVariant] = useState(spec.variants[0][0]);
  return (
    <li className="lib-entry">
      <div className="lib-preview" inert aria-hidden="true">
        <DSProvider tokens={tokens}>
          <Block item={newItem(kind, variant)} />
        </DSProvider>
      </div>
      <div className="lib-meta">
        <strong>{spec.label}</strong>
        <small>
          {spec.family} · {spec.description}
        </small>
        <div className="lib-actions">
          {spec.variants.length > 1 && (
            <select
              aria-label={`Variante ${spec.label}`}
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            >
              {spec.variants.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            aria-label={`Ajouter ${spec.label}`}
            onClick={() => onAdd(kind, variant)}
          >
            + Ajouter
          </button>
        </div>
      </div>
    </li>
  );
}

// Bibliothèque : uniquement les composants existants du projet, classés par
// catégorie. « Ajouter » place le bloc dans la section sélectionnée.
export default function Library({
  tokens,
  target,
  onAdd,
  onAddSection,
}: {
  tokens: Tokens;
  target?: string;
  onAdd: (kind: BlockKind, variant: string) => void;
  onAddSection: (layout: Layout, columns: number) => void;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const match = (text: string) => !query || text.toLowerCase().includes(query);
  const layoutsShown = layoutsOffered.filter(([, , label, hint]) =>
    match(`${label} ${hint} mise en page layout`),
  );
  return (
    <div className="library">
      <label className="field">
        Rechercher un composant
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="carte, bouton, grille…"
        />
      </label>
      <p className="lib-target">
        Ajout dans : <strong>{target ?? 'nouvelle section'}</strong>
      </p>
      {layoutsShown.length > 0 && (
        <section className="lib-group">
          <h3>Mises en page</h3>
          <ul className="lib-layouts">
            {layoutsShown.map(([layout, columns, label, hint]) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => onAddSection(layout, columns)}
                  aria-label={`Ajouter une section ${label}`}
                >
                  <span
                    className={`lib-glyph ${layout} c${columns}`}
                    aria-hidden="true"
                  >
                    {Array.from(
                      { length: layout === 'grid' ? columns : 3 },
                      (_, i) => (
                        <i key={i} />
                      ),
                    )}
                  </span>
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {categories.map((category) => {
        const kinds = blockKinds.filter(
          (k) =>
            blockSpecs[k].category === category &&
            match(
              `${blockSpecs[k].label} ${blockSpecs[k].description} ${category} ${k}`,
            ),
        );
        if (!kinds.length) return null;
        return (
          <section key={category} className="lib-group">
            <h3>{category}</h3>
            <ul className="lib-list">
              {kinds.map((k) => (
                <Entry key={k} kind={k} tokens={tokens} onAdd={onAdd} />
              ))}
            </ul>
          </section>
        );
      })}
      {query &&
        !layoutsShown.length &&
        !blockKinds.some((k) =>
          match(`${blockSpecs[k].label} ${blockSpecs[k].description} ${k}`),
        ) && (
          <p className="editor-hint">
            Aucun composant existant ne correspond. Rien n’est créé hors du
            Design System.
          </p>
        )}
    </div>
  );
}

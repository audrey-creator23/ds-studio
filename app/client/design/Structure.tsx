import { useState } from 'react';
import type { Tokens } from '../../shared/model.js';
import {
  aligns,
  blockSpecs,
  gaps,
  layoutLabels,
  layouts,
  type Item,
  type Section,
} from '../../shared/composition.js';
import type { CompositionState } from './useComposition.js';

const alignLabels = {
  start: 'Début',
  center: 'Centre',
  end: 'Fin',
  stretch: 'Étirer',
};
const itemName = (i: Item) =>
  `${blockSpecs[i.kind].label}${i.text ? ` · ${i.text.slice(0, 28)}` : ''}`;

function ItemInspector({
  item,
  section,
  c,
}: {
  item: Item;
  section: Section;
  c: CompositionState;
}) {
  const spec = blockSpecs[item.kind];
  const set = (patch: Partial<Item>) => c.patchItem(item.id, patch);
  return (
    <div className="inspector" aria-label={`Propriétés : ${spec.label}`}>
      <h3>{spec.label}</h3>
      {spec.variants.length > 1 && (
        <label className="field">
          Variante
          <select
            value={item.variant}
            onChange={(e) => set({ variant: e.target.value })}
          >
            {spec.variants.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {spec.sizes && (
        <fieldset className="segmented">
          <legend>Taille</legend>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <label key={size}>
              <input
                type="radio"
                name={`size-${item.id}`}
                checked={item.size === size}
                onChange={() => set({ size })}
              />
              {size.toUpperCase()}
            </label>
          ))}
        </fieldset>
      )}
      {spec.text !== undefined && (
        <label className="field">
          {item.kind === 'panel' ? 'Titre' : 'Texte'}
          <input
            value={item.text}
            maxLength={160}
            onChange={(e) => set({ text: e.target.value })}
          />
        </label>
      )}
      <fieldset className="inspector-group">
        <legend>Dimensions</legend>
        {section.layout === 'grid' ? (
          <>
            <label className="field">
              Colonnes occupées
              <select
                value={Math.min(item.span, section.columns)}
                onChange={(e) => set({ span: Number(e.target.value) })}
              >
                {Array.from({ length: section.columns }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1} / {section.columns}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Lignes occupées
              <select
                value={item.rows}
                onChange={(e) => set({ rows: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="field">
            Largeur
            <select
              value={item.width}
              onChange={(e) => set({ width: e.target.value as Item['width'] })}
            >
              <option value="fill">Remplir (fill)</option>
              <option value="hug">Contenu (hug)</option>
            </select>
          </label>
        )}
        <p className="inspector-note">
          Sous 560 px, l’élément prend toute la largeur.
        </p>
      </fieldset>
      <fieldset className="inspector-group">
        <legend>Position</legend>
        <label className="field">
          Section
          <select
            value={section.id}
            onChange={(e) => c.moveTo(item.id, e.target.value)}
          >
            {c.draft.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="inspector-row">
          <button type="button" onClick={() => c.move(item.id, -1)}>
            ↑ Avant
          </button>
          <button type="button" onClick={() => c.move(item.id, 1)}>
            ↓ Après
          </button>
          <button type="button" onClick={() => c.duplicate(item.id)}>
            Dupliquer
          </button>
          <button
            type="button"
            className="danger-link"
            onClick={() => c.remove(item.id)}
          >
            Retirer
          </button>
        </div>
      </fieldset>
    </div>
  );
}

function SectionInspector({
  section,
  tokens,
  c,
}: {
  section: Section;
  tokens: Tokens;
  c: CompositionState;
}) {
  const set = (patch: Partial<Section>) => c.patchSection(section.id, patch);
  return (
    <div className="inspector" aria-label={`Propriétés : ${section.name}`}>
      <h3>Section</h3>
      <label className="field">
        Nom de la section
        <input
          value={section.name}
          maxLength={40}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <label className="field">
        Disposition
        <select
          value={section.layout}
          onChange={(e) => {
            const layout = e.target.value as Section['layout'];
            set({
              layout,
              columns: layout === 'grid' ? Math.max(2, section.columns) : 1,
            });
          }}
        >
          {layouts.map((l) => (
            <option key={l} value={l}>
              {layoutLabels[l]}
            </option>
          ))}
        </select>
      </label>
      {section.layout === 'grid' && (
        <label className="field">
          Colonnes
          <select
            value={section.columns}
            onChange={(e) => set({ columns: Number(e.target.value) })}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        Espacement
        <select
          value={section.gap}
          onChange={(e) => set({ gap: e.target.value as Section['gap'] })}
        >
          {gaps.map((g) => (
            <option key={g} value={g}>
              space.{g} · {tokens[`space.${g}`].$value} px
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Alignement
        <select
          value={section.align}
          onChange={(e) => set({ align: e.target.value as Section['align'] })}
        >
          {aligns.map((a) => (
            <option key={a} value={a}>
              {alignLabels[a]}
            </option>
          ))}
        </select>
      </label>
      <div className="inspector-row">
        <button type="button" onClick={() => c.move(section.id, -1)}>
          ↑ Monter
        </button>
        <button type="button" onClick={() => c.move(section.id, 1)}>
          ↓ Descendre
        </button>
        <button
          type="button"
          className="danger-link"
          onClick={() => c.remove(section.id)}
        >
          Supprimer la section
        </button>
      </div>
    </div>
  );
}

// Structure de la page (calques) : sélection, réorganisation au clavier ou
// par glisser-déposer, puis propriétés de l'élément sélectionné.
export default function Structure({
  c,
  tokens,
}: {
  c: CompositionState;
  tokens: Tokens;
}) {
  const [dragged, setDragged] = useState<string>();
  const selectedSection = c.draft.sections.find((s) => s.id === c.selected);
  const selectedItem = c.draft.sections
    .flatMap((s) => s.items.map((i) => ({ i, s })))
    .find(({ i }) => i.id === c.selected);
  const drop = (sectionId: string, index?: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragged) c.moveTo(dragged, sectionId, index);
    setDragged(undefined);
  };
  return (
    <div className="structure">
      <ol className="tree" aria-label="Structure de la page">
        {c.draft.sections.map((s) => (
          <li
            key={s.id}
            className="tree-section"
            onDragOver={(e) => dragged && e.preventDefault()}
            onDrop={drop(s.id)}
          >
            <button
              type="button"
              className={`tree-node${c.selected === s.id ? ' is-selected' : ''}`}
              aria-pressed={c.selected === s.id}
              onClick={() => c.select(s.id)}
            >
              <span>{s.name}</span>
              <small>
                {layoutLabels[s.layout]}
                {s.layout === 'grid' ? ` · ${s.columns} col.` : ''}
              </small>
            </button>
            <ol>
              {s.items.map((i, index) => (
                <li
                  key={i.id}
                  draggable
                  onDragStart={() => setDragged(i.id)}
                  onDragEnd={() => setDragged(undefined)}
                  onDragOver={(e) => dragged && e.preventDefault()}
                  onDrop={drop(s.id, index)}
                  className={dragged === i.id ? 'is-dragging' : ''}
                >
                  <button
                    type="button"
                    className={`tree-node${c.selected === i.id ? ' is-selected' : ''}`}
                    aria-pressed={c.selected === i.id}
                    onClick={() => c.select(i.id)}
                  >
                    <span aria-hidden="true" className="tree-grip">
                      ⋮⋮
                    </span>
                    <span>{itemName(i)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      {!c.draft.sections.length && (
        <p className="editor-hint">Aucune section. Ajoutez une mise en page.</p>
      )}
      {selectedItem && (
        <ItemInspector item={selectedItem.i} section={selectedItem.s} c={c} />
      )}
      {selectedSection && (
        <SectionInspector section={selectedSection} tokens={tokens} c={c} />
      )}
      {!c.selected && (
        <p className="editor-hint">
          Sélectionnez un élément ici ou dans l’aperçu pour régler ses
          propriétés, sa position et ses dimensions.
        </p>
      )}
    </div>
  );
}

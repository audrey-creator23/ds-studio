import { useState, type DragEvent, type ReactNode } from 'react';
import {
  aligns,
  blockSpecs,
  gaps,
  layoutLabels,
  layouts,
  sizes,
  widths,
  type BlockKind,
  type Item,
  type Section,
} from '../../shared/composition.js';
import type { CompositionState } from '../../client/design/useComposition.js';
import { Button } from '../ui.js';
import { dragType } from './LibraryPanel.js';

// Calques : sections (conteneurs Flex/Grid) et blocs. Glisser-déposer pour
// réordonner, déplacer d'une section à l'autre ou ajouter depuis la
// bibliothèque ; boutons équivalents au clavier. Propriétés contextuelles.
const moveType = 'application/x-ds-move';
const gapLabels = { sm: 'Serré', md: 'Moyen', lg: 'Large' };
const alignLabels = {
  start: 'Début',
  center: 'Centre',
  end: 'Fin',
  stretch: 'Étirer',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="prop">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ItemProps({ c, item }: { c: CompositionState; item: Item }) {
  const spec = blockSpecs[item.kind];
  const set = (patch: Partial<Item>) => c.patchItem(item.id, patch);
  return (
    <>
      <Choice
        label="Variante"
        value={item.variant}
        options={spec.variants}
        onChange={(variant) => set({ variant })}
      />
      {spec.text !== undefined && (
        <Field label="Contenu">
          <input
            className="input"
            value={item.text}
            maxLength={160}
            onChange={(e) => set({ text: e.target.value })}
          />
        </Field>
      )}
      {spec.sizes && (
        <Choice
          label="Taille"
          value={item.size}
          options={sizes.map((s) => [s, s.toUpperCase()] as const)}
          onChange={(size) => set({ size })}
        />
      )}
      <div className="prop-row">
        <Choice
          label="Colonnes"
          value={String(item.span)}
          options={['1', '2', '3', '4'].map((n) => [n, n] as const)}
          onChange={(v) => set({ span: Number(v) })}
        />
        <Choice
          label="Lignes"
          value={String(item.rows)}
          options={['1', '2', '3', '4'].map((n) => [n, n] as const)}
          onChange={(v) => set({ rows: Number(v) })}
        />
      </div>
      <Choice
        label="Largeur"
        value={item.width}
        options={widths.map(
          (w) => [w, w === 'fill' ? 'Remplir' : 'Contenu'] as const,
        )}
        onChange={(width) => set({ width })}
      />
    </>
  );
}

function SectionProps({
  c,
  section,
}: {
  c: CompositionState;
  section: Section;
}) {
  const set = (patch: Partial<Section>) => c.patchSection(section.id, patch);
  return (
    <>
      <Field label="Nom">
        <input
          className="input"
          value={section.name}
          maxLength={60}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Choice
        label="Mise en page"
        value={section.layout}
        options={layouts.map((l) => [l, layoutLabels[l]] as const)}
        onChange={(layout) =>
          set({
            layout,
            columns: layout === 'grid' ? Math.max(2, section.columns) : 1,
          })
        }
      />
      {section.layout === 'grid' && (
        <Choice
          label="Colonnes"
          value={String(section.columns)}
          options={['2', '3', '4'].map((n) => [n, n] as const)}
          onChange={(v) => set({ columns: Number(v) })}
        />
      )}
      <div className="prop-row">
        <Choice
          label="Espacement"
          value={section.gap}
          options={gaps.map((g) => [g, gapLabels[g]] as const)}
          onChange={(gap) => set({ gap })}
        />
        <Choice
          label="Alignement"
          value={section.align}
          options={aligns.map((a) => [a, alignLabels[a]] as const)}
          onChange={(align) => set({ align })}
        />
      </div>
    </>
  );
}

export default function LayersPanel({ c }: { c: CompositionState }) {
  const [over, setOver] = useState<string>();
  const sel = c.selected;
  const section = c.draft.sections.find((s) => s.id === sel);
  const owner = c.draft.sections.find((s) => s.items.some((i) => i.id === sel));
  const item = owner?.items.find((i) => i.id === sel);

  // Dépôt : bloc de la bibliothèque (ajout) ou calque déplacé.
  function drop(e: DragEvent, sectionId: string, index?: number) {
    e.preventDefault();
    e.stopPropagation();
    setOver(undefined);
    const lib = e.dataTransfer.getData(dragType);
    const moved = e.dataTransfer.getData(moveType);
    if (lib) {
      const { kind, variant } = JSON.parse(lib) as {
        kind: BlockKind;
        variant: string;
      };
      c.select(sectionId);
      c.addItem(kind, variant);
      return;
    }
    if (!moved) return;
    if (c.draft.sections.some((s) => s.id === moved)) {
      // Section : nouvelle position dans la page.
      const from = c.draft.sections.findIndex((s) => s.id === moved);
      const to = c.draft.sections.findIndex((s) => s.id === sectionId);
      for (let i = 0; i < Math.abs(to - from); i++)
        c.move(moved, to > from ? 1 : -1);
    } else c.moveTo(moved, sectionId, index);
  }
  const zone = (id: string, index?: number) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(`${id}:${index ?? 'end'}`);
    },
    onDragLeave: () => setOver(undefined),
    onDrop: (e: DragEvent) => drop(e, id, index),
  });
  const grab = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(moveType, id);
      e.dataTransfer.effectAllowed = 'move';
    },
  });

  return (
    <aside className="panel layers-panel" aria-label="Calques et propriétés">
      <div className="panel-head">
        <h2>Calques</h2>
        <Button variant="ghost" size="sm" onClick={() => c.addSection('stack')}>
          + Section
        </Button>
      </div>
      <ol className="tree">
        {c.draft.sections.map((s) => (
          <li
            key={s.id}
            className="tree-section"
            data-over={over?.startsWith(`${s.id}:`) || undefined}
            {...zone(s.id)}
          >
            <div className="tree-row" {...grab(s.id)}>
              <button
                type="button"
                className="tree-pick"
                aria-pressed={sel === s.id}
                onClick={() => c.select(s.id)}
              >
                {s.name}
                <small>{layoutLabels[s.layout]}</small>
              </button>
            </div>
            <ol>
              {s.items.map((i, index) => (
                <li
                  key={i.id}
                  className="tree-row"
                  data-over={over === `${s.id}:${index}` || undefined}
                  {...grab(i.id)}
                  {...zone(s.id, index)}
                >
                  <button
                    type="button"
                    className="tree-pick"
                    aria-pressed={sel === i.id}
                    onClick={() => c.select(i.id)}
                  >
                    {blockSpecs[i.kind].label}
                    {i.text && <small>{i.text.slice(0, 24)}</small>}
                  </button>
                </li>
              ))}
              {!s.items.length && (
                <li className="tree-empty">Déposer un composant ici</li>
              )}
            </ol>
          </li>
        ))}
      </ol>
      {(item || section) && (
        <section className="props" aria-label="Propriétés">
          <div className="panel-head">
            <h2>{item ? blockSpecs[item.kind].label : 'Section'}</h2>
            <div className="prop-actions">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Monter"
                onClick={() => c.move(sel!, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descendre"
                onClick={() => c.move(sel!, 1)}
              >
                ↓
              </Button>
              {item && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dupliquer"
                  onClick={() => c.duplicate(item.id)}
                >
                  ⧉
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Supprimer"
                onClick={() => c.remove(sel!)}
              >
                ✕
              </Button>
            </div>
          </div>
          {item ? (
            <ItemProps c={c} item={item} />
          ) : (
            section && <SectionProps c={c} section={section} />
          )}
        </section>
      )}
    </aside>
  );
}

import { useState, type DragEvent } from 'react';
import {
  blockSpecs,
  layoutLabels,
  type BlockKind,
  type Item,
} from '../../shared/composition.js';
import type { CompositionState } from '../../client/design/useComposition.js';
import { blockDrag, moveDrag } from '../../client/design/CompositionView.js';
import { Button } from '../ui.js';

// Calques : sections > blocs et conteneurs > blocs. Glisser pour réordonner,
// changer de conteneur ou ajouter depuis la bibliothèque ; clic = sélection
// (synchronisée avec l'aperçu, la barre de propriétés et Claude).
export default function LayersPanel({ c }: { c: CompositionState }) {
  const [over, setOver] = useState<string>();
  const sel = c.selected;

  function drop(e: DragEvent, container: string, index?: number) {
    e.preventDefault();
    e.stopPropagation();
    setOver(undefined);
    const lib = e.dataTransfer.getData(blockDrag);
    const moved = e.dataTransfer.getData(moveDrag);
    if (lib) {
      const { kind, variant } = JSON.parse(lib) as {
        kind: BlockKind;
        variant: string;
      };
      c.addItem(kind, variant, container, index);
    } else if (moved && c.draft.sections.some((s) => s.id === moved)) {
      const from = c.draft.sections.findIndex((s) => s.id === moved);
      const to = c.draft.sections.findIndex((s) => s.id === container);
      for (let i = 0; i < Math.abs(to - from); i++)
        c.move(moved, to > from ? 1 : -1);
    } else if (moved) c.moveTo(moved, container, index);
  }
  const zone = (container: string, index?: number) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(`${container}:${index ?? 'end'}`);
    },
    onDragLeave: () => setOver(undefined),
    onDrop: (e: DragEvent) => drop(e, container, index),
  });
  const grab = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData(moveDrag, id);
      e.dataTransfer.effectAllowed = 'move';
    },
  });
  const row = (i: Item, container: string, index: number) => (
    <li
      key={i.id}
      className={i.kind === 'group' ? 'tree-section tree-group' : 'tree-row'}
      data-over={over === `${container}:${index}` || undefined}
      {...grab(i.id)}
      {...zone(container, index)}
    >
      <button
        type="button"
        className="tree-pick"
        aria-pressed={sel === i.id}
        onClick={() => c.select(i.id)}
      >
        {blockSpecs[i.kind].label}
        <small>
          {i.kind === 'group'
            ? layoutLabels[i.variant as keyof typeof layoutLabels]
            : i.text.slice(0, 28)}
        </small>
      </button>
      {i.kind === 'group' && (
        <ol {...zone(i.id)} data-over={over === `${i.id}:end` || undefined}>
          {(i.children ?? []).map((x, ci) => row(x as Item, i.id, ci))}
          {!i.children?.length && (
            <li className="tree-empty">Déposer dans le conteneur</li>
          )}
        </ol>
      )}
    </li>
  );

  return (
    <div className="layers">
      <div className="row">
        <Button
          variant="outline"
          size="sm"
          onClick={() => c.addSection('stack')}
        >
          + Section
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => c.addItem('group', 'row')}
        >
          + Conteneur
        </Button>
      </div>
      <ol className="tree" aria-label="Calques">
        {c.draft.sections.map((s) => (
          <li
            key={s.id}
            className="tree-section"
            data-over={over === `${s.id}:end` || undefined}
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
              {s.items.map((i, index) => row(i, s.id, index))}
              {!s.items.length && (
                <li className="tree-empty">Déposer un composant ici</li>
              )}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

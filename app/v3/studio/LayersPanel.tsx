import { useState, type DragEvent, type MouseEvent } from 'react';
import { Box, LayoutTemplate, Pencil, Square } from 'lucide-react';
import {
  blockSpecs,
  layoutLabels,
  type BlockKind,
  type Item,
} from '../../shared/composition.js';
import type { CompositionState } from '../../client/design/useComposition.js';
import { blockDrag, moveDrag } from '../../client/design/CompositionView.js';
import { Button } from '../ui.js';

// Calques : sections > blocs et conteneurs > blocs, avec guides d'indentation
// par niveau. Glisser pour réordonner, changer de conteneur ou ajouter depuis
// la bibliothèque ; Maj / ⌘ + clic pour sélectionner plusieurs blocs ;
// crayon pour renommer (nom enregistré avec l'écran).
export default function LayersPanel({
  c,
  multi,
  onSelect,
}: {
  c: CompositionState;
  multi: string[];
  onSelect: (id: string, additive?: boolean) => void;
}) {
  const [over, setOver] = useState<string>();
  const [renaming, setRenaming] = useState<string>();
  const [name, setName] = useState('');
  const sel = c.selected;
  const chosen = (id: string) => sel === id || multi.includes(id);

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
  function startRename(id: string, current: string) {
    setRenaming(id);
    setName(current);
  }
  function commit(id: string, isSection: boolean) {
    const value = name.trim();
    if (isSection) c.patchSection(id, { name: value || 'Section' });
    else c.patchItem(id, { label: value || undefined });
    setRenaming(undefined);
  }
  const pick = (id: string) => (e: MouseEvent) =>
    onSelect(id, e.shiftKey || e.metaKey || e.ctrlKey);

  // Rendu de ligne (fonction, pas composant : garde le focus du renommage).
  function row({
    id,
    label,
    hint,
    level,
    icon,
    isSection = false,
  }: {
    id: string;
    label: string;
    hint?: string;
    level: number;
    icon: typeof Box;
    isSection?: boolean;
  }) {
    const Icon = icon;
    return (
      <div className="tree-line" data-level={level} {...grab(id)}>
        {renaming === id ? (
          <input
            className="input input-sm tree-rename"
            aria-label={`Renommer ${label}`}
            autoFocus
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => commit(id, isSection)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(id, isSection);
              if (e.key === 'Escape') setRenaming(undefined);
            }}
          />
        ) : (
          <button
            type="button"
            className="tree-pick"
            aria-pressed={chosen(id)}
            onClick={pick(id)}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="tree-name">{label}</span>
            {hint && <small>{hint}</small>}
          </button>
        )}
        <button
          type="button"
          className="tree-edit"
          aria-label={`Renommer ${label}`}
          title="Renommer"
          onClick={() => startRename(id, label)}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      </div>
    );
  }
  const item = (i: Item, container: string, index: number, level: number) => {
    const label = i.label || blockSpecs[i.kind].label;
    return (
      <li
        key={i.id}
        className={i.kind === 'group' ? 'tree-node tree-group' : 'tree-node'}
        data-over={over === `${container}:${index}` || undefined}
        {...zone(container, index)}
      >
        {row({
          id: i.id,
          label: label,
          level: level,
          icon: i.kind === 'group' ? Box : Square,
          hint:
            i.kind === 'group'
              ? layoutLabels[i.variant as keyof typeof layoutLabels]
              : i.label
                ? blockSpecs[i.kind].label
                : i.text.slice(0, 24),
        })}
        {i.kind === 'group' && (
          <ol {...zone(i.id)} data-over={over === `${i.id}:end` || undefined}>
            {(i.children ?? []).map((x, ci) =>
              item(x as Item, i.id, ci, level + 1),
            )}
            {!i.children?.length && (
              <li className="tree-empty" data-level={level + 1}>
                Déposer dans le conteneur
              </li>
            )}
          </ol>
        )}
      </li>
    );
  };

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
            className="tree-node tree-section"
            data-over={over === `${s.id}:end` || undefined}
            {...zone(s.id)}
          >
            {row({
              id: s.id,
              label: s.name,
              hint: layoutLabels[s.layout],
              level: 0,
              icon: LayoutTemplate,
              isSection: true,
            })}
            <ol>
              {s.items.map((i, index) => item(i, s.id, index, 1))}
              {!s.items.length && (
                <li className="tree-empty" data-level={1}>
                  Déposer un composant ici
                </li>
              )}
            </ol>
          </li>
        ))}
      </ol>
      <p className="muted small">Maj ou ⌘ + clic : sélection multiple.</p>
    </div>
  );
}

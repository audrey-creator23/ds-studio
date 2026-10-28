import {
  Fragment,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
} from 'react';
import { StatusSummary, TaskProgress } from '../ui.js';
import type { Tokens } from '../../shared/model.js';
import {
  blockSpecs,
  type Composition,
  type Item,
} from '../../shared/composition.js';
import {
  Badge,
  BookingCard,
  Button,
  DSProvider,
  ExampleForm,
  Field,
  Navigation,
} from '../DesignSystem.js';
import { Card } from '../Card.js';
import { MantineBlock } from './MantineBlocks.js';
import { Timeline } from '../ProjectContent.js';
import { useTasks } from '../useTasks.js';
import { progress } from '../../shared/brief.js';

function PlanningBlock() {
  const { state } = useTasks();
  return (
    <Card emoji="📅" title="Planning">
      <Timeline state={state} />
    </Card>
  );
}
function ChecklistBlock() {
  const { state } = useTasks();
  const done = progress(state);
  return (
    <Card emoji="✅" title="Tâches">
      <TaskProgress value={done} />
      <StatusSummary state={state} />
    </Card>
  );
}

// Un bloc = un composant existant du projet, jamais une copie.
export function Block({ item }: { item: Item }) {
  switch (item.kind) {
    case 'heading':
      return item.variant === 'kicker' ? (
        <div className="section-label">{item.text}</div>
      ) : item.variant === 'section' ? (
        <h2 className="cmp-heading">{item.text}</h2>
      ) : (
        <h1 className="cmp-heading">{item.text}</h1>
      );
    case 'text':
      return <p className={`cmp-text ${item.variant}`}>{item.text}</p>;
    case 'button':
      return (
        <Button variant={item.variant as 'primary'} size={item.size}>
          {item.text || 'Bouton'}
        </Button>
      );
    case 'field':
      return <Field label={item.text || 'Libellé'} type={item.variant} />;
    case 'badge':
      return <Badge variant={item.variant}>{item.text || 'Badge'}</Badge>;
    case 'card':
      return <BookingCard variant={item.variant} />;
    case 'navigation':
      return <Navigation key={item.variant} initial={item.variant} />;
    case 'form':
      return <ExampleForm />;
    case 'panel':
      return (
        <Card emoji={item.variant} title={item.text || 'Carte'}>
          <p className="card-summary">Contenu de la carte, à préciser.</p>
        </Card>
      );
    case 'planning':
      return <PlanningBlock />;
    case 'checklist':
      return <ChecklistBlock />;
    default:
      return <MantineBlock item={item} />;
  }
}

// Glisser-déposer dans l'écran (mode édition) : un dépôt est relayé au studio
// (bloc de la bibliothèque ou bloc déplacé), qui modifie le brouillon.
export const blockDrag = 'application/x-ds-block';
export const moveDrag = 'application/x-ds-move';
export interface DropEvent {
  container: string;
  index: number;
  block?: { kind: string; variant: string };
  move?: string;
}
type Box = {
  id: string;
  layout: string;
  columns: number;
  gap: string;
  align: string;
  justify: string;
  padding: string;
  margin?: string;
};

// Rendu responsive : Flex pour les piles et rangées, Grid pour les grilles,
// avec repli sur une colonne sous 560 px (requêtes de conteneur). Un
// conteneur imbriqué (bloc « group ») se rend comme une section.
export function CompositionView({
  tokens,
  composition,
  selected,
  interact,
  onSelect,
  onDrop,
  onPick,
}: {
  tokens: Tokens;
  composition: Composition;
  // Une sélection simple ou multiple (Maj / ⌘ + clic pour ajouter).
  selected?: string | string[];
  interact: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onDrop?: (drop: DropEvent) => void;
  // Galerie de la bibliothèque : chaque bloc se glisse vers l'écran ou
  // s'ajoute au clic / clavier ; légende « composant · variante ».
  onPick?: (block: { kind: string; variant: string }) => void;
}) {
  const [over, setOver] = useState<{ container: string; index: number }>();
  const editing = !interact;
  const chosen = new Set(
    Array.isArray(selected) ? selected : selected ? [selected] : [],
  );
  const isSel = (id: string) => chosen.has(id);
  const pick = (id: string) => (e: MouseEvent) => {
    if (interact) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(id, e.shiftKey || e.metaKey || e.ctrlKey);
  };
  // Position d'insertion : avant ou après le bloc survolé, selon l'axe ;
  // recalculée au dépôt pour ne pas dépendre du dernier survol.
  const accepts = (e: DragEvent) =>
    editing &&
    !!onDrop &&
    (e.dataTransfer.types.includes(blockDrag) ||
      e.dataTransfer.types.includes(moveDrag));
  function spot(e: DragEvent, container: string, index: number, row: boolean) {
    if (index < 0) return { container, index: -index - 1 };
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = row
      ? e.clientX > r.left + r.width / 2
      : e.clientY > r.top + r.height / 2;
    return { container, index: index + (after ? 1 : 0) };
  }
  function hover(e: DragEvent, container: string, index: number, row: boolean) {
    if (!accepts(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const next = spot(e, container, index, row);
    if (over?.container !== next.container || over.index !== next.index)
      setOver(next);
  }
  function drop(e: DragEvent, container: string, index: number, row: boolean) {
    if (!accepts(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = e.dataTransfer.getData(blockDrag);
    const move = e.dataTransfer.getData(moveDrag);
    onDrop!({
      ...spot(e, container, index, row),
      block: block ? JSON.parse(block) : undefined,
      move: move || undefined,
    });
    setOver(undefined);
  }
  const line = (container: string, index: number) =>
    over?.container === container && over.index === index ? (
      <div className="cmp-drop-line" aria-hidden="true" />
    ) : null;
  const classes = (b: Box) =>
    `cmp-section layout-${b.layout} gap-${b.gap} align-${b.align} justify-${b.justify} pad-${b.padding}${b.margin ? ` mar-${b.margin}` : ''}`;

  function body(box: Box, items: Item[]) {
    const row = box.layout === 'row';
    return (
      <div
        className="cmp-section-body"
        onDragOver={(e) => hover(e, box.id, -items.length - 1, row)}
        onDrop={(e) => drop(e, box.id, -items.length - 1, row)}
      >
        {!items.length && (
          <p className="cmp-placeholder">
            {editing ? 'Déposer un composant ici' : ''}
          </p>
        )}
        {onPick &&
          items.map((i) => {
            const spec = blockSpecs[i.kind];
            const variant =
              spec.variants.find(([v]) => v === i.variant)?.[1] ?? i.variant;
            const block = { kind: i.kind, variant: i.variant };
            return (
              <div
                key={i.id}
                className="cmp-item cmp-pick width-fill"
                style={{ '--span': box.columns } as CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`Ajouter ${spec.label}, variante ${variant}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(blockDrag, JSON.stringify(block));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onPick(block)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  onPick(block);
                }}
              >
                <span className="cmp-caption">
                  {spec.label} · {variant}
                </span>
                <div className="cmp-pick-body" inert>
                  <Block item={i} />
                </div>
              </div>
            );
          })}
        {!onPick &&
          items.map((i, index) => (
            <Fragment key={i.id}>
              {line(box.id, index)}
              <div
                data-id={i.id}
                data-ax={i.alignX}
                data-ay={i.alignY}
                className={`cmp-item width-${i.width}${isSel(i.id) ? ' is-selected' : ''}`}
                style={
                  {
                    '--span': Math.min(i.span, box.columns),
                    '--rows': i.rows,
                  } as CSSProperties
                }
                draggable={editing && !!onDrop}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData(moveDrag, i.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setOver(undefined)}
                onDragOver={(e) => hover(e, box.id, index, row)}
                onDrop={(e) => drop(e, box.id, index, row)}
                onClickCapture={i.kind === 'group' ? undefined : pick(i.id)}
              >
                {i.kind === 'group' && i.box ? (
                  <div
                    className={`cmp-group ${classes({ ...i.box, id: i.id, layout: i.variant })}${isSel(i.id) ? ' is-selected' : ''}`}
                    style={{ '--cols': i.box.columns } as CSSProperties}
                    onClick={pick(i.id)}
                    aria-label="Conteneur"
                  >
                    {body(
                      { ...i.box, id: i.id, layout: i.variant },
                      (i.children ?? []) as Item[],
                    )}
                  </div>
                ) : (
                  <Block item={i} />
                )}
              </div>
            </Fragment>
          ))}
        {!onPick && line(box.id, items.length)}
      </div>
    );
  }

  return (
    <DSProvider tokens={tokens}>
      <div
        className={`cmp-page${interact ? '' : ' is-editing'}`}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setOver(undefined);
        }}
      >
        {!composition.sections.length && (
          <p className="cmp-empty">
            Page vide : ajoutez une section depuis la bibliothèque ou décrivez
            la page à Claude.
          </p>
        )}
        {composition.sections.map((s) => (
          <section
            key={s.id}
            data-id={s.id}
            aria-label={s.name}
            className={`${classes(s)}${isSel(s.id) ? ' is-selected' : ''}`}
            style={{ '--cols': s.columns } as CSSProperties}
            onClick={pick(s.id)}
          >
            {body(s, s.items)}
          </section>
        ))}
      </div>
    </DSProvider>
  );
}

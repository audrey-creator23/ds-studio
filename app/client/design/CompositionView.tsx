import type { CSSProperties, MouseEvent } from 'react';
import { StatusSummary, TaskProgress } from '../ui.js';
import type { Tokens } from '../../shared/model.js';
import type { Composition, Item } from '../../shared/composition.js';
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

// Rendu responsive : Flex pour les piles et rangées, Grid pour les grilles,
// avec repli sur une colonne sous 560 px (requêtes de conteneur).
export function CompositionView({
  tokens,
  composition,
  selected,
  interact,
  onSelect,
}: {
  tokens: Tokens;
  composition: Composition;
  selected?: string;
  interact: boolean;
  onSelect: (id: string) => void;
}) {
  const pick = (id: string) => (e: MouseEvent) => {
    if (interact) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
  };
  return (
    <DSProvider tokens={tokens}>
      <div className={`cmp-page${interact ? '' : ' is-editing'}`}>
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
            className={`cmp-section layout-${s.layout} gap-${s.gap} align-${s.align}${selected === s.id ? ' is-selected' : ''}`}
            style={{ '--cols': s.columns } as CSSProperties}
            onClick={pick(s.id)}
          >
            <div className="cmp-section-body">
              {!s.items.length && (
                <p className="cmp-placeholder">{s.name} · section vide</p>
              )}
              {s.items.map((i) => (
                <div
                  key={i.id}
                  data-id={i.id}
                  className={`cmp-item width-${i.width}${selected === i.id ? ' is-selected' : ''}`}
                  style={
                    {
                      '--span': Math.min(i.span, s.columns),
                      '--rows': i.rows,
                    } as CSSProperties
                  }
                  onClickCapture={pick(i.id)}
                >
                  <Block item={i} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DSProvider>
  );
}

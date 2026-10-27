import type { Composition, Item } from '../../shared/composition.js';

// Export React/TS d'un écran composé : composants réels du projet (DS
// Lisière, blocs Mantine du kit), mises en page Flex/Grid de la composition.
// Les blocs du studio (planning, tâches, carte studio) passent par <Block>.
const q = (s: string) => JSON.stringify(s);
const attr = (s: string) => s.replace(/[{}<>]/g, '');

function jsx(i: Item): string {
  const text = attr(i.text);
  switch (i.kind) {
    case 'heading':
      return i.variant === 'kicker'
        ? `<div className="section-label">${text}</div>`
        : i.variant === 'section'
          ? `<h2 className="cmp-heading">${text}</h2>`
          : `<h1 className="cmp-heading">${text}</h1>`;
    case 'text':
      return `<p className=${q(`cmp-text ${i.variant}`)}>${text}</p>`;
    case 'button':
      return `<Button variant=${q(i.variant)} size=${q(i.size)}>${text || 'Bouton'}</Button>`;
    case 'field':
      return `<Field label=${q(i.text || 'Libellé')} type=${q(i.variant)} />`;
    case 'badge':
      return `<Badge variant=${q(i.variant)}>${text || 'Badge'}</Badge>`;
    case 'card':
      return `<BookingCard variant=${q(i.variant)} />`;
    case 'navigation':
      return `<Navigation initial=${q(i.variant)} />`;
    case 'form':
      return `<ExampleForm />`;
    default:
      return `<Block item={${JSON.stringify(i)}} />`;
  }
}

export function exportReact(c: Composition) {
  const name =
    c.name
      .normalize('NFD')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('') || 'Ecran';
  const sections = c.sections
    .map((s) => {
      const items = s.items
        .map(
          (i) =>
            `        <div className="cmp-item width-${i.width}" style={{ '--span': ${Math.min(i.span, s.columns)}, '--rows': ${i.rows} } as CSSProperties}>\n          ${jsx(i)}\n        </div>`,
        )
        .join('\n');
      return `      <section aria-label=${q(s.name)} className="cmp-section layout-${s.layout} gap-${s.gap} align-${s.align}" style={{ '--cols': ${s.columns} } as CSSProperties}>\n        <div className="cmp-section-body">\n${items}\n        </div>\n      </section>`;
    })
    .join('\n');
  return `// Écran « ${c.name} » exporté depuis DS-Studio (v3). Composants du DS.
import type { CSSProperties } from 'react';
import type { Tokens } from '../shared/model.js';
import { Badge, BookingCard, Button, DSProvider, ExampleForm, Field, Navigation } from './DesignSystem.js';
import { Block } from './design/CompositionView.js';

export default function ${name}({ tokens }: { tokens: Tokens }) {
  return (
    <DSProvider tokens={tokens}>
      <div className="cmp-page">
${sections}
      </div>
    </DSProvider>
  );
}
`;
}

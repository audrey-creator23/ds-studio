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

type Box = {
  layout: string;
  columns: number;
  gap: string;
  align: string;
  justify: string;
  padding: string;
  margin?: string;
};
const classes = (b: Box) =>
  `cmp-section layout-${b.layout} gap-${b.gap} align-${b.align} justify-${b.justify} pad-${b.padding}${b.margin ? ` mar-${b.margin}` : ''}`;
// Conteneur (section ou conteneur imbriqué) : mêmes classes Auto Layout.
function container(b: Box, items: Item[], pad: string): string {
  const inner = items
    .map((i) => {
      const content =
        i.kind === 'group' && i.box
          ? container(
              { ...i.box, layout: i.variant },
              (i.children ?? []) as Item[],
              pad + '    ',
            )
          : `${pad}    ${jsx(i)}`;
      const align = `${i.alignX ? ` data-ax=${q(i.alignX)}` : ''}${i.alignY ? ` data-ay=${q(i.alignY)}` : ''}`;
      return `${pad}  <div className="cmp-item width-${i.width}"${align} style={{ '--span': ${Math.min(i.span, b.columns)}, '--rows': ${i.rows} } as CSSProperties}>\n${content}\n${pad}  </div>`;
    })
    .join('\n');
  return `${pad}<div className=${q(classes(b) + (b.margin === undefined ? ' cmp-group' : ''))} style={{ '--cols': ${b.columns} } as CSSProperties}>\n${pad}  <div className="cmp-section-body">\n${inner}\n${pad}  </div>\n${pad}</div>`;
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
    .map((s) => container(s, s.items as Item[], '      '))
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

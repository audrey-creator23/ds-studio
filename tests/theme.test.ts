import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  palette,
  radii,
  radiusBase,
  roles,
  theme,
} from '../app/client/theme.js';
import {
  blockKinds,
  blockSpecs,
  newItem,
  normalizeComposition,
} from '../app/shared/composition.js';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test('thème : palette fournie, échelles de 10 teintes, rôles accessibles', () => {
  for (const [name, hex] of Object.entries(palette)) {
    const scale = theme.colors![name]!;
    assert.equal(scale.length, 10);
    assert.ok(scale.includes(hex), `${name} contient ${hex}`);
  }
  assert.equal(theme.primaryColor, 'ember');
  const white = '#FFFFFF';
  // Texte normal : 4,5:1 minimum (WCAG AA).
  for (const role of [
    'primary',
    'primaryHover',
    'danger',
    'dangerText',
  ] as const)
    assert.ok(contrast(roles[role], white) >= 4.5, role);
  for (const role of ['accent', 'warning'] as const)
    assert.ok(contrast(roles[role], roles.onAccent) >= 4.5, role);
  assert.ok(contrast(roles.primary, roles.primarySoft) >= 4.5);
  assert.ok(contrast(roles.warningText, roles.warningSoft) >= 4.5);
  assert.ok(contrast(white, roles.surfaceDark) >= 7);
  // Rayons : thème shadcn/create (--radius: 0.875rem), paliers par décalage.
  assert.equal(radiusBase, 14);
  assert.equal(theme.radius!.lg, '14px');
  assert.deepEqual(
    [radii.sm, radii.md, radii.xl, radii['3xl']],
    [10, 12, 18, 26],
  );
  // Anneau de focus : 3:1 minimum sur fond clair.
  assert.ok(contrast(roles.focus, white) >= 3);
});

test('bibliothèque : composants du kit (Mantine) exposés et validés', () => {
  const mantine = Object.entries(blockSpecs).filter(
    ([, s]) => s.family === 'Mantine',
  );
  assert.deepEqual(
    mantine.map(([k]) => k),
    [
      'mButton',
      'mBadge',
      'mAlert',
      'mProgress',
      'mInput',
      'mTabs',
      'mCard',
      'mBubble',
    ],
  );
  const c = normalizeComposition({
    name: 'Mantine',
    sections: [
      {
        items: [
          { kind: 'mButton', variant: 'ghost', size: 'lg' },
          { id: 'mBad-ancien', kind: 'mBadge', variant: 'inconnue' },
        ],
      },
    ],
  })!;
  assert.equal(c.sections[0].items[0].variant, 'ghost');
  assert.equal(c.sections[0].items[1].variant, 'default');
  // Identifiants toujours en minuscules, même pour les blocs « m… ».
  for (const i of c.sections[0].items) assert.match(i.id, /^[a-z0-9-]+$/);
  for (const kind of blockKinds)
    assert.match(newItem(kind).id, /^[a-z0-9-]{1,32}$/, kind);
});

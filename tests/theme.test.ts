import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  radii,
  radiusBase,
  roles,
  shadcnDark,
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

test('thème : shadcn/create sombre, rôles accessibles', () => {
  // Valeurs du bloc .dark collé, converties d'oklch.
  assert.equal(shadcnDark.background, '#0A0A0A');
  assert.equal(shadcnDark.card, '#171717');
  assert.equal(shadcnDark.primary, '#E5E5E5');
  assert.equal(shadcnDark.mutedForeground, '#A1A1A1');
  assert.equal(theme.primaryColor, 'neutral');
  for (const scale of Object.values(theme.colors!))
    assert.equal(scale!.length, 10);
  // Texte normal : 4,5:1 minimum, sur la page et sur les cartes.
  for (const bg of [roles.page, roles.surface, roles.raised])
    for (const fg of [roles.text, roles.textMuted, roles.danger, roles.success])
      assert.ok(contrast(fg, bg) >= 4.5, `${fg} sur ${bg}`);
  assert.ok(contrast(roles.onPrimary, roles.primary) >= 4.5);
  assert.ok(contrast(roles.accent, roles.surface) >= 4.5);
  // Bordure de focus : 3:1 minimum.
  assert.ok(contrast(roles.focus, roles.page) >= 3);
  // Rayons : --radius: 0.875rem, paliers par décalage.
  assert.equal(radiusBase, 14);
  assert.equal(theme.radius!.lg, '14px');
  assert.deepEqual(
    [radii.sm, radii.md, radii.xl, radii['3xl']],
    [10, 12, 18, 26],
  );
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

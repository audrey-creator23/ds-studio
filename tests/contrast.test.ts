import assert from 'node:assert/strict';
import test from 'node:test';
import { hex, over, parse, propose, ratio } from '../app/v3/studio/contrast.js';

test('ratios WCAG de référence', () => {
  assert.equal(ratio(parse('#000000'), parse('#ffffff')).toFixed(1), '21.0');
  // #767676 sur blanc : le gris le plus clair conforme à 4,5:1.
  assert.ok(ratio(parse('#767676'), parse('#ffffff')) >= 4.5);
  assert.ok(ratio(parse('#777777'), parse('#ffffff')) < 4.5);
  // Transparence : noir à 50 % sur blanc = gris moyen.
  assert.equal(hex(over(parse('#00000080'), parse('#ffffff'))), '#7f7f7f');
});

test('correction minimale du fond, jamais en dessous du seuil', () => {
  const fg = parse('#ffffff');
  const bg = parse('#7a7a7a');
  const fix = propose({
    el: undefined as never,
    kind: 'text',
    ratio: ratio(fg, bg),
    required: 4.5,
    fg,
    bg,
    owner: '',
  })!;
  assert.ok(ratio(fg, fix) >= 4.5);
  // Minimale : un pas de moins ne suffirait pas.
  const lighter = parse(hex([fix[0] + 3, fix[1] + 3, fix[2] + 3, 1]));
  assert.ok(ratio(fg, lighter) < 4.51);
  // Grand texte : seuil 3:1, correction plus légère.
  const large = propose({
    el: undefined as never,
    kind: 'text',
    required: 3,
    fg,
    bg: parse('#bbbbbb'),
    owner: '',
  })!;
  assert.ok(ratio(fg, large) >= 3 && ratio(fg, large) < 3.2);
});

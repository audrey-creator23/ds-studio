import { test } from 'node:test';
import assert from 'node:assert/strict';
import { communeAt, communes } from '../app/v3/carte/communes.js';
import { phaseOf } from '../app/v3/volcan/phases.js';

test('34 communes officielles, WGS84, sans doublon', () => {
  assert.equal(communes.length, 34);
  assert.equal(new Set(communes.map((c) => c.code)).size, 34);
  for (const c of communes) {
    assert.match(c.code, /^972\d{2}$/);
    for (const [lon, lat] of c.rings.flat()) {
      assert.ok(lon > -61.3 && lon < -60.75, `${c.nom} : longitude ${lon}`);
      assert.ok(lat > 14.35 && lat < 14.9, `${c.nom} : latitude ${lat}`);
    }
  }
});

test('commune d’un point : terre ou mer', () => {
  assert.equal(communeAt(14.6037, -61.0699)?.nom, 'Fort-de-France');
  assert.equal(communeAt(14.7433, -61.1758)?.nom, 'Saint-Pierre');
  assert.equal(communeAt(14.7, -61.3), null);
});

test('volcan : 6 phases selon l’avancement réel, retour arrière', () => {
  assert.deepEqual(
    [0, 10, 20, 39, 40, 60, 80, 99, 100].map(phaseOf),
    [1, 1, 2, 2, 3, 4, 5, 5, 6],
  );
});

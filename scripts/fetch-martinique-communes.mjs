// Limites des 34 communes de la Martinique, officielles, pour la carte 3D.
// Source : API Découpage administratif (geo.api.gouv.fr, Etalab), contours
// issus d'IGN ADMIN EXPRESS, Licence Ouverte 2.0, WGS84 (lon, lat).
// Simplification Douglas-Peucker à ~25 m (sous la résolution du relief,
// ~75 m/pixel), coordonnées arrondies à 5 décimales (~1 m). Aucune
// géométrie ajoutée : seuls des sommets sont retirés.
// Écrit app/v3/carte/martinique-communes.json.
// Usage : node scripts/fetch-martinique-communes.mjs (réseau requis, une fois).
import { writeFile } from 'node:fs/promises';

const url =
  'https://geo.api.gouv.fr/communes?codeDepartement=972&format=geojson&geometry=contour&fields=nom,code';
const TOL = 0.00023; // degrés (~25 m)

const res = await fetch(url);
if (!res.ok) throw new Error(`geo.api.gouv.fr : ${res.status}`);
const { features } = await res.json();
if (features.length !== 34) throw new Error(`${features.length} communes`);

function simplify(pts) {
  const keep = new Uint8Array(pts.length);
  // Anneau fermé : découpé au sommet le plus éloigné du premier.
  let far = 0;
  pts.forEach(([x, y], k) => {
    if (Math.hypot(x - pts[0][0], y - pts[0][1]) > Math.hypot(pts[far][0] - pts[0][0], pts[far][1] - pts[0][1])) far = k;
  });
  keep[0] = keep[far] = keep[pts.length - 1] = 1;
  const stack = [[0, far], [far, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-12;
    let max = 0;
    let at = -1;
    for (let k = a + 1; k < b; k++) {
      const d = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / len;
      if (d > max) [max, at] = [d, k];
    }
    if (max > TOL) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, k) => keep[k]).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
}

const rings = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((p) => p[0]);
const out = {
  source: 'geo.api.gouv.fr (Etalab), contours IGN ADMIN EXPRESS, Licence Ouverte 2.0',
  fetched: new Date().toISOString().slice(0, 10),
  communes: features
    .map((f) => ({ code: f.properties.code, nom: f.properties.nom, rings: rings(f.geometry).map(simplify) }))
    .sort((a, b) => a.code.localeCompare(b.code)),
};
await writeFile('app/v3/carte/martinique-communes.json', JSON.stringify(out));
console.log(`${out.communes.length} communes écrites.`);

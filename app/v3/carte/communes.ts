import data from './martinique-communes.json';

// Limites officielles des 34 communes (IGN ADMIN EXPRESS via
// geo.api.gouv.fr, Licence Ouverte 2.0) ; voir
// scripts/fetch-martinique-communes.mjs. Aucune géométrie inventée.
export type Commune = { code: string; nom: string; rings: number[][][] };
export const communes = data.communes as Commune[];
export const communesSource = data.source;

const boxes = communes.map((c) => {
  const pts = c.rings.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
});
const inside = (ring: number[][], x: number, y: number) => {
  let r = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      r = !r;
  }
  return r;
};
// Commune contenant le point (null en mer ou hors île).
export function communeAt(lat: number, lon: number): Commune | null {
  return (
    communes.find(
      (c, k) =>
        lon >= boxes[k][0] &&
        lon <= boxes[k][2] &&
        lat >= boxes[k][1] &&
        lat <= boxes[k][3] &&
        c.rings.some((r) => inside(r, lon, lat)),
    ) ?? null
  );
}

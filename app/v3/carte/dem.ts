import demUrl from './martinique-dem.png';
import meta from './martinique-dem.json';

// MNT de la Martinique (voir scripts/fetch-martinique-dem.mjs), partagé
// par la carte 3D et le volcan du Dashboard.
export { demUrl, meta };
const N = 2 ** meta.zoom * 256;
// Mètres par pixel à la latitude de l'île.
export const PX_M =
  (156543.03392 * Math.cos((14.66 * Math.PI) / 180)) / 2 ** meta.zoom;
export function toPixel(lat: number, lon: number) {
  const r = (lat * Math.PI) / 180;
  return {
    i: ((lon + 180) / 360) * N - meta.mercator.x0,
    j:
      ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N -
      meta.mercator.y0,
  };
}
export function toLatLon(i: number, j: number) {
  const lon = ((i + meta.mercator.x0) / N) * 360 - 180;
  const lat =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (j + meta.mercator.y0)) / N))) *
      180) /
    Math.PI;
  return { lat, lon };
}
// Hauteurs (m) d'une fenêtre du MNT, décodage Terrarium.
export async function readHeights(x: number, y: number, w: number, h: number) {
  const img = new Image();
  img.src = demUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, -x, -y);
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let k = 0; k < out.length; k++)
    out[k] = d[k * 4] * 256 + d[k * 4 + 1] + d[k * 4 + 2] / 256 - 32768;
  return out;
}

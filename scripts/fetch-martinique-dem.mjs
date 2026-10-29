// Modèle numérique de terrain + bathymétrie de la Martinique, réels et
// géoréférencés, pour la page « Carte interactive ».
// Source : AWS Terrain Tiles (Mapzen « Joerd »), encodage Terrarium,
// zoom 11 (~75 m/pixel) : SRTM (NASA) à terre, ETOPO1 / GEBCO en mer.
// https://registry.opendata.aws/terrain-tiles/
// Le zoom 11 n'a pas de bathymétrie (mer à 0) : la mer vient du zoom 10,
// interpolée en hauteurs décodées ; la terre reste au zoom 11.
// Les tuiles sont assemblées puis recadrées sur l'emprise ci-dessous
// (projection Web Mercator conservée), écrites sans perte :
// app/v3/carte/martinique-dem.png + martinique-dem.json.
// Usage : node scripts/fetch-martinique-dem.mjs (réseau requis, une fois).
import { writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const Z = 11;
// Emprise : île + mer proche (épicentre du séisme de 2007 inclus au nord).
const bbox = { west: -61.36, east: -60.74, south: 14.34, north: 14.99 };
const n = 2 ** Z;
const px = (lon) => ((lon + 180) / 360) * n * 256;
const py = (lat) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n * 256;
};
const x0 = Math.floor(px(bbox.west));
const x1 = Math.ceil(px(bbox.east));
const y0 = Math.floor(py(bbox.north));
const y1 = Math.ceil(py(bbox.south));
async function grab(z) {
  const k = 2 ** (Z - z);
  const out = [];
  for (let ty = Math.floor(y0 / 256 / k); ty <= Math.floor((y1 - 1) / 256 / k); ty++)
    for (let tx = Math.floor(x0 / 256 / k); tx <= Math.floor((x1 - 1) / 256 / k); tx++) {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`);
      const b64 = Buffer.from(await r.arrayBuffer()).toString('base64');
      out.push({ tx, ty, k, src: `data:image/png;base64,${b64}` });
    }
  return out;
}
const tiles = [...(await grab(Z)), ...(await grab(Z - 1))];
const browser = await chromium.launch();
const page = await browser.newPage();
const png = await page.evaluate(
  async ({ tiles, x0, y0, w, h }) => {
    // Hauteurs décodées d'un zoom, sur la grille du zoom 11.
    const layer = async (k) => {
      const set = tiles.filter((t) => t.k === k);
      const tx0 = Math.min(...set.map((t) => t.tx));
      const ty0 = Math.min(...set.map((t) => t.ty));
      const cw = (Math.max(...set.map((t) => t.tx)) - tx0 + 1) * 256;
      const ch = (Math.max(...set.map((t) => t.ty)) - ty0 + 1) * 256;
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext('2d');
      for (const t of set) {
        const img = new Image();
        img.src = t.src;
        await img.decode();
        ctx.drawImage(img, (t.tx - tx0) * 256, (t.ty - ty0) * 256);
      }
      const d = ctx.getImageData(0, 0, cw, ch).data;
      const at = (x, y) => {
        const i = (y * cw + x) * 4;
        return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
      };
      // Interpolation bilinéaire au centre de chaque pixel du zoom 11.
      return (x, y) => {
        const fx = (x0 + x + 0.5) / k - tx0 * 256 - 0.5;
        const fy = (y0 + y + 0.5) / k - ty0 * 256 - 0.5;
        const ix = Math.max(0, Math.min(cw - 2, Math.floor(fx)));
        const iy = Math.max(0, Math.min(ch - 2, Math.floor(fy)));
        const ax = fx - ix;
        const ay = fy - iy;
        return (
          at(ix, iy) * (1 - ax) * (1 - ay) +
          at(ix + 1, iy) * ax * (1 - ay) +
          at(ix, iy + 1) * (1 - ax) * ay +
          at(ix + 1, iy + 1) * ax * ay
        );
      };
    };
    const land = await layer(1);
    const sea = await layer(2);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const out = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const l = land(x, y);
        // Arrondi au mètre (précision suffisante à 75 m, PNG plus léger).
        const v = Math.round(l > 0 ? l : Math.min(sea(x, y), 0)) + 32768;
        const i = (y * w + x) * 4;
        out.data[i] = Math.floor(v / 256);
        out.data[i + 1] = Math.floor(v) % 256;
        out.data[i + 2] = 0;
        out.data[i + 3] = 255;
      }
    ctx.putImageData(out, 0, 0);
    return c.toDataURL('image/png');
  },
  { tiles, x0, y0, w: x1 - x0, h: y1 - y0 },
);
await browser.close();
await mkdir('app/v3/carte', { recursive: true });
await writeFile(
  'app/v3/carte/martinique-dem.png',
  Buffer.from(png.split(',')[1], 'base64'),
);
// Emprise exacte des pixels (bords en coordonnées Web Mercator, zoom 11).
const lon = (x) => (x / (n * 256)) * 360 - 180;
const lat = (y) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (n * 256)))) * 180) / Math.PI;
await writeFile(
  'app/v3/carte/martinique-dem.json',
  JSON.stringify(
    {
      source:
        'AWS Terrain Tiles (Mapzen Joerd), Terrarium : terre zoom 11 (SRTM, NASA), mer zoom 10 (ETOPO1 NOAA, GEBCO)',
      encoding: 'terrarium: (R * 256 + G + B / 256) - 32768 mètres',
      zoom: Z,
      width: x1 - x0,
      height: y1 - y0,
      west: lon(x0),
      east: lon(x1),
      north: lat(y0),
      south: lat(y1),
      mercator: { x0, y0 },
    },
    null,
    2,
  ) + '\n',
);
console.log(`${tiles.length} tuiles, ${x1 - x0} × ${y1 - y0} px`);

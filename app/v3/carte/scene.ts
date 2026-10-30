import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { meta, readHeights, toLatLon, toPixel } from './dem.js';
import type { RiskId } from './risks.js';
import { communeAt, communes, type Commune } from './communes.js';

// Martinique en 3D à partir du MNT réel (terre SRTM, mer ETOPO1/GEBCO,
// ~74 m/pixel, Web Mercator) : relief, fonds marins, océan plein cadre
// (houle, reflets, transparence côtière), lumière et ombres. Couches de risques : zones calculées sur ce relief
// (hypothèses pédagogiques) et effets illustratifs légers, en shaders.

const KM =
  (156543.03392 * Math.cos((14.66 * Math.PI) / 180)) / 2 ** meta.zoom / 1000;
const LAND = 2; // exagération verticale du relief
const SEA = 0.5; // fonds marins compressés
const BASE = -2.8; // base du socle (km de scène)
const W = meta.width;
const H = meta.height;
const SX = W * KM;
const SZ = H * KM;
const levels = ['#FABC3C', '#F19143', '#F55536'];
// Sommet (Le Chinois, 1 397 m) : IGN / GVP Smithsonian ; le point le plus
// haut du MNT tombe à < 75 m (14,8094 ; -61,1664).
const PELEE = { lat: 14.8094, lon: -61.1658 };
const EPI = { lat: 14.944, lon: -61.274 };
// Trajectoire fictive (est → ouest), pour la seule démonstration.
const TRACK = [
  { lat: 14.46, lon: -60.86 },
  { lat: 14.54, lon: -61.0 },
  { lat: 14.62, lon: -61.15 },
  { lat: 14.7, lon: -61.27 },
];

export { toPixel };
// Côte légèrement relevée et fonds légèrement abaissés : pas de
// scintillement entre la mer (y = 0) et le littoral presque au même niveau.
const yOf = (h: number) =>
  h > 0 ? 0.02 + (h / 1000) * LAND : Math.min(-0.04, (h / 1000) * SEA);

async function loadHeights() {
  const h = await readHeights(0, 0, W, H);
  // Fonds marins issus d'une grille grossière (ETOPO1, ~1,8 km) : lissage
  // en mer seulement (flou séparable, 2 passes), la terre reste intacte.
  const sea = Float32Array.from(h, (v) => Math.min(v, 0));
  const blur = (src: Float32Array, horizontal: boolean, r = 8) => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let sum = 0;
        let n = 0;
        for (let o = -r; o <= r; o++) {
          const xx = horizontal ? x + o : x;
          const yy = horizontal ? y : y + o;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          sum += src[yy * W + xx];
          n++;
        }
        out[y * W + x] = sum / n;
      }
    return out;
  };
  let smooth = sea;
  for (let pass = 0; pass < 2; pass++) smooth = blur(blur(smooth, true), false);
  for (let k = 0; k < h.length; k++)
    if (h[k] <= 0) h[k] = Math.min(smooth[k], -1);
  return h;
}

// Distance (pixels) au plus proche pixel de l'autre milieu, jusqu'à max.
function distanceTo(
  h: Float32Array,
  target: (v: number) => boolean,
  max: number,
) {
  const dist = new Uint8Array(W * H).fill(255);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  for (let k = 0; k < h.length; k++)
    if (target(h[k])) {
      dist[k] = 0;
      queue[tail++] = k;
    }
  while (head < tail) {
    const k = queue[head++];
    const d = dist[k] + 1;
    if (d > max) continue;
    const x = k % W;
    for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W])
      if (n >= 0 && n < h.length && dist[n] > d) {
        dist[n] = d;
        queue[tail++] = n;
      }
  }
  return dist;
}

const srgb = (r: number, g: number, b: number) =>
  new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const mix = (a: THREE.Color, b: THREE.Color, t: number) =>
  a.clone().lerp(b, Math.min(1, Math.max(0, t)));
const C = {
  sand: srgb(0.78, 0.72, 0.55),
  low: srgb(0.45, 0.56, 0.27),
  forest: srgb(0.16, 0.31, 0.14),
  high: srgb(0.29, 0.36, 0.22),
  summit: srgb(0.45, 0.41, 0.34),
  rock: srgb(0.38, 0.34, 0.28),
  shoal: srgb(0.46, 0.62, 0.58),
  mid: srgb(0.22, 0.5, 0.58),
  deep: srgb(0.1, 0.27, 0.4),
  abyss: srgb(0.04, 0.13, 0.23),
};
function colorAt(h: number, slope: number, noise: number) {
  let c: THREE.Color;
  if (h > 0) {
    c =
      h < 10
        ? mix(C.sand, C.low, h / 10)
        : h < 200
          ? mix(C.low, C.forest, (h - 10) / 190)
          : h < 900
            ? mix(C.forest, C.high, (h - 200) / 700)
            : mix(C.high, C.summit, (h - 900) / 400);
    c = mix(c, C.rock, (slope - 0.45) * 1.6);
  } else {
    const d = -h;
    c =
      d < 15
        ? mix(C.shoal, C.mid, d / 15)
        : d < 300
          ? mix(C.mid, C.deep, (d - 15) / 285)
          : mix(C.deep, C.abyss, (d - 300) / 1800);
  }
  return c.multiplyScalar(1 + noise);
}

export type Hover = { level: number; lat: number; lon: number; alt: number };
// Scénario volcanique hypothétique, réglé par l'utilisatrice.
export type Volcano = {
  phenomenon: 'panache' | 'nuee' | 'projections';
  // Direction VERS laquelle souffle le vent (degrés, 0 = nord).
  wind: number;
  intensity: 1 | 2 | 3;
};
export const volcanoReach = {
  // Portées illustratives (km) par intensité, jamais des périmètres réels.
  panache: [6, 12, 20],
  nuee: [5, 8, 12],
  projections: [1.5, 2.5, 4],
};
export type Quake = { lat: number; lon: number; mag: number; depth: number };
// Faits géométriques calculés sur le MNT, sans niveau de risque.
export type Exposure = {
  inMap: boolean;
  alt: number;
  coastKm: number | null;
  peleeKm: number;
  riverKm: number | null;
};
export type CarteScene = {
  // `effects` faux : zones seules, sans animation (détail sur la carte).
  setRisk: (id: RiskId | null, effects?: boolean) => void;
  // Recentrage animé sur un point (logement).
  focus: (lat: number, lon: number) => void;
  setMarkers: (
    m: { id: string; lat: number; lon: number; sea?: boolean }[],
  ) => void;
  setCyclone: (t: number | null) => void;
  orbit: (dTheta: number, dPhi: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  heightAt: (lat: number, lon: number) => number;
  setVolcano: (v: Volcano) => void;
  setQuakes: (q: Quake[] | null) => void;
  exposure: (lat: number, lon: number) => Exposure;
  // Niveau SIMULÉ de la couche active au point (0 = hors zone).
  zoneLevel: (lat: number, lon: number) => number;
  // Brume de sable simulée : 1 visibilité > 10 km, 2 : 5-10, 3 : < 5 km.
  setBrume: (intensity: 1 | 2 | 3) => void;
  // Ondulations discrètes aux épicentres OBSERVÉS récents (sans risque).
  setPulses: (p: { lat: number; lon: number }[] | null) => void;
  // Limites communales officielles (affichées / masquées).
  setCommunes: (on: boolean) => void;
  dispose: () => void;
};

export async function createScene(
  host: HTMLElement,
  opts: {
    reduced: boolean;
    place: (id: string, x: number, y: number, visible: boolean) => void;
    onHover: (h: Hover | null) => void;
    onPick: (h: Hover) => void;
    onCyclone?: (t: number) => void;
    onCommune?: (nom: string | null) => void;
    // Clic simple sur le relief ou la mer (placement d'un lieu).
    onPoint?: (lat: number, lon: number) => void;
    // Après placement des balises (anti-chevauchement des étiquettes).
    settle?: () => void;
  },
): Promise<CarteScene> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'carte-canvas';
  const heights = await loadHeights();
  const hAt = (i: number, j: number) =>
    heights[
      Math.min(H - 1, Math.max(0, Math.round(j))) * W +
        Math.min(W - 1, Math.max(0, Math.round(i)))
    ];
  const slopeAt = (i: number, j: number) => {
    const dx = (hAt(i + 1, j) - hAt(i - 1, j)) / (2 * KM * 1000);
    const dz = (hAt(i, j + 1) - hAt(i, j - 1)) / (2 * KM * 1000);
    return Math.atan(Math.hypot(dx, dz));
  };
  const world = (i: number, j: number, y: number) =>
    new THREE.Vector3((i - W / 2) * KM, y, (j - H / 2) * KM);

  const scene = new THREE.Scene();
  const island = new THREE.Group();
  scene.add(island);
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x3b3220, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
  sun.position.set(-30, 45, -20); // soleil haut, nord-ouest (ombres lisibles)
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 45,
    bottom: -45,
    near: 1,
    far: 140,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Relief + fonds marins (maillage allégé sur mobile).
  const step = innerWidth < 760 ? 4 : 3;
  const gw = Math.floor((W - 1) / step) + 1;
  const gh = Math.floor((H - 1) / step) + 1;
  const pos = new Float32Array(gw * gh * 3);
  const col = new Float32Array(gw * gh * 3);
  for (let b = 0; b < gh; b++)
    for (let a = 0; a < gw; a++) {
      const i = a * step;
      const j = b * step;
      const h = hAt(i, j);
      const k = b * gw + a;
      const p = world(i, j, yOf(h));
      pos.set([p.x, p.y, p.z], k * 3);
      const noise = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
      const c = colorAt(h, slopeAt(i, j), noise * 0.06);
      col.set([c.r, c.g, c.b], k * 3);
    }
  const index: number[] = [];
  for (let b = 0; b < gh - 1; b++)
    for (let a = 0; a < gw - 1; a++) {
      const k = b * gw + a;
      index.push(k, k + gw, k + 1, k + 1, k + gw, k + gw + 1);
    }
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  terrainGeo.setIndex(index);
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
    }),
  );
  terrain.castShadow = terrain.receiveShadow = true;
  island.add(terrain);

  // Masques : terre, distance à la terre en mer, façade atlantique,
  // profondeur (0 côte → 255 à 500 m et plus).
  const distSea = distanceTo(heights, (v) => v <= 0, 40);
  const distLand = distanceTo(heights, (v) => v > 0, 254);
  const maskData = new Uint8Array(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    const { lon } = toLatLon(k % W, Math.floor(k / W));
    const depth = heights[k] > 0 ? 0 : Math.min(255, (-heights[k] / 500) * 255);
    maskData.set(
      [heights[k] > 0 ? 255 : 0, distLand[k], lon > -61.0 ? 255 : 0, depth],
      k * 4,
    );
  }
  const maskTex = new THREE.DataTexture(maskData, W, H);
  maskTex.magFilter = maskTex.minFilter = THREE.LinearFilter;
  maskTex.needsUpdate = true;
  const zoneData = new Uint8Array(W * H * 4);
  const zoneTex = new THREE.DataTexture(zoneData, W, H);
  zoneTex.needsUpdate = true;
  const epi = toPixel(EPI.lat, EPI.lon);
  const top = toPixel(PELEE.lat, PELEE.lon);
  const epiW = world(epi.i, epi.j, 0);

  const common = /* glsl */ `
    uniform float uTime; uniform int uMode; uniform sampler2D uMask;
    varying vec3 vW;
    vec2 uvOf(vec3 p) { return vec2(p.x / ${SX.toFixed(3)} + 0.5, p.z / ${SZ.toFixed(3)} + 0.5); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y); }
    float fbm(vec2 p) { float v = 0., a = .5; for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.03; a *= .5; } return v; }
  `;
  const vert = /* glsl */ `varying vec3 vW;
    void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

  // Océan plein cadre : houle venant de l'est (alizés) et clapot, reflets
  // du ciel (Fresnel), reflet du soleil, eau transparente sur les hauts
  // fonds et opaque au large (aucun bord de dalle visible), écume côtière.
  const oceanMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uMask: { value: maskTex },
      uSun: { value: new THREE.Vector3() },
    },
    vertexShader: vert,
    fragmentShader: /* glsl */ `${common}
      uniform vec3 uSun;
      float wave(vec2 p) {
        float t = uTime;
        return sin(dot(p, vec2(.95, .2)) * 1.4 + t * 1.5) * .5
          + sin(dot(p, vec2(.55, -.6)) * 2.3 + t * 2.1) * .22
          + (noise(p * 3. + vec2(t * .8, t * .25)) - .5) * .35
          + (noise(p * 10. + vec2(t * 1.4, -t * .5)) - .5) * .12;
      }
      void main() {
        vec2 uv = uvOf(vW);
        bool inside = uv.x > 0. && uv.y > 0. && uv.x < 1. && uv.y < 1.;
        // Hors du MNT : profondeur du bord prolongée puis vers le large,
        // eau opaque (aucune limite visible).
        vec4 m = texture2D(uMask, clamp(uv, .002, .998));
        if (inside && m.r > .5) discard;
        vec2 out2 = max(abs(uv - .5) * 2. - 1., 0.);
        float depth = mix(m.a, 1., smoothstep(0., .4, max(out2.x, out2.y)));
        if (!inside) m = vec4(0., 1., 0., m.a);
        vec2 p = vW.xz * 1.1;
        float e = .04;
        float h0 = wave(p);
        vec3 n = normalize(vec3(-(wave(p + vec2(e, 0.)) - h0) / e * .07, 1., -(wave(p + vec2(0., e)) - h0) / e * .07));
        vec3 v = normalize(cameraPosition - vW);
        float fres = .02 + .98 * pow(1. - max(dot(n, v), 0.), 5.);
        vec3 r = reflect(-v, n);
        vec3 sky = mix(vec3(.7, .82, .9), vec3(.3, .52, .78), clamp(r.y, 0., 1.));
        // Couleur continue : bleu du large selon la profondeur (variation
        // douce), turquoise seulement en frange côtière peu profonde.
        vec3 deep = mix(vec3(.04, .24, .37), vec3(.02, .13, .24), smoothstep(.15, 1., depth));
        float fringe = (1. - smoothstep(0., .05, m.g)) * (1. - smoothstep(0., .12, depth));
        vec3 body = mix(deep, vec3(.16, .5, .52), fringe * .85);
        float spec = pow(max(dot(reflect(-uSun, n), v), 0.), 220.) * .8;
        float foam = smoothstep(.975, 1., 1. - m.g) * (.45 + .55 * noise(vW.xz * 6. + uTime * .8));
        vec3 c = mix(body, sky, fres * .55) + spec;
        c = mix(c, vec3(.94, .97, .98), foam * .55);
        // Près du bord du MNT, eau opaque : le fond s'arrête sans se voir.
        vec2 e2 = abs(uv - .5) * 2.;
        // Fond visible seulement dans la frange côtière : pas de taches.
        float a = inside ? max(mix(.92, .6, fringe) * (1. - smoothstep(.86, .98, max(e2.x, e2.y))) + smoothstep(.86, .98, max(e2.x, e2.y)), foam * .7) : 1.;
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  // Dessiné en premier parmi les transparents : vagues, ondes, nappes,
  // panache et nuages restent visibles au-dessus de l'eau.
  ocean.renderOrder = -1;
  island.add(ocean);
  oceanMat.uniforms.uSun.value.copy(sun.position).normalize();

  // Zones de risque drapées sur le relief + survol + ondes sismiques.
  const zoneMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uMask: { value: maskTex },
      uZone: { value: zoneTex },
      uHover: { value: -1 },
      uEpi: { value: new THREE.Vector2(epiW.x, epiW.z) },
      uC: { value: levels.map((c) => new THREE.Color(c)) },
      uFront: { value: 2 },
    },
    vertexShader: vert,
    fragmentShader: /* glsl */ `${common}
      uniform sampler2D uZone; uniform float uHover; uniform vec2 uEpi; uniform vec3 uC[3]; uniform float uFront;
      void main() {
        vec4 z = texture2D(uZone, uvOf(vW));
        float lv = floor(z.r * 3. + .5);
        if (lv < .5) discard;
        // Nuée : seules les zones déjà atteintes par le front s'affichent.
        if (uMode == 7 && z.g > uFront) discard;
        vec3 c = uC[int(lv) - 1];
        float a = .2 + (abs(lv - uHover) < .5 ? .2 + .06 * sin(uTime * 3.) : 0.);
        if (uMode == 2) { float r = distance(vW.xz, uEpi);
          float ring = smoothstep(.75, 1., fract((r - uTime * 7.) / 9.)) * smoothstep(80., 10., r);
          c = mix(c, vec3(1.), ring * .7); a += ring * .3; }
        if (uMode == 6) { // impulsions vers l'aval (accumulation croissante)
          float pulse = smoothstep(.75, 1., fract(z.g * 6. - uTime * .6));
          c = mix(c, vec3(.75, .9, 1.), pulse * .6); a += pulse * .35; }
        if (uMode == 7) { float f = smoothstep(.06, 0., uFront - z.g);
          c = mix(c, vec3(1., .85, .6), f); a += f * .4; }
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const zones = new THREE.Mesh(terrainGeo, zoneMat);
  zones.visible = false;
  island.add(zones);

  // Limites communales officielles : traits fins drapés sur le relief,
  // commune survolée ou choisie surlignée.
  const drape = (rings: number[][][], lift: number) => {
    const v: number[] = [];
    for (const ring of rings)
      for (let k = 1; k < ring.length; k++) {
        const a = toPixel(ring[k - 1][1], ring[k - 1][0]);
        const b = toPixel(ring[k][1], ring[k][0]);
        const n = Math.max(1, Math.ceil(Math.hypot(b.i - a.i, b.j - a.j)));
        for (let q = 0; q < n * 2; q++) {
          const t = (Math.floor(q / 2) + (q % 2)) / n;
          const i = a.i + (b.i - a.i) * t;
          const j = a.j + (b.j - a.j) * t;
          const w = world(i, j, Math.max(0.02, yOf(hAt(i, j))) + lift);
          v.push(w.x, w.y, w.z);
        }
      }
    return new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(v, 3),
    );
  };
  const borders = new THREE.LineSegments(
    drape(
      communes.flatMap((c) => c.rings),
      0.03,
    ),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
    }),
  );
  const picked = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xff773d }),
  );
  borders.visible = picked.visible = false;
  picked.renderOrder = 2;
  island.add(borders, picked);
  let commune: Commune | null = null;
  let pinned: Commune | null = null;
  const showCommune = (c: Commune | null) => {
    if (c === commune) return;
    commune = c;
    picked.geometry.dispose();
    picked.geometry = c ? drape(c.rings, 0.06) : new THREE.BufferGeometry();
    picked.visible = !!c && borders.visible;
    opts.onCommune?.(c?.nom ?? null);
    invalidate();
  };

  // Effets sur la mer : vagues (tsunami), ondes (séisme), sargasses.
  const fxMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uMask: { value: maskTex },
      uEpi: { value: new THREE.Vector2(epiW.x, epiW.z) },
      uQ: {
        value: Array.from({ length: 8 }, () => new THREE.Vector2(1e4, 1e4)),
      },
    },
    vertexShader: vert,
    fragmentShader: /* glsl */ `${common}
      uniform vec2 uEpi; uniform vec2 uQ[8];
      void main() {
        vec4 m = texture2D(uMask, uvOf(vW));
        if (m.r > .5) discard;
        float coast = 1. - m.g; // 1 près de la côte
        vec4 o = vec4(0.);
        if (uMode == 1) { // trains de vagues venant de l'est
          float d = ${(SX / 2).toFixed(3)} - vW.x + sin(vW.z * .08) * 3.;
          float crest = smoothstep(.9, 1., fract((d - uTime * 4.) / 7.));
          float foam = crest * (.35 + .65 * smoothstep(.85, 1., coast));
          o = vec4(mix(vec3(.75, .9, 1.), vec3(1.), foam), foam * .75);
        } else if (uMode == 2) {
          float r = distance(vW.xz, uEpi);
          float ring = smoothstep(.8, 1., fract((r - uTime * 7.) / 9.)) * smoothstep(80., 5., r);
          o = vec4(vec3(1.), ring * .45);
        } else if (uMode == 3) { // séismes observés : anneaux lents et fins
          float ring = 0.;
          for (int k = 0; k < 8; k++) {
            float r = distance(vW.xz, uQ[k]);
            ring = max(ring, smoothstep(.9, 1., fract((r - uTime * 1.5) / 4.)) * smoothstep(9., 1., r));
          }
          o = vec4(vec3(1., .9, .8), ring * .5);
        } else if (uMode == 5) { // nappes dérivant vers l'ouest + échouements
          // Andains irréguliers étirés par les alizés (domaine déformé),
          // densité variable, texture organique (thalles et flotteurs).
          vec2 q = vW.xz + vec2(uTime * .35, uTime * .05);
          vec2 w = vec2(fbm(q * .09), fbm(q * .09 + 7.3));
          vec2 p = vec2(q.x * .06, q.y * .5) + w * 1.8;
          float n = fbm(p);
          float band = smoothstep(.09, 0., abs(n - .52));
          float dens = smoothstep(.3, .62, fbm(q * .05 + 3.1));
          float grain = smoothstep(.35, .8, noise(q * 9.)) * (.6 + .4 * noise(q * 23.));
          float nappe = band * dens * mix(.45, 1., grain) * (.3 + .7 * m.b);
          float shore = smoothstep(.95, 1., coast) * m.b * smoothstep(.3, .7, noise(vW.xz * 2.5)) * (.5 + .5 * grain);
          float a = max(nappe, shore);
          vec3 alg = mix(vec3(.42, .3, .08), vec3(.7, .55, .2), noise(q * 5.));
          alg = mix(alg, vec3(.3, .2, .08), shore * .6); // échouées : brunissent
          o = vec4(alg, a * .9);
        }
        if (o.a < .01) discard;
        gl_FragColor = o;
        #include <colorspace_fragment>
      }`,
  });
  const fx = new THREE.Mesh(new THREE.PlaneGeometry(SX, SZ), fxMat);
  fx.rotation.x = -Math.PI / 2;
  fx.position.y = 0.02;
  fx.visible = false;
  island.add(fx);

  // Volcan : panache illustratif poussé par le vent du scénario.
  const peak = world(top.i, top.j, yOf(hAt(top.i, top.j)));
  const plumeGeo = new THREE.BufferGeometry();
  const seeds = new Float32Array(260).map(() => Math.random());
  plumeGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(seeds.length * 3), 3),
  );
  plumeGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const plumeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPeak: { value: peak },
      uScale: { value: 1 },
      uWind: { value: new THREE.Vector2(-1, 0) },
      uInt: { value: 2 },
    },
    vertexShader: /* glsl */ `attribute float aSeed; uniform float uTime; uniform vec3 uPeak; uniform float uScale; uniform vec2 uWind; uniform float uInt; varying float vA;
      void main() { float age = fract(uTime * .05 + aSeed);
        float drift = age * age * 5. * uInt;
        vec3 p = uPeak + vec3(uWind.x * drift + sin(aSeed * 40.) * age * 1.5, .2 + age * (2.5 + uInt * 1.6), uWind.y * drift + cos(aSeed * 31.) * age * 1.6);
        vA = smoothstep(0., .12, age) * (1. - age);
        vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = (14. + age * 70.) * uScale / -mv.z * 65.; }`,
    fragmentShader: /* glsl */ `varying float vA;
      void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard;
        gl_FragColor = vec4(vec3(.7, .68, .66), vA * .55 * smoothstep(.5, .05, d)); }`,
  });
  const plume = new THREE.Points(plumeGeo, plumeMat);
  plume.frustumCulled = false;
  plume.visible = false;
  island.add(plume);

  // Projections balistiques : blocs en paraboles autour du cratère.
  const blocks = new THREE.Points(
    plumeGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: plumeMat.uniforms,
      vertexShader: /* glsl */ `attribute float aSeed; uniform float uTime; uniform vec3 uPeak; uniform float uScale; uniform float uInt; varying float vA;
        void main() { float age = fract(uTime * .35 + aSeed * 7.);
          float ang = aSeed * 6.2832 * 13.; float reach = (.5 + .5 * fract(aSeed * 91.)) * uInt * 1.3;
          vec3 p = uPeak + vec3(cos(ang) * reach * age, 2.8 * age * (1. - age) * uInt, sin(ang) * reach * age);
          vA = 1. - age; vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = 5. * uScale / -mv.z * 65.; }`,
      fragmentShader: /* glsl */ `varying float vA;
        void main() { if (length(gl_PointCoord - .5) > .5) discard; gl_FragColor = vec4(.25, .1, .06, vA); }`,
    }),
  );
  blocks.frustumCulled = false;
  blocks.visible = false;
  island.add(blocks);

  // Fortes pluies : rideaux de pluie et éclairs (illustratifs).
  const rainSeeds = new Float32Array(2400 * 3).map(() => Math.random());
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(2400 * 3), 3),
  );
  rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(rainSeeds, 3));
  const rainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uScale: plumeMat.uniforms.uScale },
    vertexShader: /* glsl */ `attribute vec3 aSeed; uniform float uTime; uniform float uScale;
      void main() { vec3 p = vec3((aSeed.x - .5) * ${(SX * 0.8).toFixed(2)} - fract(uTime * .9 + aSeed.z) * 1.5,
        9. - fract(uTime * .9 + aSeed.z) * 9., (aSeed.y - .5) * ${(SZ * 0.8).toFixed(2)});
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = 9. * uScale / -mv.z * 65.; }`,
    fragmentShader: /* glsl */ `void main() { vec2 c = gl_PointCoord - .5;
        if (abs(c.x + c.y * .15) > .05) discard; gl_FragColor = vec4(.82, .88, .95, .45); }`,
  });
  const rain = new THREE.Points(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.visible = false;
  island.add(rain);
  const bolt = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xf4f7ff }),
  );
  bolt.visible = false;
  island.add(bolt);
  let nextFlash = 2;

  // Brume de sable : voile atmosphérique (visibilité réduite) et
  // particules de poussière poussées vers l'ouest par les alizés.
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshBasicMaterial({
      color: 0xd8b48a,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  haze.rotation.x = -Math.PI / 2;
  haze.position.y = 3;
  haze.renderOrder = 3;
  haze.visible = false;
  island.add(haze);
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: plumeMat.uniforms.uScale,
      uDens: { value: 0.6 },
    },
    vertexShader: /* glsl */ `attribute vec3 aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main() { float x = fract(aSeed.x - uTime * .025);
        vec3 p = vec3((x - .5) * ${(SX * 1.2).toFixed(2)}, .3 + aSeed.z * 5.5 + sin(uTime * .4 + aSeed.y * 30.) * .2, (aSeed.y - .5) * ${(SZ * 1.2).toFixed(2)});
        vA = smoothstep(0., .1, x) * smoothstep(1., .9, x);
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = (6. + aSeed.z * 10.) * uScale / -mv.z * 65.; }`,
    fragmentShader: /* glsl */ `uniform float uDens; varying float vA;
      void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard;
        gl_FragColor = vec4(.86, .7, .5, vA * uDens * .35 * smoothstep(.5, 0., d)); }`,
  });
  const dust = new THREE.Points(rainGeo, dustMat);
  dust.frustumCulled = false;
  dust.visible = false;
  island.add(dust);

  // Séismes observés (USGS) : sphères à l'épicentre, taille selon la
  // magnitude, couleur selon la profondeur du foyer.
  const quakeMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 14, 10),
    new THREE.MeshStandardMaterial({ roughness: 0.4 }),
    400,
  );
  quakeMesh.count = 0;
  quakeMesh.visible = false;
  island.add(quakeMesh);

  // Cyclone : vortex nuageux (rotation anti-horaire, hémisphère nord),
  // flèches de vent tangentielles, trajectoire fictive en pointillés.
  const spiral = document.createElement('canvas');
  spiral.width = spiral.height = 512;
  const sc = spiral.getContext('2d')!;
  // Masse nuageuse centrale autour d'un œil dégagé, puis trois bandes
  // spirales (logarithmiques) de plus en plus diffuses ; bord estompé.
  const cdo = sc.createRadialGradient(256, 256, 8, 256, 256, 92);
  cdo.addColorStop(0, 'rgba(255,255,255,0)');
  cdo.addColorStop(0.12, 'rgba(255,255,255,0.9)');
  cdo.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  cdo.addColorStop(1, 'rgba(255,255,255,0)');
  sc.fillStyle = cdo;
  sc.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 4200; k++) {
    const th = Math.random() * 6.2;
    const ang = (k % 3) * ((Math.PI * 2) / 3) + th;
    const r = 34 * Math.exp(0.27 * th) + (Math.random() - 0.5) * (8 + th * 6);
    if (r > 215) continue;
    const x = 256 + Math.cos(ang) * r;
    const y = 256 - Math.sin(ang) * r;
    const size = 5 + Math.random() * 12;
    const g = sc.createRadialGradient(x, y, 0, x, y, size);
    g.addColorStop(0, `rgba(255,255,255,${0.12 * (1 - r / 260)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = g;
    sc.fillRect(x - size, y - size, size * 2, size * 2);
  }
  // Densité des nuages → canal vert d'un canvas opaque, utilisé comme
  // alphaMap d'un matériau blanc : aucun halo sombre au filtrage.
  const px = sc.getImageData(0, 0, 512, 512);
  for (let k = 0; k < px.data.length; k += 4) {
    const a = px.data[k + 3];
    px.data.set([a, a, a, 255], k);
  }
  sc.putImageData(px, 0, 0);
  const spiralTex = new THREE.CanvasTexture(spiral);
  const vortexMat = new THREE.MeshBasicMaterial({
    color: 0xf8f9fb,
    alphaMap: spiralTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.95,
  });
  const vortex = new THREE.Group();
  const cloud = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), vortexMat);
  cloud.rotation.x = -Math.PI / 2;
  vortex.add(cloud);
  const spin = new THREE.Group();
  vortex.add(spin);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const r = k % 2 ? 7 : 11;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.6, 10),
      new THREE.MeshStandardMaterial({ color: levels[k % 2 ? 2 : 1] }),
    );
    cone.position.set(Math.cos(a) * r, 0.4, -Math.sin(a) * r);
    // Tangente anti-horaire, légèrement rentrante vers l'œil.
    cone.lookAt(
      cone.position
        .clone()
        .add(
          new THREE.Vector3(
            -Math.sin(a) - Math.cos(a) * 0.3,
            0,
            -Math.cos(a) + Math.sin(a) * 0.3,
          ),
        ),
    );
    cone.rotateX(Math.PI / 2);
    spin.add(cone);
  }
  vortex.visible = false;
  island.add(vortex);
  const curve = new THREE.CatmullRomCurve3(
    TRACK.map(({ lat, lon }) => {
      const p = toPixel(lat, lon);
      return world(p.i, p.j, 0);
    }),
  );
  const trackLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(80).map((p) => {
        const { i, j } = { i: p.x / KM + W / 2, j: p.z / KM + H / 2 };
        return p.setY(Math.max(0, yOf(hAt(i, j))) + 0.5);
      }),
    ),
    new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 1,
      gapSize: 0.7,
      transparent: true,
      opacity: 0.85,
    }),
  );
  trackLine.computeLineDistances();
  trackLine.visible = false;
  island.add(trackLine);

  // Caméra : vue quasi zénithale légèrement inclinée, nord en haut.
  const camera = new THREE.PerspectiveCamera(32, 1, 5, 500);
  const look = new THREE.Vector3(0, 90, 42).normalize();
  const home = look.clone().multiplyScalar(100);
  camera.position.copy(home);
  let moved = false;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.addEventListener('start', () => (moved = true));
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = 0.8;
  controls.minAzimuthAngle = -0.7;
  controls.maxAzimuthAngle = 0.7;
  controls.rotateSpeed = 0.5;
  const centre = toPixel(14.64, -61.02);
  const aim = world(centre.i, centre.j, 0);
  controls.target.copy(aim);
  host.append(renderer.domElement);

  let risk: RiskId | null = null;
  let markers: { id: string; p: THREE.Vector3 }[] = [];
  let cycloneT: number | null = null;
  let pulses = false;
  let volcano: Volcano = { phenomenon: 'panache', wind: 270, intensity: 2 };
  let time = opts.reduced ? 6 : 0;
  let dirty = true;
  const invalidate = () => (dirty = true);
  controls.addEventListener('change', invalidate);

  // Accumulation d'écoulement (D8) sur le relief réel : nombre de pixels
  // drainés par chaque cellule ; calculée une fois, à la demande.
  let acc: Float32Array | null = null;
  // Dépressions du MNT comblées (priority-flood, Barnes 2014) depuis la
  // mer : l'eau s'écoule toujours jusqu'à la côte.
  function filled() {
    const f = Float32Array.from(heights);
    const seen = new Uint8Array(W * H);
    const heap: number[] = [];
    const push = (k: number) => {
      heap.push(k);
      for (let c = heap.length - 1; c > 0;) {
        const p = (c - 1) >> 1;
        if (f[heap[p]] <= f[heap[c]]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        for (let c = 0; ;) {
          const l = 2 * c + 1;
          const r = l + 1;
          let m = c;
          if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
          if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]];
          c = m;
        }
      }
      return top;
    };
    for (let k = 0; k < W * H; k++)
      if (heights[k] <= 0) {
        seen[k] = 1;
        if (distLand[k] <= 1) push(k);
      }
    while (heap.length) {
      const k = pop();
      const x = k % W;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const n = k + dy * W + dx;
          if (x + dx < 0 || x + dx >= W || n < 0 || n >= W * H || seen[n])
            continue;
          seen[n] = 1;
          f[n] = Math.max(f[n], f[k] + 0.01);
          push(n);
        }
    }
    return f;
  }
  function flow() {
    if (acc) return acc;
    const z = filled();
    acc = new Float32Array(W * H);
    const land: number[] = [];
    for (let k = 0; k < W * H; k++)
      if (heights[k] > 0) {
        acc[k] = 1;
        land.push(k);
      }
    land.sort((a, b) => z[b] - z[a]);
    for (const k of land) {
      const x = k % W;
      let low = -1;
      let best = z[k];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const n = k + dy * W + dx;
          if (
            (dx || dy) &&
            x + dx >= 0 &&
            x + dx < W &&
            n >= 0 &&
            n < W * H &&
            z[n] < best
          ) {
            best = z[n];
            low = n;
          }
        }
      if (low >= 0 && heights[low] > 0) acc[low] += acc[k];
    }
    return acc;
  }
  // Nuée ardente : trajets de plus forte pente depuis le sommet sur le
  // relief réel, limités à une portée illustrative ; distance parcourue.
  function nueePaths(reach: number) {
    const along = new Float32Array(W * H).fill(Infinity);
    for (let a = 0; a < 32; a++) {
      let i = Math.round(top.i + Math.cos((a / 32) * Math.PI * 2) * 6);
      let j = Math.round(top.j + Math.sin((a / 32) * Math.PI * 2) * 6);
      let km = 0;
      while (km < reach) {
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const n = (j + dy) * W + i + dx;
            if (n >= 0 && n < W * H) along[n] = Math.min(along[n], km);
          }
        let ni = i;
        let nj = j;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (hAt(i + dx, j + dy) < hAt(ni, nj)) {
              ni = i + dx;
              nj = j + dy;
            }
        if ((ni === i && nj === j) || hAt(ni, nj) <= 0) break;
        km += Math.hypot(ni - i, nj - j) * KM;
        i = ni;
        j = nj;
      }
    }
    return along;
  }
  let along: Float32Array | null = null;
  function volcanLevel(k: number, i: number, j: number) {
    const reach = volcanoReach[volcano.phenomenon][volcano.intensity - 1];
    const dx = (i - top.i) * KM;
    const dz = (j - top.j) * KM;
    if (volcano.phenomenon === 'nuee') {
      const a = along![k];
      if (!(a <= reach)) return 0;
      zoneData[k * 4 + 1] = (a / reach) * 255;
      return a < reach / 3 ? 3 : a < (2 * reach) / 3 ? 2 : 1;
    }
    if (volcano.phenomenon === 'projections') {
      const d = Math.hypot(dx, dz) / reach;
      return d < 0.4 ? 3 : d < 0.7 ? 2 : d < 1 ? 1 : 0;
    }
    // Panache : retombées de cendres dans une ellipse sous le vent.
    const w = (volcano.wind * Math.PI) / 180;
    const ax = Math.sin(w);
    const az = -Math.cos(w);
    const down = dx * ax + dz * az;
    const cross = Math.abs(dx * az - dz * ax);
    const r = Math.hypot(down / reach, cross / (reach * 0.35));
    if (down < -1) return 0;
    return r < 0.4 ? 3 : r < 0.7 ? 2 : r < 1 ? 1 : 0;
  }
  function fillZones(id: RiskId) {
    const epiPx = toPixel(EPI.lat, EPI.lon);
    zoneData.fill(0);
    if (id === 'volcan' && volcano.phenomenon === 'nuee')
      along = nueePaths(volcanoReach.nuee[volcano.intensity - 1]);
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        const h = heights[k];
        let lv = 0;
        if (h > 0) {
          const { lat, lon } = toLatLon(i, j);
          const coast = distSea[k];
          if (id === 'tsunami')
            lv = h <= 10 && coast <= 20 ? (h <= 3 ? 3 : h <= 6 ? 2 : 1) : 0;
          else if (id === 'seisme') {
            const d = Math.hypot(i - epiPx.i, j - epiPx.j) * KM;
            lv = d < 30 ? 3 : d < 45 ? 2 : 1;
          } else if (id === 'volcan') lv = volcanLevel(k, i, j);
          else if (id === 'pluies') {
            const km2 = flow()[k] * KM * KM;
            lv = km2 >= 40 ? 3 : km2 >= 8 ? 2 : km2 >= 1 ? 1 : 0;
            zoneData[k * 4 + 1] = Math.min(255, Math.log2(1 + flow()[k]) * 16);
          } else if (id === 'cyclone')
            lv =
              h < 5 && coast <= 10
                ? 3
                : slopeAt(i, j) > 0.52
                  ? 2
                  : slopeAt(i, j) > 0.35
                    ? 1
                    : 0;
          else if (id === 'sargasses')
            lv =
              coast > 7
                ? 0
                : lon > -61.0 && lat > 14.46
                  ? 3
                  : lat <= 14.47
                    ? 2
                    : 1;
        }
        zoneData[k * 4] = lv * 85;
      }
    // Cours d'eau élargis selon leur importance pour rester lisibles.
    if (id === 'pluies') {
      const src = zoneData.slice();
      for (let j = 2; j < H - 2; j++)
        for (let i = 2; i < W - 2; i++) {
          const lv = src[(j * W + i) * 4] / 85;
          const r = lv >= 2 ? lv - 1 : 0;
          for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++) {
              const n = ((j + dy) * W + i + dx) * 4;
              if (heights[n / 4] > 0 && zoneData[n] < lv * 85) {
                zoneData[n] = lv * 85;
                zoneData[n + 1] = src[(j * W + i) * 4 + 1];
              }
            }
        }
    }
    zoneTex.needsUpdate = true;
  }
  function applyVolcano() {
    const w = (volcano.wind * Math.PI) / 180;
    plumeMat.uniforms.uWind.value.set(Math.sin(w), -Math.cos(w));
    plumeMat.uniforms.uInt.value = volcano.intensity;
    plume.visible = risk === 'volcan' && volcano.phenomenon !== 'projections';
    blocks.visible = risk === 'volcan' && volcano.phenomenon === 'projections';
    zoneMat.uniforms.uMode.value =
      risk === 'seisme'
        ? 2
        : risk === 'pluies'
          ? 6
          : risk === 'volcan' && volcano.phenomenon === 'nuee'
            ? 7
            : 0;
  }
  const levelAt = (i: number, j: number) =>
    Math.round(
      zoneData[
        (Math.min(H - 1, Math.max(0, Math.round(j))) * W +
          Math.min(W - 1, Math.max(0, Math.round(i)))) *
          4
      ] / 85,
    );

  // Survol : rayon caméra → relief (marche le long du rayon, précise et
  // légère, sans parcourir les 200 000 triangles).
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function probe(e: PointerEvent): Hover | null {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
    const inv = island.matrixWorld.clone().invert();
    const o = ray.ray.origin.clone().applyMatrix4(inv);
    const d = ray.ray.direction.clone().transformDirection(inv);
    for (let t = 0; t < 260; t += 0.25) {
      const p = o.clone().addScaledVector(d, t);
      const i = p.x / KM + W / 2;
      const j = p.z / KM + H / 2;
      if (p.y < BASE) return null;
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const h = hAt(i, j);
      if (p.y <= Math.max(yOf(h), 0)) {
        const { lat, lon } = toLatLon(i, j);
        return {
          level: risk ? levelAt(i, j) : 0,
          lat,
          lon,
          alt: Math.round(h),
        };
      }
    }
    return null;
  }
  let down: { x: number; y: number } | null = null;
  let lastHover = -2;
  const tilt = new THREE.Vector2();
  const tiltGoal = new THREE.Vector2();
  const el = renderer.domElement;
  el.addEventListener(
    'pointerdown',
    (e) => (down = { x: e.clientX, y: e.clientY }),
  );
  el.addEventListener('pointermove', (e) => {
    if (!opts.reduced) {
      const r = el.getBoundingClientRect();
      tiltGoal.set(
        ((e.clientY - r.top) / r.height - 0.5) * 0.05,
        ((e.clientX - r.left) / r.width - 0.5) * -0.05,
      );
    }
    if (e.buttons) return;
    const h = probe(e);
    const lv = h ? h.level : -1;
    const c = borders.visible && h ? communeAt(h.lat, h.lon) : null;
    if (borders.visible) showCommune(c ?? pinned);
    el.style.cursor = (h && h.level > 0) || c ? 'pointer' : 'grab';
    zoneMat.uniforms.uHover.value = lv > 0 ? lv : -1;
    if (lv !== lastHover || lv > 0) opts.onHover(h && h.level > 0 ? h : null);
    lastHover = lv;
    invalidate();
  });
  el.addEventListener('pointerleave', () => {
    tiltGoal.set(0, 0);
    zoneMat.uniforms.uHover.value = -1;
    lastHover = -2;
    opts.onHover(null);
    if (borders.visible) showCommune(pinned);
    invalidate();
  });
  el.addEventListener('pointerup', (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
      const h = probe(e);
      if (h) opts.onPoint?.(h.lat, h.lon);
      if (h && h.level > 0) opts.onPick(h);
      else if (borders.visible) {
        const c = h ? communeAt(h.lat, h.lon) : null;
        pinned = c === pinned ? null : c;
        showCommune(pinned);
      }
    }
    down = null;
  });

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Vue d'ensemble : île entière centrée, mer autour (≈ 56 × 62 km).
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(62 / 2 / t, 56 / 2 / (t * camera.aspect));
    home.copy(look).multiplyScalar(d).add(controls.target);
    controls.minDistance = d * 0.32;
    controls.maxDistance = d * 1.2;
    if (!moved) camera.position.copy(home);
    plumeMat.uniforms.uScale.value = h / 600;
    invalidate();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const animated = () => !opts.reduced;
  let shake = 0;
  let raf = 0;
  let last = performance.now();
  let homing: {
    from: THREE.Vector3;
    fromT: THREE.Vector3;
    to: THREE.Vector3;
    toT: THREE.Vector3;
    t: number;
  } | null = null;
  const flyTo = (toT: THREE.Vector3, to: THREE.Vector3) => {
    homing = {
      from: camera.position.clone(),
      fromT: controls.target.clone(),
      to,
      toT,
      t: opts.reduced ? 1 : 0,
    };
  };
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) return;
    if (animated()) time += dt;
    tilt.lerp(tiltGoal, 0.08);
    island.rotation.set(tilt.x, 0, tilt.y);
    if (homing) {
      homing.t = Math.min(1, homing.t + dt * 1.8);
      const e = 1 - (1 - homing.t) ** 3;
      camera.position.lerpVectors(homing.from, homing.to, e);
      controls.target.lerpVectors(homing.fromT, homing.toT, e);
      if (homing.t >= 1) homing = null;
    }
    const moving =
      controls.update() || homing || tilt.distanceTo(tiltGoal) > 1e-4;
    if (!(dirty || moving || animated())) return;
    dirty = false;
    for (const m of [zoneMat, fxMat, plumeMat, oceanMat, rainMat, dustMat])
      m.uniforms.uTime.value = time;
    // Nuée : front qui avance puis recommence (montré entier si réduit).
    zoneMat.uniforms.uFront.value = opts.reduced ? 2 : (time * 0.12) % 1.25;
    // Orage : éclair bref à intervalle irrégulier (aucun si réduit).
    hemi.intensity = 0.9;
    bolt.visible = false;
    if (risk === 'pluies' && !opts.reduced && time > nextFlash) {
      if (time > nextFlash + 0.14) nextFlash = time + 2.5 + Math.random() * 4;
      else {
        if (bolt.userData.at !== nextFlash) {
          const x = (Math.random() - 0.5) * 30;
          const z = (Math.random() - 0.5) * 34;
          const pts = [];
          for (let k = 0; k <= 10; k++)
            pts.push(
              new THREE.Vector3(
                x + (k ? (Math.random() - 0.5) * 1.6 : 0),
                9 - k * 0.85,
                z + (k ? (Math.random() - 0.5) * 1.6 : 0),
              ),
            );
          bolt.geometry.setFromPoints(pts);
          bolt.userData.at = nextFlash;
        }
        bolt.visible = true;
        hemi.intensity = 2.4;
      }
    }
    if (risk === 'cyclone') {
      const t = cycloneT ?? (time * 0.05) % 1;
      const p = curve.getPointAt(t);
      vortex.position.set(p.x, 4.2, p.z);
      spin.position.y = -3.6;
      cloud.rotation.z = time * 0.35;
      spin.rotation.y = time * 0.35;
      if (cycloneT === null) opts.onCyclone?.(t);
    }
    // Séisme : légère vibration au passage des ondes.
    shake =
      risk === 'seisme' && !opts.reduced
        ? Math.max(0, Math.sin(time * 0.78) - 0.9) * 0.6
        : 0;
    camera.position.x += Math.sin(time * 60) * shake;
    renderer.render(scene, camera);
    camera.position.x -= Math.sin(time * 60) * shake;
    const r = el.getBoundingClientRect();
    for (const m of markers) {
      const w = (
        m.id === 'cyclone-eye' ? vortex.position.clone() : m.p.clone()
      ).applyMatrix4(island.matrixWorld);
      const s = w.project(camera);
      opts.place(
        m.id,
        ((s.x + 1) / 2) * r.width,
        ((1 - s.y) / 2) * r.height,
        s.z < 1 && Math.abs(s.x) < 1.05 && Math.abs(s.y) < 1.05,
      );
    }
    opts.settle?.();
  }
  raf = requestAnimationFrame(frame);

  const sph = new THREE.Spherical();
  const api: CarteScene = {
    setRisk(id, effects = true) {
      risk = id;
      if (id) fillZones(id);
      zones.visible = !!id;
      fx.visible = id === 'tsunami' || id === 'seisme' || id === 'sargasses';
      fxMat.uniforms.uMode.value =
        { tsunami: 1, seisme: 2, sargasses: 5 }[id as 'tsunami'] ?? 0;
      vortex.visible = trackLine.visible = id === 'cyclone';
      rain.visible = id === 'pluies';
      haze.visible = dust.visible = id === 'brume';
      // Zones seules : aucun effet animé (pas de simulation affichée).
      if (!effects) {
        fx.visible = vortex.visible = trackLine.visible = false;
        rain.visible = haze.visible = dust.visible = false;
      }
      if (!id && pulses) fx.visible = true;
      fxMat.uniforms.uMode.value = id
        ? fxMat.uniforms.uMode.value
        : pulses
          ? 3
          : 0;
      applyVolcano();
      if (!effects) plume.visible = blocks.visible = false;
      invalidate();
    },
    focus(lat, lon) {
      moved = true;
      const p = toPixel(lat, lon);
      const t = world(p.i, p.j, 0);
      flyTo(
        t,
        t.clone().add(look.clone().multiplyScalar(home.distanceTo(aim) * 0.45)),
      );
      invalidate();
    },
    setBrume(intensity) {
      (haze.material as THREE.MeshBasicMaterial).opacity = [0.12, 0.26, 0.42][
        intensity - 1
      ];
      dustMat.uniforms.uDens.value = [0.35, 0.65, 1][intensity - 1];
      invalidate();
    },
    setPulses(list) {
      pulses = !!list?.length;
      const q = fxMat.uniforms.uQ.value as THREE.Vector2[];
      q.forEach((v, k) => {
        const e = list?.[k];
        if (!e) return v.set(1e4, 1e4);
        const p = toPixel(e.lat, e.lon);
        const w = world(p.i, p.j, 0);
        v.set(w.x, w.z);
      });
      if (!risk) {
        fx.visible = pulses;
        fxMat.uniforms.uMode.value = pulses ? 3 : 0;
      }
      invalidate();
    },
    setVolcano(v) {
      volcano = v;
      if (risk === 'volcan') fillZones('volcan');
      applyVolcano();
      invalidate();
    },
    setQuakes(list) {
      quakeMesh.visible = !!list;
      const m = new THREE.Matrix4();
      const c = new THREE.Color();
      quakeMesh.count = 0;
      for (const q of list ?? []) {
        const p = toPixel(q.lat, q.lon);
        if (
          p.i < 0 ||
          p.j < 0 ||
          p.i >= W ||
          p.j >= H ||
          quakeMesh.count >= 400
        )
          continue;
        const r = 0.25 + Math.max(0, q.mag - 2.5) * 0.3;
        m.makeScale(r, r, r).setPosition(
          world(p.i, p.j, Math.max(0.05, yOf(hAt(p.i, p.j))) + r * 0.6),
        );
        quakeMesh.setMatrixAt(quakeMesh.count, m);
        quakeMesh.setColorAt(
          quakeMesh.count,
          c.set(levels[q.depth < 30 ? 2 : q.depth < 100 ? 1 : 0]),
        );
        quakeMesh.count++;
      }
      quakeMesh.instanceMatrix.needsUpdate = true;
      if (quakeMesh.instanceColor) quakeMesh.instanceColor.needsUpdate = true;
      invalidate();
    },
    zoneLevel(lat, lon) {
      const p = toPixel(lat, lon);
      return risk ? levelAt(p.i, p.j) : 0;
    },
    exposure(lat, lon) {
      const p = toPixel(lat, lon);
      const i = Math.round(p.i);
      const j = Math.round(p.j);
      const inMap = i >= 0 && j >= 0 && i < W && j < H;
      // Plus proche cellule vérifiant `test`, recherche par anneaux.
      const nearest = (test: (k: number) => boolean, max: number) => {
        for (let r = 0; r <= max; r++) {
          let best = Infinity;
          for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              const x = i + dx;
              const y = j + dy;
              if (x < 0 || y < 0 || x >= W || y >= H) continue;
              if (test(y * W + x)) best = Math.min(best, Math.hypot(dx, dy));
            }
          if (best < Infinity) return Math.round(best * KM * 10) / 10;
        }
        return null;
      };
      const big = 5 / (KM * KM); // cours d'eau drainant au moins 5 km²
      return {
        inMap,
        alt: inMap ? Math.round(hAt(i, j)) : 0,
        coastKm: inMap ? nearest((k) => heights[k] <= 0, 300) : null,
        peleeKm:
          Math.round(Math.hypot(p.i - top.i, p.j - top.j) * KM * 10) / 10,
        riverKm: inMap ? nearest((k) => flow()[k] >= big, 150) : null,
      };
    },
    setMarkers(list) {
      markers = list.map((m) => {
        const p = toPixel(m.lat, m.lon);
        return {
          id: m.id,
          p: world(
            p.i,
            p.j,
            m.sea ? 0.1 : Math.max(0, yOf(hAt(p.i, p.j))) + 0.15,
          ),
        };
      });
      invalidate();
    },
    setCyclone(t) {
      cycloneT = t;
      invalidate();
    },
    orbit(dTheta, dPhi) {
      sph.setFromVector3(camera.position.clone().sub(controls.target));
      sph.theta = THREE.MathUtils.clamp(
        sph.theta + dTheta,
        controls.minAzimuthAngle,
        controls.maxAzimuthAngle,
      );
      sph.phi = THREE.MathUtils.clamp(
        sph.phi + dPhi,
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      camera.position.setFromSpherical(sph).add(controls.target);
      invalidate();
    },
    zoom(f) {
      const v = camera.position.clone().sub(controls.target);
      v.setLength(
        THREE.MathUtils.clamp(
          v.length() * f,
          controls.minDistance,
          controls.maxDistance,
        ),
      );
      camera.position.copy(controls.target).add(v);
      invalidate();
    },
    reset() {
      moved = false;
      flyTo(aim.clone(), home.clone());
      invalidate();
    },
    setCommunes(on) {
      borders.visible = on;
      if (!on) pinned = null;
      showCommune(on ? pinned : null);
      picked.visible = on && !!commune;
      invalidate();
    },
    heightAt(lat, lon) {
      const p = toPixel(lat, lon);
      return Math.round(hAt(p.i, p.j));
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material)
          ? m.material
          : m.material
            ? [m.material]
            : []
        ).forEach((x) => x.dispose());
      });
      maskTex.dispose();
      zoneTex.dispose();
      spiralTex.dispose();
      quakeMesh.dispose();
      renderer.dispose();
      el.remove();
    },
  };
  return api;
}

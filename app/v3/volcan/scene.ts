import * as THREE from 'three';
import { PX_M, readHeights, toPixel } from '../carte/dem.js';

// Volcan du Dashboard : relief RÉEL de la montagne Pelée (même MNT que la
// carte 3D, ~74 m/pixel, affiné par bruit), végétation et roches
// instanciées, fumées / cendres / projections en particules GPU, coulées
// qui suivent la plus grande pente du relief. Six phases = métaphore de
// l'avancement du PFE, jamais l'activité réelle de la Pelée. Aucun flash :
// variations de lumière lentes et bornées.
export type VolcanScene = {
  setPhase: (phase: number) => void;
  setNight: (night: boolean) => void;
  setAnimated: (on: boolean) => void;
  dispose: () => void;
};

const SUMMIT = { lat: 14.8094, lon: -61.1658 };
const CROP = 168; // pixels du MNT (~12,5 km de côté)
const EXAG = 1.8; // exagération verticale
const U = PX_M / 1000; // km par pixel

// Paramètres continus d'une phase (1 → 6), interpolés entre phases.
function look(a: number) {
  const s = (x0: number, x1: number) =>
    Math.min(1, Math.max(0, (a - x0) / (x1 - x0)));
  return {
    smoke: 0.05 + 0.95 * s(1.5, 6), // densité
    plume: 0.5 + 2.2 * s(2, 6) ** 1.4, // hauteur (km de scène)
    ash: s(2.5, 4), // fumée grise, cendres
    glow: s(2.6, 6), // lueur interne / cratère
    eject: s(3.6, 6), // projections
    lava: s(5, 6), // coulées
    shake: s(4.4, 5) * (1 - s(5.6, 6) * 0.5),
    vapor: s(1.2, 2),
  };
}

const NOISE = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

export async function createVolcan(
  host: HTMLElement,
  opts: { reduced: boolean },
): Promise<VolcanScene> {
  // Relief : fenêtre du MNT centrée sur le sommet, affinée.
  const c = toPixel(SUMMIT.lat, SUMMIT.lon);
  const x0 = Math.round(c.i - CROP / 2);
  const y0 = Math.round(c.j - CROP / 2);
  const dem = await readHeights(x0, y0, CROP, CROP);
  const demAt = (i: number, j: number) => {
    const x = Math.min(CROP - 1.001, Math.max(0, i));
    const y = Math.min(CROP - 1.001, Math.max(0, j));
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const h = (a: number, b: number) => dem[b * CROP + a];
    return (
      (h(xi, yi) * (1 - fx) + h(xi + 1, yi) * fx) * (1 - fy) +
      (h(xi, yi + 1) * (1 - fx) + h(xi + 1, yi + 1) * fx) * fy
    );
  };
  const vn = (x: number, z: number) =>
    Math.sin(x * 1.7 + Math.sin(z * 2.3)) * Math.cos(z * 1.9 + x * 0.7);
  const cx = c.i - x0;
  const cz = c.j - y0;
  // Hauteur en mètres : MNT + relief fin + cratère (cuvette sommitale).
  // Bords de la fenêtre : le relief plonge doucement sous la mer (aucune
  // falaise carrée), le volcan reste intact au centre.
  const meters = (i: number, j: number) => {
    const e = Math.hypot(i - CROP / 2, j - CROP / 2) / (CROP / 2);
    const f = 1 - Math.min(1, Math.max(0, (e - 0.62) / 0.3)) ** 1.5;
    const h = demAt(i, j);
    if (h <= 0) return h * f - (1 - f) * 60;
    const r = Math.hypot(i - cx, j - cz) * PX_M;
    const detail = 14 * vn(i * 0.9, j * 0.9) + 6 * vn(i * 2.7, j * 2.3);
    return (
      (h + detail * Math.min(1, h / 200) - 70 * Math.exp(-((r / 230) ** 2))) *
        f -
      (1 - f) * 60
    );
  };
  const S = CROP * U;
  const toY = (m: number) => (m > 0 ? (m / 1000) * EXAG : (m / 1000) * 0.4);
  const at = (x: number, z: number) => toY(meters(x / U + cx, z / U + cz));

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  let dpr = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = 'volcan-canvas';
  // Basse consommation : rendu logiciel (pas de GPU) ou images trop
  // lentes → résolution réduite, sans ombres, ~8 i/s ; la page reste fluide.
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  let low = /swiftshader|llvmpipe|software/i.test(
    String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ''),
  );
  const lowPower = () => {
    low = true;
    dpr = 0.6;
    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = false;
  };
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const summitY = at(0, 0);
  const target = new THREE.Vector3(0, summitY * 0.62, 0);
  scene.fog = new THREE.Fog(0xcfdde8, 16, 48);

  // Terrain : couleurs par altitude, pente et bruit (forêt, savane
  // d'altitude, roche et cendre près du sommet).
  // Niveau de détail : maillage plus fin si le GPU le permet.
  const GRID = low ? 150 : 256;
  const geo = new THREE.PlaneGeometry(S, S, GRID, GRID);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const forest = new THREE.Color('#2f5a2a');
  const forest2 = new THREE.Color('#4d7a35');
  const high = new THREE.Color('#7d8a55');
  const rock = new THREE.Color('#6e6258');
  const ashC = new THREE.Color('#4a4440');
  const sand = new THREE.Color('#b9a888');
  const seabed = new THREE.Color('#2c5a6a');
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k);
    const z = pos.getZ(k);
    const m = meters(x / U + cx, z / U + cz);
    pos.setY(k, toY(m));
    const slope = Math.abs(at(x + 0.05, z) - at(x - 0.05, z)) * 10;
    const n = 0.5 + 0.5 * vn(x * 4, z * 4);
    if (m <= 0) col.copy(seabed);
    else if (m < 15) col.copy(sand);
    else {
      col.copy(forest).lerp(forest2, n * 0.7);
      col.lerp(high, Math.min(1, Math.max(0, (m - 700) / 400)));
      col.lerp(rock, Math.min(1, Math.max(0, (m - 1150) / 180) + slope * 0.25));
      col.lerp(ashC, Math.exp(-((Math.hypot(x, z) / 0.35) ** 2)) * 0.8);
    }
    colors.set([col.r, col.g, col.b], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  // Détail au pixel : strates de roche sur les pentes raides, taches de
  // végétation, ravines assombries (bruit procédural, aucune texture).
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
  });
  terrainMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWP; varying vec3 vWN;',
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWP; varying vec3 vWN;\n' + NOISE,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float steep = 1. - clamp(vWN.y, 0., 1.);
        float n = noise(vWP * 38.) * .6 + noise(vWP * 110.) * .4;
        float strata = .5 + .5 * sin(vWP.y * 90. + noise(vWP * 12.) * 6.);
        vec3 rockC = vec3(.36, .31, .27) * (.8 + .3 * strata);
        if (vWP.y > .03) {
          diffuseColor.rgb = mix(diffuseColor.rgb * (.78 + .4 * n), rockC, smoothstep(.45, .75, steep));
          diffuseColor.rgb *= 1. - .25 * smoothstep(.2, .5, steep) * (1. - n);
        }`,
      );
  };
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.castShadow = terrain.receiveShadow = true;
  scene.add(terrain);

  // Mer (baie de Saint-Pierre à l'ouest), opaque : dessinée avant les
  // fumées, elle ne les recouvre jamais.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      color: '#1d4f68',
      roughness: 0.25,
      metalness: 0.1,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.004;
  sea.receiveShadow = true;
  scene.add(sea);

  // Végétation et roches : instances (une géométrie, un appel de rendu).
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const place = (
    count: number,
    ok: (m: number, slope: number, r: number) => boolean,
    mesh: THREE.InstancedMesh,
    size: (m: number) => number,
    tint: (m: number) => THREE.Color,
  ) => {
    const o = new THREE.Object3D();
    let n = 0;
    for (let tries = 0; n < count && tries < count * 20; tries++) {
      const x = (rnd() - 0.5) * S * 0.96;
      const z = (rnd() - 0.5) * S * 0.96;
      const m = meters(x / U + cx, z / U + cz);
      const slope = Math.abs(at(x + 0.05, z) - at(x - 0.05, z)) * 10;
      if (!ok(m, slope, Math.hypot(x, z))) continue;
      const k = size(m) * (0.7 + rnd() * 0.6);
      o.position.set(x, toY(m) + k * 0.4, z);
      o.rotation.set(0, rnd() * 6.3, 0);
      o.scale.setScalar(k);
      o.updateMatrix();
      mesh.setMatrixAt(n, o.matrix);
      mesh.setColorAt(n, tint(m));
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  };
  const trees = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.4, 1, 6),
    new THREE.MeshStandardMaterial({ roughness: 1 }),
    5000,
  );
  place(
    5000,
    (m, sl) => m > 30 && m < 950 && sl < 0.9 && rnd() < 0.85,
    trees,
    (m) => 0.038 - m * 0.000015,
    (m) =>
      new THREE.Color().setHSL(
        0.27 + rnd() * 0.06,
        0.45,
        0.16 + rnd() * 0.08 + m * 0.00004,
      ),
  );
  const rockMat = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    emissive: new THREE.Color('#ff5a1a'),
    emissiveIntensity: 0,
  });
  const rocks = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    rockMat,
    360,
  );
  place(
    360,
    (m, _sl, r) => m > 980 || (m > 600 && r < 1.4 && rnd() < 0.4),
    rocks,
    () => 0.05,
    () => new THREE.Color().setHSL(0.07, 0.08, 0.2 + rnd() * 0.12),
  );
  rocks.castShadow = true;

  // Ciel : dégradé jour / nuit, étoiles et lune la nuit, soleil le jour.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uDay: { value: 1 }, uGlow: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `uniform float uDay, uGlow; varying vec3 vP;
      void main() { float h = clamp(vP.y * 1.6, 0., 1.);
        vec3 day = mix(vec3(.86,.9,.93), vec3(.33,.55,.8), h);
        vec3 night = mix(vec3(.09,.07,.12), vec3(.01,.015,.04), h);
        vec3 c = mix(night, day, uDay);
        c += vec3(1.,.38,.12) * uGlow * (1. - uDay * .7) * exp(-h * 5.) * .35;
        gl_FragColor = vec4(c, 1.); }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat));
  const starGeo = new THREE.BufferGeometry();
  const stars = new Float32Array(900 * 3);
  for (let k = 0; k < 900; k++) {
    const t = rnd() * Math.PI * 2;
    const y = 0.15 + rnd() * 0.85;
    const r = Math.sqrt(1 - y * y);
    stars.set([Math.cos(t) * r * 85, y * 85, Math.sin(t) * r * 85], k * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#dfe6ff',
    size: 1.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 32),
    new THREE.MeshBasicMaterial({
      color: '#f1efe4',
      transparent: true,
      fog: false,
    }),
  );
  moon.position.set(30, 38, -60);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Lumières : soleil (ombres), ciel, lueur du cratère.
  const sun = new THREE.DirectionalLight('#fff2dc', 2.6);
  sun.position.set(-14, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -8,
    right: 8,
    top: 8,
    bottom: -8,
    far: 60,
  });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight('#cfe3ff', '#3a3226', 1.1);
  scene.add(hemi);
  // Palette DS dans les lumières, fumées et lave : #F55536 #FF773D #F19143 #FABC3C.
  const crater = new THREE.PointLight('#ff773d', 0, 4.5, 1.8);
  crater.position.set(0, summitY + 0.25, 0);
  scene.add(crater);

  // Particules GPU : position calculée dans le shader (aucune mise à jour
  // côté CPU). Fumée / vapeur / cendres : disques doux, normal blending.
  const particles = (
    count: number,
    vertex: string,
    fragment: string,
    blending: THREE.Blending,
  ) => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(count * 4);
    for (let k = 0; k < seed.length; k++) seed[k] = rnd();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 400 },
        uTop: { value: summitY },
        uP: { value: new THREE.Vector4() },
        uQ: { value: new THREE.Vector4() },
      },
      vertexShader: NOISE + vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    scene.add(p);
    return { points: p, mat: m, count };
  };
  // uP : densité, hauteur, cendre, lueur ; uQ : nuit, vent, vapeur, -.
  const smoke = particles(
    2400,
    /* glsl */ `attribute vec4 seed; uniform float uTime, uScale, uTop; uniform vec4 uP, uQ;
      varying float vA; varying vec3 vC; varying vec4 vS;
      void main() {
        float life = pow(fract(uTime * (0.035 + seed.y * 0.03) + seed.x), 1.35);
        float on = step(seed.w, uP.x);
        float h = uP.y * pow(life, .8) * (.8 + seed.y * .35);
        float vap = step(seed.z, uQ.z * 0.35) * (1. - step(.6, uP.x));
        vec3 p = vec3(0., uTop + 0.16, 0.);
        float spread = 0.05 + 0.55 * life * (0.6 + seed.z) + h * 0.18 + uP.x * uP.z * smoothstep(.5, 1., life) * .6;
        float a = seed.z * 6.283 + uTime * 0.05;
        // Fumerolles : petites colonnes décentrées sur les flancs.
        vec3 base = vap > .5 ? vec3(cos(a) * .45, -.12, sin(a) * .45) : vec3(0.);
        p += base + vec3(cos(a) * spread, h * (vap > .5 ? .25 : 1.), sin(a) * spread);
        p.x += uQ.y * life * life * (0.6 + h * 0.4);
        p += (vec3(noise(vec3(seed.xy * 9., uTime * .1)), 0., noise(vec3(seed.yz * 9., uTime * .1))) - .5) * life * 1.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float size = (0.9 + 2. * life + h * 0.3) * (vap > .5 ? .5 : 1.);
        gl_PointSize = size * uScale / -mv.z;
        vA = on * smoothstep(0., .04, life) * (1. - smoothstep(.55, 1., life)) * (vap > .5 ? .5 : .45 + .3 * uP.z);
        vec3 white = mix(vec3(.93), vec3(.55,.56,.64), uQ.x);
        vec3 grey = mix(vec3(.26,.24,.23), vec3(.22,.2,.22), uQ.x);
        vC = mix(white, grey, uP.z * (1. - vap) * (.8 + .2 * life));
        // Éclairée par-dessous (lueur du cratère, surtout la nuit).
        vC += vec3(.945,.569,.263) * uP.w * pow(1. - life, 2.) * (.12 + .8 * uQ.x);
        vS = seed;
      }`,
    /* glsl */ `varying float vA; varying vec3 vC; varying vec4 vS;
      void main() { vec2 q = gl_PointCoord - .5; float d = length(q);
        float soft = smoothstep(.5, .1, d) * (.75 + .25 * sin(vS.x * 40. + q.x * 9. + q.y * 7.));
        gl_FragColor = vec4(vC, vA * soft); }`,
    THREE.NormalBlending,
  );
  // Projections, éclats, cendres : trajectoires balistiques.
  const ejecta = particles(
    700,
    /* glsl */ `attribute vec4 seed; uniform float uTime, uScale, uTop; uniform vec4 uP, uQ;
      varying float vA; varying vec3 vC;
      void main() {
        float T = 2.2 + seed.y * 1.6;
        float life = fract(uTime / T + seed.x);
        float on = step(seed.w, uP.x);
        float a = seed.z * 6.283;
        float v = (.7 + seed.y * 1.4) * (.5 + uP.y);
        vec3 dir = normalize(vec3(cos(a) * (.25 + seed.w * .5), 1.6, sin(a) * (.25 + seed.w * .5)));
        float t = life * T;
        vec3 p = vec3(0., uTop + .05, 0.) + dir * v * t + vec3(0., -.5 * .9 * t * t, 0.);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2. + seed.y * 3.) * uScale / 400. * (6. / -mv.z) * 2.;
        vA = on * (1. - smoothstep(.75, 1., life)) * step(uTop - .2, p.y);
        vC = mix(vec3(.98,.737,.235), vec3(.96,.333,.212), life) * (.45 + .45 * uQ.x);
      }`,
    /* glsl */ `varying float vA; varying vec3 vC;
      void main() { float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC, vA * smoothstep(.5, .15, d)); }`,
    THREE.AdditiveBlending,
  );
  // Brume / nuages accrochés aux flancs (vent d'est).
  const mist = particles(
    46,
    /* glsl */ `attribute vec4 seed; uniform float uTime, uScale, uTop; uniform vec4 uP, uQ;
      varying float vA; varying vec3 vC; varying vec4 vS;
      void main() {
        float life = fract(uTime * .008 + seed.x);
        vec3 p = vec3((life - .5) * 12., uTop * (.3 + seed.y * .35), (seed.z - .5) * 7.); p.z += sign(p.z) * 1.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.5 + seed.w * 2.) * uScale / -mv.z;
        vA = sin(life * 3.1416) * .22 * (1. - uP.z * .5);
        vC = mix(vec3(.97), vec3(.35,.37,.45), uQ.x);
        vS = seed;
      }`,
    /* glsl */ `varying float vA; varying vec3 vC; varying vec4 vS;
      void main() { vec2 q = gl_PointCoord - .5; float d = length(q * vec2(1., 1.8));
        gl_FragColor = vec4(vC, vA * smoothstep(.5, .05, d)); }`,
    THREE.NormalBlending,
  );

  // Explosions : salves périodiques, sphère de fragments et souffle
  // incandescent (éruption) ; montée de lumière progressive, sans flash.
  const burst = particles(
    520,
    /* glsl */ `attribute vec4 seed; uniform float uTime, uScale, uTop; uniform vec4 uP, uQ;
      varying float vA; varying vec3 vC;
      void main() {
        float P = 5.5 - seed.w * 1.5;
        float k = mod(uTime + seed.w * 2., P) / 1.6;
        float a = seed.x * 6.283, b = acos(1. - seed.y * 1.2);
        vec3 dir = vec3(sin(b) * cos(a), cos(b) * 1.3, sin(b) * sin(a));
        float r = (1. - exp(-k * 3.)) * (.5 + seed.z * .9) * (.6 + uP.y);
        vec3 p = vec3(0., uTop + .1, 0.) + dir * r - vec3(0., .25 * k * k, 0.);
        p += (noise(vec3(seed.xyz * 20.)) - .5) * .15 * k;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + seed.z * 2.5) * (1. + k) * uScale / -mv.z * .12;
        vA = step(seed.w, uP.x) * step(k, 1.) * smoothstep(0., .08, k) * (1. - k);
        vC = mix(vec3(.98,.737,.235), mix(vec3(1.,.467,.239), vec3(.25,.22,.2), k), k) * .9;
      }`,
    /* glsl */ `varying float vA; varying vec3 vC;
      void main() { float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC, vA * smoothstep(.5, .1, d)); }`,
    THREE.AdditiveBlending,
  );

  // Coulées : plus grande pente depuis le cratère, rubans lumineux qui
  // avancent (révélation progressive), jamais hors du relief.
  const flowGeo = new THREE.BufferGeometry();
  const fv: number[] = [];
  const fa: number[] = [];
  const fi: number[] = [];
  for (const start of [2.6, 3.4, 4.3, 5.4]) {
    let x = Math.cos(start) * 0.22;
    let z = Math.sin(start) * 0.22;
    const path: THREE.Vector3[] = [];
    for (let k = 0; k < 140; k++) {
      const y = at(x, z);
      if (y <= 0.01) break;
      path.push(new THREE.Vector3(x, y + 0.012, z));
      const e = 0.03;
      let gx = (at(x + e, z) - at(x - e, z)) / (2 * e);
      let gz = (at(x, z + e) - at(x, z - e)) / (2 * e);
      const g = Math.hypot(gx, gz) || 1;
      gx /= g;
      gz /= g;
      x -= gx * 0.04 + vn(x * 9, z * 9) * 0.006;
      z -= gz * 0.04 + vn(z * 9, x * 9) * 0.006;
    }
    const base = fv.length / 3;
    path.forEach((p, k) => {
      const q = path[Math.min(path.length - 1, k + 1)];
      const d = new THREE.Vector3().subVectors(q, p).setY(0).normalize();
      const w = 0.03 + 0.03 * (k / path.length);
      fv.push(
        p.x - d.z * w,
        p.y,
        p.z + d.x * w,
        p.x + d.z * w,
        p.y,
        p.z - d.x * w,
      );
      fa.push(k / 140, 0, k / 140, 1);
      if (k) {
        const b = base + (k - 1) * 2;
        fi.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    });
  }
  flowGeo.setAttribute('position', new THREE.Float32BufferAttribute(fv, 3));
  flowGeo.setAttribute('uvf', new THREE.Float32BufferAttribute(fa, 2));
  flowGeo.setIndex(fi);
  const flowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlow: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `attribute vec2 uvf; varying vec2 vU; void main() { vU = uvf; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader:
      NOISE +
      /* glsl */ `uniform float uTime, uFlow; varying vec2 vU;
      void main() { float edge = 1. - abs(vU.y - .5) * 2.;
        float n = noise(vec3(vU.x * 60. - uTime * .6, vU.y * 4., uTime * .2));
        float front = smoothstep(uFlow, uFlow - .04, vU.x);
        vec3 c = mix(vec3(.96,.333,.212) * .55, mix(vec3(1.,.467,.239), vec3(.98,.737,.235), n), n * edge);
        gl_FragColor = vec4(c, front * smoothstep(0., .5, edge) * (.65 + .35 * n)); }`,
  });
  const flows = new THREE.Mesh(flowGeo, flowMat);
  flows.renderOrder = 3;
  scene.add(flows);

  // Caméra bornée : légère rotation autonome, parallaxe au survol, glisser
  // doux, clic pour un zoom léger ; retour fluide.
  const base = { az: 2.35, el: 0.2, r: 10.5 };
  const goal = { az: 0, el: 0, zoom: 1 };
  const cur = { az: 0, el: 0, zoom: 1 };
  let drag: { x: number; y: number; az: number; el: number } | null = null;
  let hover = { x: 0, y: 0 };
  const el = renderer.domElement;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    hover = {
      x: (e.clientX - r.left) / r.width - 0.5,
      y: (e.clientY - r.top) / r.height - 0.5,
    };
    if (drag) {
      goal.az = Math.max(
        -0.7,
        Math.min(0.7, drag.az - (e.clientX - drag.x) * 0.005),
      );
      goal.el = Math.max(
        -0.12,
        Math.min(0.25, drag.el + (e.clientY - drag.y) * 0.003),
      );
    }
    wake();
  });
  el.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointerup', (e) => {
    if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5)
      goal.zoom = goal.zoom === 1 ? 0.78 : 1;
    drag = null;
    wake();
  });
  el.addEventListener('pointerleave', () => {
    hover = { x: 0, y: 0 };
    if (!drag) {
      goal.az = 0;
      goal.el = 0;
    }
    wake();
  });

  // État : phase continue (transition douce), jour / nuit, animation.
  let phase = 1;
  let shown = 1;
  let night = 0;
  let nightGoal = 0;
  let animated = !opts.reduced;
  let visible = true;
  let time = 0;
  let flow = 0;
  let last = performance.now();
  let raf = 0;
  let slow = 0;
  let frames = 0;
  let cost = 0;
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Cadrage : volcan entier, non coupé, quel que soit le format.
    base.r = 12 * Math.max(1, 1.9 / camera.aspect);
    camera.updateProjectionMatrix();
    for (const p of [smoke, ejecta, mist, burst])
      p.mat.uniforms.uScale.value = h * dpr * 0.9;
  };
  const ro = new ResizeObserver(() => {
    resize();
    wake();
  });
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    wake();
  });
  io.observe(host);
  const onVis = () => wake();
  document.addEventListener('visibilitychange', onVis);

  function frame(now: number) {
    raf = 0;
    // Pas de temps borné (jamais négatif : horodatage de l'image).
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (animated) time += dt;
    const k = animated ? 1 - Math.exp(-dt * 2.2) : 1;
    shown += (phase - shown) * k;
    night += (nightGoal - night) * (animated ? 1 - Math.exp(-dt * 2) : 1);
    const L = look(shown);
    flow = L.lava > 0.05 ? Math.min(1, flow + (animated ? dt * 0.12 : 1)) : 0;
    const day = 1 - night;

    // Lumières (variations lentes, sans flash).
    const flick = animated
      ? 0.92 + 0.08 * Math.sin(time * 2.1) * Math.sin(time * 1.3)
      : 1;
    sun.intensity = 2.6 * day + 0.5 * night;
    sun.color.set(day > 0.5 ? '#fff2dc' : '#9fb4ff');
    sun.position.set(day > 0.5 ? -14 : 12, 18, day > 0.5 ? 10 : -8);
    hemi.intensity = 0.45 + 0.65 * day;
    crater.intensity =
      (L.glow * 12 + L.lava * 10) * flick * (0.45 + 0.55 * night);
    rockMat.emissiveIntensity = L.glow * 0.7 * flick;
    skyMat.uniforms.uDay.value = day;
    skyMat.uniforms.uGlow.value = L.glow;
    starMat.opacity = night * 0.9;
    (moon.material as THREE.MeshBasicMaterial).opacity = night;
    sun.castShadow = day > 0.3;
    (scene.fog as THREE.Fog).color.setRGB(
      0.81 * day + 0.06 * night,
      0.87 * day + 0.05 * night,
      0.91 * day + 0.09 * night,
    );
    renderer.toneMappingExposure = 1 + night * 0.25;
    for (const p of [smoke, ejecta, mist, burst]) {
      p.mat.uniforms.uTime.value = time;
      p.mat.uniforms.uQ.value.set(night, 0.35, L.vapor, 0);
    }
    smoke.mat.uniforms.uP.value.set(L.smoke, L.plume, L.ash, L.glow);
    ejecta.mat.uniforms.uP.value.set(L.eject * 0.9, 0.4 + L.lava * 0.8, 0, 0);
    mist.mat.uniforms.uP.value.set(1, 0, L.ash, 0);
    ejecta.points.visible = L.eject > 0.01;
    burst.mat.uniforms.uP.value.set(L.lava * 0.9 + L.shake * 0.2, L.lava, 0, 0);
    burst.points.visible = L.lava + L.shake > 0.02;
    flowMat.uniforms.uTime.value = time;
    flowMat.uniforms.uFlow.value = flow;
    flows.visible = flow > 0;

    // Caméra.
    const ease = animated ? 1 - Math.exp(-dt * 3) : 1;
    const auto = animated ? Math.sin(time * 0.06) * 0.18 : 0;
    cur.az += (goal.az + hover.x * 0.12 + auto - cur.az) * ease;
    cur.el += (goal.el - hover.y * 0.05 - cur.el) * ease;
    cur.zoom += (goal.zoom - cur.zoom) * ease;
    const r = base.r * cur.zoom * (1 + L.plume * 0.1);
    // Panache haut : cadrage relevé, volcan et colonne entiers.
    const ty = target.y + L.plume * 0.32;
    const az = base.az + cur.az;
    const elv = base.el + cur.el;
    camera.position.set(
      Math.cos(az) * Math.cos(elv) * r,
      ty + Math.sin(elv) * r,
      Math.sin(az) * Math.cos(elv) * r,
    );
    // Pré-éruption : secousses brèves et faibles (jamais avec animations
    // réduites).
    if (animated && L.shake > 0) {
      const burst = Math.max(0, Math.sin(time * 0.9) - 0.82) * 5;
      camera.position.y += Math.sin(time * 23) * 0.012 * L.shake * burst;
      camera.position.x += Math.sin(time * 19) * 0.01 * L.shake * burst;
    }
    camera.lookAt(target.x, ty + (1 - cur.zoom) * 0.6, target.z);
    const t0 = performance.now();
    renderer.render(scene, camera);
    cost += performance.now() - t0;

    // DPR adaptatif : sous ~40 i/s en moyenne, résolution réduite ; rendu
    // trop coûteux (> 40 ms par image) → basse consommation.
    frames++;
    slow += dt > 1 / 40 ? 1 : 0;
    if (frames === 60) {
      if (!low && cost / frames > 40) lowPower();
      else if (slow > 30 && dpr > 0.75) {
        dpr = Math.max(0.75, dpr - 0.25);
        renderer.setPixelRatio(dpr);
      }
      resize();
      frames = slow = cost = 0;
    }
    const settling =
      Math.abs(phase - shown) > 0.002 ||
      Math.abs(nightGoal - night) > 0.002 ||
      Math.abs(goal.zoom - cur.zoom) > 0.002;
    if (animated || settling) next();
  }
  // Une seule boucle à la fois : `next` enchaîne, `wake` relance après une
  // pause ; basse consommation : ~8 i/s.
  let timer = 0;
  function next() {
    if (raf || timer || !visible || document.hidden) return;
    if (low)
      timer = window.setTimeout(() => {
        timer = 0;
        raf = requestAnimationFrame(frame);
      }, 110);
    else raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf && !timer) last = performance.now();
    next();
  }
  if (low) lowPower();
  resize();

  return {
    setPhase(p) {
      phase = p;
      if (!animated) shown = p;
      wake();
    },
    setNight(n) {
      nightGoal = n ? 1 : 0;
      wake();
    },
    setAnimated(on) {
      animated = on;
      wake();
    },
    dispose() {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
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
      renderer.dispose();
      renderer.forceContextLoss();
      el.remove();
    },
  };
}

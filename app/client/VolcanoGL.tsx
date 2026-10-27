import { useEffect, useRef } from 'react';

// Volcan réaliste en WebGL : un seul shader plein cadre, écrit pour DS-Studio
// (aucune dépendance, aucun code tiers). Relief 2,5D éclairé par la lave,
// chenaux de lave qui s'écoulent, panache de fumée, braises et fontaine de
// lave. `activity` (0 → 1) suit les dates du projet.
// Économie : résolution réduite, 30 i/s max, pause hors écran ou onglet
// caché, une seule image si l'utilisateur préfère réduire les animations.

const vertex = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const fragment = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uActivity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

const float TOP = 0.02;      // hauteur du cratère
const float RIM = 0.07;     // demi-largeur du cratère

// Profil du cône : pentes concaves, bords irréguliers.
float cone(float x) {
  float d = max(abs(x) - RIM, 0.0);
  return TOP - 0.62 * pow(d, 0.9) + 0.018 * (fbm(vec2(x * 7.0, 3.1)) - 0.5);
}
// Coordonnée angulaire : constante le long d'une ravine qui descend.
float ang(vec2 p) { return p.x / (TOP - p.y + 0.12); }
// Relief : bombé du cône et ravines radiales.
float relief(vec2 p) {
  float a = ang(p);
  float gul = fbm(vec2(a * 4.0, p.y * 3.0) + fbm(p * 6.0));
  return -abs(a) * 0.5 + 0.12 * gul + 0.05 * fbm(p * 14.0);
}
// Chenal i : position angulaire qui serpente en descendant.
float channel(vec2 p, float a0, float seed) {
  float depth = TOP - p.y;
  float c = a0 + 0.3 * (fbm(vec2(depth * 2.5, seed)) - 0.5) + 0.04 * sin(depth * 18.0 + seed);
  return abs(ang(p) - c) * (depth + 0.08);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p.y += 0.12;
  float act = uActivity;
  float t = uTime;
  vec2 crater = vec2(0.0, TOP);

  // Ciel nocturne, rougi par la lueur du volcan.
  float sky = clamp(p.y + 0.5, 0.0, 1.0);
  vec3 col = mix(vec3(0.43, 0.17, 0.08), vec3(0.05, 0.03, 0.025), smoothstep(0.0, 0.9, sky));
  float halo = exp(-length((p - crater) * vec2(1.0, 1.4)) * 4.0);
  col += vec3(1.0, 0.42, 0.12) * halo * (0.12 + 0.55 * act);
  col += vec3(0.8) * step(0.997, hash(floor(gl_FragCoord.xy / 2.0))) * smoothstep(0.2, 0.6, p.y) * 0.5;

  // Crêtes lointaines.
  float far = -0.16 + 0.07 * fbm(vec2(p.x * 2.2, 7.0));
  if (p.y < far) col = mix(vec3(0.09, 0.05, 0.04), vec3(0.16, 0.08, 0.05), halo * act);

  // Cône principal.
  float surf = cone(p.x);
  float glow = 0.0;
  if (p.y < surf) {
    vec2 e = vec2(0.002, 0.0);
    float h = relief(p);
    vec3 n = normalize(vec3(relief(p - e.xy) - relief(p + e.xy),
                            relief(p - e.yx) - relief(p + e.yx), 0.012));
    vec3 rock = mix(vec3(0.24, 0.15, 0.11), vec3(0.09, 0.055, 0.045), fbm(p * 22.0 + fbm(p * 5.0)));
    float skyLight = max(dot(n, normalize(vec3(-0.6, 0.5, 0.6))), 0.0);
    col = rock * (0.25 + 0.75 * skyLight) + 0.04 * h;
    // Lueur de la lave sur la roche proche du cratère.
    float near = exp(-length(p - crater) * 5.0);
    col += vec3(0.9, 0.3, 0.08) * near * (0.1 + 0.6 * act) * (0.4 + 0.6 * max(n.y, 0.0));

    // Chenaux de lave : révélés depuis le cratère selon l'activité.
    float depth = TOP - p.y;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a0 = fi == 0.0 ? -0.32 : (fi == 1.0 ? 0.36 : 0.02);
      float reach = clamp((act - 0.25 - fi * 0.17) * 1.8, 0.0, 1.0) * 0.6;
      if (reach <= 0.0) continue;
      float d = channel(p, a0, fi * 13.7);
      float w = (0.004 + depth * 0.016) * (0.7 + 0.6 * noise(vec2(depth * 9.0, fi)));
      float front = smoothstep(reach, reach - 0.05, depth);
      // Lave qui coule : texture entraînée vers le bas.
      float flow = fbm(vec2(ang(p) * 40.0, depth * 14.0 - t * (0.5 + act * 0.8)));
      float core = smoothstep(w, w * 0.2, d) * front;
      float crust = smoothstep(0.42, 0.75, flow);
      vec3 hot = mix(vec3(1.0, 0.9, 0.5), vec3(1.0, 0.45, 0.08), clamp(depth * 2.5 + crust, 0.0, 1.0));
      vec3 lava = mix(hot, vec3(0.32, 0.06, 0.02), crust * 0.85);
      col = mix(col, lava * 1.6, core);
      glow += exp(-d / (w * 2.5)) * front * 0.5;
    }
  }
  col += vec3(1.0, 0.38, 0.08) * glow * (0.35 + 0.4 * act);

  // Cratère incandescent.
  float cr = length((p - crater) * vec2(1.0, 4.0));
  col += vec3(1.0, 0.75, 0.35) * smoothstep(RIM, 0.0, cr) * (0.3 + 0.9 * act);

  // Panache de fumée et de cendres, éclairé par en dessous.
  vec2 q = p - crater;
  if (q.y > -0.02) {
    float drift = 0.25 * q.y * q.y + 0.04 * sin(q.y * 4.0 + t * 0.2);
    float width = 0.05 + q.y * (0.45 + 0.35 * act);
    vec2 w = vec2(q.x * 3.0, q.y * 2.2 - t * (0.08 + 0.12 * act));
    w += 0.6 * vec2(fbm(w + t * 0.05), fbm(w - 3.1));
    float dens = fbm(w * 1.6);
    float body = smoothstep(width, width * 0.15, abs(q.x - drift));
    float fade = smoothstep(1.1, 0.0, q.y) * smoothstep(-0.02, 0.04, q.y);
    float smoke = clamp((dens - 0.28) * 2.6, 0.0, 1.0) * body * fade * (0.5 + 0.5 * act);
    vec3 sc = mix(vec3(0.62, 0.56, 0.53), vec3(0.24, 0.2, 0.19), smoothstep(0.6, 1.0, act) * 0.7);
    sc += vec3(0.9, 0.35, 0.1) * exp(-q.y * 7.0) * (0.2 + 0.6 * act);
    col = mix(col, sc, smoke * 0.92);
  }

  // Braises et fontaine de lave : trajectoires balistiques.
  if (act > 0.28) {
    float count = floor(8.0 + act * 34.0);
    for (int i = 0; i < 44; i++) {
      float fi = float(i);
      if (fi >= count) break;
      float s = hash(vec2(fi, 3.7));
      float life = 1.2 + s * 1.4;
      float k = fract(t / life + hash(vec2(fi, 9.1)));
      float vx = (hash(vec2(fi, 1.3)) - 0.5) * (0.25 + 0.35 * act);
      float vy = 0.35 + hash(vec2(fi, 5.9)) * (0.3 + 0.7 * act);
      if (act > 0.85 && fi < 16.0) vy *= 1.35;
      vec2 pos = crater + vec2(vx * k, vy * k - 0.55 * k * k);
      float r = 0.0035 + 0.003 * s;
      float spark = exp(-dot(p - pos, p - pos) / (r * r));
      col += vec3(1.0, 0.6, 0.2) * spark * (1.0 - k) * 1.6;
    }
  }

  // Sol au premier plan.
  float ground = -0.5 + 0.03 * fbm(vec2(p.x * 6.0, 1.0));
  col = mix(col, vec3(0.05, 0.03, 0.025), smoothstep(ground + 0.01, ground - 0.01, p.y));

  // Tonalité filmique douce et vignette.
  col = 1.0 - exp(-col * 1.35);
  col *= 1.0 - 0.35 * dot(p * 0.9, p * 0.9);
  gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader invalide');
  return shader;
}

export function webglAvailable() {
  try {
    return !!document.createElement('canvas').getContext('webgl');
  } catch {
    return false;
  }
}

export default function VolcanoGL({
  activity,
  onFail,
}: {
  activity: number;
  onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const level = useRef(activity);
  level.current = activity;
  const draw = useRef<() => void>(() => {});
  useEffect(() => draw.current(), [activity]);
  useEffect(() => {
    const el = canvas.current!;
    const gl = el.getContext('webgl', {
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
    if (!gl) return onFail();
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) ?? 'Programme invalide');
    } catch {
      return onFail();
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uActivity = gl.getUniformLocation(program, 'uActivity');

    const still = matchMedia('(prefers-reduced-motion: reduce)');
    // Résolution réduite : le flou naturel de la fumée le permet.
    const scale = Math.min(devicePixelRatio || 1, 2) * 0.6;
    const resize = () => {
      const w = Math.max(1, Math.round(el.clientWidth * scale));
      const h = Math.max(1, Math.round(el.clientHeight * scale));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const start = performance.now();
    let frozen = 6; // instant figé, choisi pour montrer fumée et braises
    const render = (time: number) => {
      resize();
      gl.uniform2f(uRes, el.width, el.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uActivity, level.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw.current = () => {
      if (still.matches || !running) render(frozen);
    };
    let frame = 0;
    let last = 0;
    let visible = true;
    let running = false;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      frozen = (now - start) / 1000;
      render(frozen);
    };
    const update = () => {
      const should = visible && !document.hidden && !still.matches;
      if (should && !running) {
        running = true;
        frame = requestAnimationFrame(loop);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
      if (!running) render(frozen);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    io.observe(el);
    const ro = new ResizeObserver(() => !running && render(frozen));
    ro.observe(el);
    document.addEventListener('visibilitychange', update);
    still.addEventListener('change', update);
    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    el.addEventListener('webglcontextlost', lost);
    update();
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', update);
      still.removeEventListener('change', update);
      el.removeEventListener('webglcontextlost', lost);
      draw.current = () => {};
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [onFail]);
  return <canvas ref={canvas} className="volcano-layer volcano-gl" />;
}

// Audit de contraste WCAG 2.2 AA sur le rendu réel de l'aperçu (iframe de
// même origine) : couleurs calculées par le navigateur (tokens oklch
// compris), fonds imbriqués composés couche par couche, opacité, Light/Dark.
// Texte 4,5:1 ; grand texte (≥ 24 px, ou ≥ 18,66 px gras) et composants
// d'interface 3:1 (WCAG 1.4.3 et 1.4.11). Fond en dégradé ou en image :
// signalé « non calculable », jamais deviné.

export type Rgba = [number, number, number, number];
export type Issue = {
  el: HTMLElement;
  kind: 'text' | 'ui';
  ratio?: number;
  required: number;
  fg?: Rgba;
  bg?: Rgba;
  reason?: string;
  // Fond modifiable par l'utilisatrice (data-bg) : id de section ou de
  // bloc, '' pour l'écran ; undefined = couleurs du DS uniquement.
  owner?: string;
};

let ctx: CanvasRenderingContext2D | null = null;
// Toute couleur CSS (rgb, oklch, color(), mots-clés) → sRGB 8 bits + alpha.
export function parse(color: string): Rgba {
  const h = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (h) {
    const n = parseInt(h[1], 16);
    return [
      n >> 16,
      (n >> 8) & 255,
      n & 255,
      h[2] ? parseInt(h[2], 16) / 255 : 1,
    ];
  }
  ctx ??= document.createElement('canvas').getContext('2d', {
    willReadFrequently: true,
  });
  if (!ctx) return [0, 0, 0, 0];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a ? [r, g, b, a / 255] : [0, 0, 0, 0];
}
// Couleur a posée sur b (b opaque).
export const over = (a: Rgba, b: Rgba): Rgba => [
  a[0] * a[3] + b[0] * (1 - a[3]),
  a[1] * a[3] + b[1] * (1 - a[3]),
  a[2] * a[3] + b[2] * (1 - a[3]),
  1,
];
const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
export const luminance = (c: Rgba) =>
  0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export function ratio(a: Rgba, b: Rgba) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
export const hex = (c: Rgba) =>
  `#${c
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;

// Fond effectif sous un élément : couches de fond composées du plus proche
// au plus lointain ; blanc du canevas si tout est transparent.
function backdrop(el: Element, win: Window): Rgba | string {
  const layers: Rgba[] = [];
  for (let n: Element | null = el; n; n = n.parentElement) {
    const s = win.getComputedStyle(n);
    if (s.backgroundImage !== 'none') return 'fond en dégradé ou en image';
    const c = parse(s.backgroundColor);
    if (c[3] > 0) layers.push(c);
    if (c[3] >= 1) break;
  }
  let bg: Rgba = [255, 255, 255, 1];
  for (const l of layers.reverse()) bg = over(l, bg);
  return bg;
}
const opacity = (el: Element, win: Window) => {
  let o = 1;
  for (let n: Element | null = el; n; n = n.parentElement)
    o *= Number(win.getComputedStyle(n).opacity);
  return o;
};
const ownerOf = (el: Element) => {
  const o = el.closest('[data-bg]');
  if (!o) return undefined;
  return o.classList.contains('cmp-page')
    ? ''
    : (o.getAttribute('data-id') ?? undefined);
};
const visible = (el: HTMLElement, win: Window) => {
  const r = el.getBoundingClientRect();
  const s = win.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
};

// Aides de l'atelier (repères de dépôt, page vide) : pas du contenu.
const editorOnly =
  '[aria-hidden="true"], .cmp-placeholder, .cmp-empty, .cmp-drop-line';

export function audit(doc: Document): Issue[] {
  const win = doc.defaultView;
  const root = doc.querySelector('.cmp-page');
  if (!win || !root) return [];
  const issues: Issue[] = [];
  // Texte : éléments portant directement du texte visible.
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<HTMLElement>();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || seen.has(el) || !t.textContent?.trim()) continue;
    seen.add(el);
    if (!visible(el, win) || el.closest(editorOnly)) continue;
    const s = win.getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    const required = large ? 3 : 4.5;
    const bg = backdrop(el, win);
    if (typeof bg === 'string') {
      issues.push({ el, kind: 'text', required, reason: bg });
      continue;
    }
    const fg = parse(s.color);
    fg[3] *= opacity(el, win);
    const r = ratio(over(fg, bg), bg);
    if (r < required)
      issues.push({
        el,
        kind: 'text',
        ratio: r,
        required,
        fg,
        bg,
        owner: ownerOf(el),
      });
  }
  // Composants d'interface : fond ou bordure distinguable à 3:1 de ce qui
  // les entoure (sinon identifiés par leur seul texte : non concernés).
  for (const el of root.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, [role="checkbox"], [role="switch"], [role="tab"]',
  )) {
    if (!visible(el, win)) continue;
    const s = win.getComputedStyle(el);
    const outer = el.parentElement
      ? backdrop(el.parentElement, win)
      : undefined;
    if (!outer || typeof outer === 'string') continue;
    const fill = parse(s.backgroundColor);
    const border =
      parseFloat(s.borderTopWidth) > 0 ? parse(s.borderTopColor) : undefined;
    const cues = [fill, border].filter((c): c is Rgba => !!c && c[3] > 0);
    if (!cues.length) continue;
    const best = Math.max(...cues.map((c) => ratio(over(c, outer), outer)));
    if (best < 3)
      issues.push({
        el,
        kind: 'ui',
        ratio: best,
        required: 3,
        fg: over(cues[0], outer),
        bg: outer,
        owner: el.parentElement ? ownerOf(el.parentElement) : undefined,
      });
  }
  return issues;
}

// Correction minimale : le fond modifiable glisse vers le blanc ou le noir
// (teinte conservée) jusqu'au seuil, par pas de 1 %. Rendu opaque.
export function propose(issue: Issue): Rgba | undefined {
  const { fg, bg, required } = issue;
  if (!fg || !bg) return undefined;
  const ink = issue.kind === 'text' ? over(fg, bg) : fg;
  const lighten = luminance(ink) < luminance(bg);
  const target: Rgba = lighten ? [255, 255, 255, 1] : [0, 0, 0, 1];
  for (let t = 0.01; t <= 1.0001; t += 0.01) {
    const c: Rgba = [
      bg[0] + (target[0] - bg[0]) * t,
      bg[1] + (target[1] - bg[1]) * t,
      bg[2] + (target[2] - bg[2]) * t,
      1,
    ];
    const rounded = parse(hex(c));
    const shown = issue.kind === 'text' ? over(fg, rounded) : ink;
    if (ratio(shown, rounded) >= required + 0.01) return rounded;
  }
  return undefined;
}

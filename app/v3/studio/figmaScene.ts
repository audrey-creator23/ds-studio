import type { Tokens } from '../../shared/model.js';
import type {
  Scene,
  SceneLayout,
  SceneNode,
  ScenePaint,
} from '../../shared/figmaScene.js';
import {
  blockSpecs,
  type BlockKind,
  type Composition,
} from '../../shared/composition.js';
import { parse } from './contrast.js';

// Mesure le rendu réel de l'écran (iframe d'aperçu, même origine) et le
// traduit en scène Figma : flex → Auto Layout (direction, gap, padding,
// alignements, Hug/Fill/Fixed), grille → Auto Layout en retour à la ligne
// (une colonne → vertical), blocs sans flex → positions exactes. Texte,
// SVG, fonds, bordures, rayons, ombres et opacité repris tels qu'affichés.
// Ce qui ne se traduit pas exactement est listé dans `warnings`.

const skip =
  '.cmp-placeholder, .cmp-empty, .cmp-drop-line, [aria-hidden="true"]:not(svg)';
const px = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const round = (n: number) => Math.round(n * 100) / 100;
const paintOf = (css: string): ScenePaint | undefined => {
  const [r, g, b, a] = parse(css);
  return a > 0
    ? { r: r / 255, g: g / 255, b: b / 255, a: round(a) }
    : undefined;
};
const primary: Record<string, SceneLayout['primary']> = {
  center: 'CENTER',
  'flex-end': 'MAX',
  end: 'MAX',
  right: 'MAX',
  'space-between': 'SPACE_BETWEEN',
};
const counter: Record<string, SceneLayout['counter']> = {
  center: 'CENTER',
  'flex-end': 'MAX',
  end: 'MAX',
  baseline: 'BASELINE',
};
const familyOf = (css: string) =>
  css
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '');

function shadows(css: string) {
  if (css === 'none') return undefined;
  const out: NonNullable<SceneNode['shadows']> = [];
  // Chrome : « rgba(…) 0px 1px 2px 0px[, …] » ; les ombres internes sont ignorées.
  for (const part of css.split(/,(?![^(]*\))/)) {
    if (/inset/.test(part)) continue;
    const color = /(rgba?\([^)]*\)|#[0-9a-f]+|oklch\([^)]*\))/i.exec(part)?.[1];
    const nums = part
      .replace(color ?? '', '')
      .trim()
      .split(/\s+/)
      .map(px);
    const c = color ? paintOf(color) : undefined;
    if (!c) continue;
    out.push({
      x: nums[0] ?? 0,
      y: nums[1] ?? 0,
      blur: nums[2] ?? 0,
      spread: nums[3] ?? 0,
      color: c,
    });
  }
  return out.length ? out.slice(0, 4) : undefined;
}

export function buildScene(
  doc: Document,
  composition: Composition,
  meta: { device: string; scheme: 'light' | 'dark'; tokens?: Tokens },
): Scene {
  const win = doc.defaultView!;
  const page = doc.querySelector<HTMLElement>('.cmp-page');
  if (!page) throw new Error('Aperçu indisponible.');
  const warnings = new Set<string>();
  const labels = new Map<
    string,
    {
      kind: string;
      variant: string;
      size?: string;
      text?: string;
      label: string;
    }
  >();
  const walk = (items: Composition['sections'][number]['items']) => {
    for (const i of items) {
      const spec = blockSpecs[i.kind as BlockKind];
      labels.set(i.id, {
        kind: i.kind,
        variant: i.variant,
        size: i.size,
        text: i.text || undefined,
        label: i.label || `${spec?.label ?? i.kind} / ${i.variant}`,
      });
      if (i.children) walk(i.children as typeof items);
    }
  };
  for (const s of composition.sections) {
    labels.set(s.id, { kind: 'section', variant: s.layout, label: s.name });
    walk(s.items);
  }

  function textNode(
    chars: string,
    rect: DOMRect,
    cs: CSSStyleDeclaration,
    base: DOMRect,
    name: string,
  ): SceneNode {
    const size = px(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? null : px(cs.lineHeight);
    const color = paintOf(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 };
    const opacity = Number(cs.opacity);
    if (opacity < 1) color.a = round(color.a * opacity);
    const lines = lh
      ? Math.round(rect.height / lh)
      : rect.height > size * 1.6
        ? 2
        : 1;
    return {
      type: 'TEXT',
      name,
      x: round(rect.left - base.left),
      y: round(rect.top - base.top),
      w: round(rect.width),
      h: round(rect.height),
      sizing: { h: lines > 1 ? 'FIXED' : 'HUG', v: 'HUG' },
      text: {
        chars: (cs.textTransform === 'none' ? chars : chars)
          .replace(/\s+/g, ' ')
          .trim(),
        family: familyOf(cs.fontFamily),
        weight: Math.min(
          900,
          Math.max(100, Math.round(px(cs.fontWeight) / 100) * 100),
        ),
        italic: cs.fontStyle === 'italic',
        size: round(size),
        lineHeight: lh ? round(lh) : null,
        letterSpacing:
          cs.letterSpacing === 'normal' ? 0 : round(px(cs.letterSpacing)),
        color,
        align:
          cs.textAlign === 'center'
            ? 'CENTER'
            : cs.textAlign === 'right' || cs.textAlign === 'end'
              ? 'RIGHT'
              : cs.textAlign === 'justify'
                ? 'JUSTIFIED'
                : 'LEFT',
        upper: cs.textTransform === 'uppercase',
        underline: cs.textDecorationLine.includes('underline'),
        wrap: lines > 1,
      },
    };
  }

  function svgNode(el: SVGSVGElement, base: DOMRect): SceneNode {
    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true) as SVGSVGElement;
    const color = win.getComputedStyle(el).color;
    clone.setAttribute('width', String(round(r.width)));
    clone.setAttribute('height', String(round(r.height)));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const markup = clone.outerHTML.replace(/currentColor/g, color);
    return {
      type: 'SVG',
      name: el.getAttribute('aria-label') || 'icône',
      x: round(r.left - base.left),
      y: round(r.top - base.top),
      w: round(r.width),
      h: round(r.height),
      sizing: { h: 'FIXED', v: 'FIXED' },
      svg: markup.slice(0, 60000),
    };
  }

  function layoutOf(
    el: HTMLElement,
    cs: CSSStyleDeclaration,
    kids: Element[],
  ): SceneLayout | undefined {
    const pad: SceneLayout['padding'] = [
      px(cs.paddingTop) + px(cs.borderTopWidth),
      px(cs.paddingRight) + px(cs.borderRightWidth),
      px(cs.paddingBottom) + px(cs.borderBottomWidth),
      px(cs.paddingLeft) + px(cs.borderLeftWidth),
    ];
    const rowGap = cs.rowGap === 'normal' ? 0 : px(cs.rowGap);
    const colGap = cs.columnGap === 'normal' ? 0 : px(cs.columnGap);
    if (cs.display.includes('flex')) {
      const row = cs.flexDirection.startsWith('row');
      if (cs.flexDirection.endsWith('reverse'))
        warnings.add(
          'Ordre inversé (flex-direction reverse) : rendu dans l’ordre du DOM.',
        );
      return {
        mode: row ? 'HORIZONTAL' : 'VERTICAL',
        wrap: row && cs.flexWrap !== 'nowrap',
        gap: row ? colGap : rowGap,
        crossGap: row ? rowGap : colGap,
        padding: pad,
        primary: primary[cs.justifyContent] ?? 'MIN',
        counter: counter[cs.alignItems] ?? 'MIN',
      };
    }
    if (cs.display.includes('grid')) {
      const tracks = cs.gridTemplateColumns
        .split(/\s+(?![^(]*\))/)
        .filter(Boolean).length;
      return {
        mode: tracks > 1 ? 'HORIZONTAL' : 'VERTICAL',
        wrap: tracks > 1,
        gap: tracks > 1 ? colGap : rowGap,
        crossGap: tracks > 1 ? rowGap : 0,
        padding: pad,
        primary: 'MIN',
        counter: tracks > 1 ? 'MIN' : (counter[cs.justifyItems] ?? 'MIN'),
      };
    }
    // Bloc : pile verticale régulière → Auto Layout ; sinon positions exactes.
    const rects = kids.map((k) => k.getBoundingClientRect());
    if (!rects.length) return undefined;
    const gaps =
      rects.length > 1
        ? rects.slice(1).map((r, i) => r.top - rects[i].bottom)
        : [0];
    const lefts = new Set(rects.map((r) => Math.round(r.left)));
    if (
      lefts.size === 1 &&
      gaps.every((g) => g >= 0 && Math.abs(g - gaps[0]) < 0.6)
    ) {
      const box = el.getBoundingClientRect();
      return {
        mode: 'VERTICAL',
        wrap: false,
        gap: round(gaps[0]),
        crossGap: 0,
        padding: [
          round(rects[0].top - box.top),
          pad[1],
          round(Math.max(0, box.bottom - rects.at(-1)!.bottom)),
          round(rects[0].left - box.left),
        ],
        primary: 'MIN',
        counter: 'MIN',
      };
    }
    return undefined;
  }

  // Positions que produirait l'Auto Layout, comparées aux mesures réelles.
  function faithful(node: SceneNode) {
    const l = node.layout!;
    const kids = node.children ?? [];
    if (!kids.length || l.wrap) return true;
    const row = l.mode === 'HORIZONTAL';
    const [pt, pr, pb, pl] = l.padding;
    const start = row ? pl : pt;
    const inner = row ? node.w - pl - pr : node.h - pt - pb;
    const crossStart = row ? pt : pl;
    const crossInner = row ? node.h - pt - pb : node.w - pl - pr;
    const size = (k: SceneNode) => (row ? k.w : k.h);
    const cross = (k: SceneNode) => (row ? k.h : k.w);
    const total = kids.reduce((a, k) => a + size(k), 0);
    const free = inner - total - l.gap * (kids.length - 1);
    let gap = l.gap;
    let pos = start;
    if (l.primary === 'CENTER') pos += free / 2;
    if (l.primary === 'MAX') pos += free;
    if (l.primary === 'SPACE_BETWEEN' && kids.length > 1)
      gap += free / (kids.length - 1);
    for (const k of kids) {
      const along = row ? k.x : k.y;
      const across = row ? k.y : k.x;
      const expected =
        l.counter === 'CENTER'
          ? crossStart + (crossInner - cross(k)) / 2
          : l.counter === 'MAX'
            ? crossStart + crossInner - cross(k)
            : crossStart;
      if (Math.abs(along - pos) > 1.5) return false;
      if (l.counter !== 'BASELINE' && Math.abs(across - expected) > 1.5)
        return false;
      pos += size(k) + gap;
    }
    return true;
  }

  function frame(
    el: HTMLElement,
    base: DOMRect,
    parent?: { layout?: SceneLayout; cs: CSSStyleDeclaration },
  ): SceneNode | undefined {
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.matches(skip))
      return undefined;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return undefined;
    const id = el.getAttribute('data-id') ?? undefined;
    const info = id ? labels.get(id) : undefined;
    const tag = el.tagName.toLowerCase();
    const name =
      info?.label ??
      el.getAttribute('aria-label') ??
      `${tag}${el.classList[0] ? `.${el.classList[0]}` : ''}`;
    if (cs.backgroundImage !== 'none')
      warnings.add(`Fond en dégradé ou en image (${name}) : non repris.`);
    if (tag === 'img')
      warnings.add(`Image (${name}) : non reprise, cadre conservé.`);
    if (
      ['::before', '::after'].some((p) => {
        const c = win.getComputedStyle(el, p).content;
        return c && c !== 'none' && c !== 'normal' && c !== '""';
      })
    )
      warnings.add(
        `Contenu décoratif CSS (::before/::after) dans « ${name} » : non repris.`,
      );

    const kids = [...el.childNodes].filter(
      (n) =>
        (n.nodeType === 1 && !(n as Element).matches(skip)) ||
        (n.nodeType === 3 && n.textContent!.trim()),
    );
    const elementKids = kids.filter((n): n is Element => n.nodeType === 1);
    const layout = layoutOf(el, cs, elementKids);
    const node: SceneNode = {
      type: 'FRAME',
      name,
      x: round(rect.left - base.left),
      y: round(rect.top - base.top),
      w: round(rect.width),
      h: round(rect.height),
      sizing: { h: 'FIXED', v: layout ? 'HUG' : 'FIXED' },
      layout,
      fill: paintOf(cs.backgroundColor),
      opacity: Number(cs.opacity) < 1 ? round(Number(cs.opacity)) : undefined,
      clip: cs.overflow !== 'visible' ? true : undefined,
      shadows: shadows(cs.boxShadow),
      ds: info && id ? { id, ...info } : undefined,
    };
    const bw = px(cs.borderTopWidth);
    if (bw > 0 && cs.borderTopStyle !== 'none') {
      const c = paintOf(cs.borderTopColor);
      if (c) node.stroke = { color: c, weight: bw };
      if (
        ['Right', 'Bottom', 'Left'].some(
          (s) =>
            px(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) !== bw,
        )
      )
        warnings.add(
          `Bordures différentes selon les côtés (${name}) : épaisseur du haut appliquée partout.`,
        );
    }
    const radius: [number, number, number, number] = [
      px(cs.borderTopLeftRadius),
      px(cs.borderTopRightRadius),
      px(cs.borderBottomRightRadius),
      px(cs.borderBottomLeftRadius),
    ];
    if (radius.some(Boolean)) node.radius = radius;
    // Taille dans un parent Auto Layout : Fill si étiré ou flex-grow,
    // Hug pour les blocs « hug » de la composition, sinon Fixed mesuré.
    const pl = parent?.layout;
    if (pl) {
      const along = pl.mode === 'HORIZONTAL' ? 'h' : 'v';
      const across = along === 'h' ? 'v' : 'h';
      if (Number(cs.flexGrow) > 0) node.sizing[along] = 'FILL';
      const self =
        cs.alignSelf === 'auto' ? parent!.cs.alignItems : cs.alignSelf;
      if ((self === 'stretch' || self === 'normal') && !pl.wrap)
        node.sizing[across] = 'FILL';
      if (el.classList.contains('width-hug')) node.sizing.h = 'HUG';
      if (pl.wrap) node.sizing.h = 'FIXED';
    }

    // Enfants : texte seul → nœud texte ; sinon frames, textes et SVG.
    const onlyText = kids.length > 0 && kids.every((n) => n.nodeType === 3);
    const children: SceneNode[] = [];
    const type = (el as HTMLInputElement).type;
    const tick =
      el.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio');
    const inner =
      (el.tagName === 'INPUT' && !tick) || el.tagName === 'TEXTAREA';
    if (tick) {
      // Case à cocher / bouton radio : boîte + coche ou point vectoriels.
      node.layout = undefined;
      node.sizing.v = 'FIXED';
      node.stroke ??= {
        color: paintOf(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 },
        weight: 1,
      };
      if (type === 'radio')
        node.radius = [
          rect.width / 2,
          rect.width / 2,
          rect.width / 2,
          rect.width / 2,
        ];
      else node.radius ??= [3, 3, 3, 3];
      if ((el as HTMLInputElement).checked) {
        const ink = cs.accentColor === 'auto' ? cs.color : cs.accentColor;
        const w = round(rect.width);
        children.push({
          type: 'SVG',
          name: type === 'radio' ? 'point' : 'coche',
          x: 0,
          y: 0,
          w,
          h: round(rect.height),
          sizing: { h: 'FIXED', v: 'FIXED' },
          svg:
            type === 'radio'
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="${ink}"/></svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        });
      }
    } else if (inner) {
      const v =
        (el as HTMLInputElement).value || (el as HTMLInputElement).placeholder;
      if (v) {
        const ph = !(el as HTMLInputElement).value;
        const pcs = ph ? win.getComputedStyle(el, '::placeholder') : cs;
        const t = textNode(v, rect, pcs, rect, ph ? 'placeholder' : 'valeur');
        t.x = node.layout ? 0 : px(cs.paddingLeft) + bw;
        t.y = (rect.height - (t.text!.lineHeight ?? px(cs.fontSize) * 1.2)) / 2;
        t.sizing = { h: 'HUG', v: 'HUG' };
        children.push(t);
        node.layout = {
          mode: 'HORIZONTAL',
          wrap: false,
          gap: 0,
          crossGap: 0,
          padding: [
            px(cs.paddingTop) + bw,
            px(cs.paddingRight) + bw,
            px(cs.paddingBottom) + bw,
            px(cs.paddingLeft) + bw,
          ],
          primary: cs.textAlign === 'center' ? 'CENTER' : 'MIN',
          counter: 'CENTER',
        };
        node.sizing.v = 'FIXED';
      }
    } else if (onlyText) {
      const range = doc.createRange();
      range.selectNodeContents(el);
      const t = textNode(
        el.textContent ?? '',
        range.getBoundingClientRect(),
        cs,
        rect,
        'texte',
      );
      if (node.layout) t.sizing = { h: 'FILL', v: 'HUG' };
      children.push(t);
      if (
        !node.layout &&
        !node.fill &&
        !node.stroke &&
        !node.radius &&
        !node.shadows &&
        !node.ds
      ) {
        // Simple porteur de texte : le texte remplace la frame.
        return {
          ...t,
          name: name.startsWith(tag) ? 'texte' : name,
          x: node.x + t.x,
          y: node.y + t.y,
          sizing: pl
            ? {
                ...t.sizing,
                ...(node.sizing.h === 'FILL' ? { h: 'FILL' } : {}),
              }
            : t.sizing,
        };
      }
      if (!node.layout) {
        node.layout = {
          mode: 'HORIZONTAL',
          wrap: false,
          gap: 0,
          crossGap: 0,
          padding: [
            round(t.y),
            round(rect.right - (rect.left + t.x + t.w)),
            round(rect.height - t.y - t.h),
            round(t.x),
          ],
          primary:
            t.text!.align === 'CENTER'
              ? 'CENTER'
              : t.text!.align === 'RIGHT'
                ? 'MAX'
                : 'MIN',
          counter: 'CENTER',
        };
        node.sizing.v = 'HUG';
      }
    } else {
      for (const n of kids) {
        if (n.nodeType === 3) {
          const range = doc.createRange();
          range.selectNodeContents(n);
          children.push(
            textNode(
              n.textContent!,
              range.getBoundingClientRect(),
              cs,
              rect,
              'texte',
            ),
          );
        } else if (n instanceof win.SVGSVGElement)
          children.push(svgNode(n, rect));
        else if (n instanceof win.HTMLElement) {
          const c = frame(n, rect, { layout: node.layout, cs });
          if (c) children.push(c);
        }
      }
    }
    if (children.length) node.children = children;
    if (node.layout && !faithful(node)) {
      // Auto Layout qui déplacerait un enfant de plus de 1,5 px (marges,
      // positions relatives…) : positions exactes conservées à la place.
      node.layout = undefined;
      node.sizing.v = 'FIXED';
    }
    return node;
  }

  const root = frame(page, page.getBoundingClientRect())!;
  root.name = composition.name;
  root.x = 0;
  root.y = 0;
  root.sizing = { h: 'FIXED', v: 'HUG' };
  // Tokens du DS : couleurs → variables COLOR, dimensions → FLOAT.
  const tokens: Scene['tokens'] = [];
  for (const [name, t] of Object.entries(meta.tokens ?? {})) {
    if (t.$type === 'color') {
      const p = paintOf(t.$value as string);
      if (p)
        tokens.push({ name: name.replace('.', '/'), type: 'COLOR', value: p });
    } else if (t.$type === 'dimension')
      tokens.push({
        name: name.replace('.', '/'),
        type: 'FLOAT',
        value: t.$value as number,
      });
  }
  return {
    version: 1,
    screenId: composition.id,
    name: composition.name,
    device: meta.device,
    scheme: meta.scheme,
    createdAt: new Date().toISOString(),
    root,
    tokens,
    warnings: [...warnings].slice(0, 100),
  };
}

// DS-Studio Bridge : construit une scène DS-Studio dans la page Figma
// ouverte. Calques nommés et éditables (jamais d'image aplatie), Auto
// Layout natif imbriqué, instances liées aux composants maîtres présents
// dans le fichier quand ils existent, variables pour les tokens. Ce qui ne
// se traduit pas exactement est signalé, jamais approché en silence.
import {
  sceneSchema,
  type Scene,
  type SceneNode,
  type ScenePaint,
} from '../app/shared/figmaScene.js';
import { figmaTarget } from '../app/shared/figmaTarget.js';
import mapping from './mapping.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Figma = any;
type FNode = any;

export type Report = {
  needsConfirm?: { name: string };
  frames: number;
  texts: number;
  vectors: number;
  instances: number;
  variables: number;
  warnings: string[];
};

const interStyles: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};
const system = [
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  'ui-sans-serif',
  'sans-serif',
];
export function fontCandidates(
  family: string,
  weight: number,
  italic: boolean,
) {
  const base =
    /^inter( variable)?$/i.test(family) || family === 'InterVariable'
      ? 'Inter'
      : family;
  const families = system.includes(base)
    ? ['SF Pro Text', 'SF Pro', 'Inter']
    : [base, 'Inter'];
  const style = interStyles[weight] ?? 'Regular';
  const styles = italic
    ? [style === 'Regular' ? 'Italic' : `${style} Italic`, style]
    : [style, style.replace(' ', ''), 'Regular'];
  return families.flatMap((f) => styles.map((s) => ({ family: f, style: s })));
}
const solid = (p: ScenePaint) => ({
  type: 'SOLID',
  color: { r: p.r, g: p.g, b: p.b },
  opacity: p.a,
});
const key = (p: ScenePaint) =>
  [p.r, p.g, p.b].map((v) => Math.round(v * 255)).join(',') +
  `,${Math.round(p.a * 100)}`;

// Fichier ouvert = fichier cible ? (fileKey si Figma le fournit, sinon nom.)
export function isTargetFile(figma: Figma) {
  return figma.fileKey
    ? figma.fileKey === figmaTarget.fileKey
    : figma.root?.name === figmaTarget.fileName;
}

export async function importScene(
  figma: Figma,
  input: Scene,
  opts: { replace?: boolean } = {},
): Promise<Report> {
  // Validation préalable : une scène invalide n'entame jamais le fichier.
  const scene = sceneSchema.parse(input);
  // Page cible du fichier DS-Studio (si présente), sinon page courante.
  const target = await figma.getNodeByIdAsync?.(figmaTarget.pageId);
  if (target?.type === 'PAGE' && figma.currentPage !== target)
    await figma.setCurrentPageAsync(target);
  const report: Report = {
    frames: 0,
    texts: 0,
    vectors: 0,
    instances: 0,
    variables: 0,
    warnings: [...scene.warnings],
  };
  const warn = (w: string) =>
    !report.warnings.includes(w) && report.warnings.push(w);
  const page = figma.currentPage;
  const existing = page.findOne(
    (n: FNode) => n.getPluginData?.('dsScreen') === scene.screenId,
  );
  if (existing && !opts.replace)
    return { ...report, needsConfirm: { name: existing.name } };

  // Polices : chargées avant toute création de texte ; remplacements signalés.
  const fonts = new Map<string, { family: string; style: string }>();
  const texts: SceneNode[] = [];
  const collect = (n: SceneNode) => {
    if (n.text) texts.push(n);
    n.children?.forEach(collect);
  };
  collect(scene.root);
  for (const n of texts) {
    const t = n.text!;
    const id = `${t.family}|${t.weight}|${t.italic}`;
    if (fonts.has(id)) continue;
    let chosen: { family: string; style: string } | undefined;
    for (const c of fontCandidates(t.family, t.weight, t.italic)) {
      try {
        await figma.loadFontAsync(c);
        chosen = c;
        break;
      } catch {
        /* Candidate suivante. */
      }
    }
    chosen ??= { family: 'Inter', style: 'Regular' };
    if (
      chosen.family !== t.family.replace(/ Variable$/, '') ||
      chosen.style !== (interStyles[t.weight] ?? 'Regular')
    )
      warn(
        `Police « ${t.family} ${t.weight}${t.italic ? ' italique' : ''} » indisponible dans Figma : ${chosen.family} ${chosen.style} utilisée.`,
      );
    fonts.set(id, chosen);
  }

  // Tokens → variables (collection « DS-Studio »), mises à jour sans doublon.
  const colorVars = new Map<string, FNode>();
  if (figma.variables && scene.tokens.length) {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const collection =
      collections.find((c: FNode) => c.name === 'DS-Studio') ??
      figma.variables.createVariableCollection('DS-Studio');
    const mode = collection.modes[0].modeId;
    const locals = await figma.variables.getLocalVariablesAsync();
    for (const t of scene.tokens) {
      const type = t.type === 'COLOR' ? 'COLOR' : 'FLOAT';
      let v = locals.find(
        (x: FNode) =>
          x.name === t.name && x.variableCollectionId === collection.id,
      );
      v ??= figma.variables.createVariable(t.name, collection, type);
      v.setValueForMode(mode, t.value);
      report.variables++;
      if (t.type === 'COLOR') colorVars.set(key(t.value as ScenePaint), v);
    }
  }
  const fillOf = (p: ScenePaint) => {
    const paint = solid(p);
    const v = colorVars.get(key(p));
    return v && figma.variables
      ? figma.variables.setBoundVariableForPaint(paint, 'color', v)
      : paint;
  };

  // Composants maîtres du fichier, reconnus par nom (mapping.json).
  if (figma.loadAllPagesAsync) await figma.loadAllPagesAsync();
  const masters = new Map<string, FNode>();
  for (const c of figma.root.findAllWithCriteria({
    types: ['COMPONENT_SET', 'COMPONENT'],
  })) {
    if (c.type === 'COMPONENT' && c.parent?.type === 'COMPONENT_SET') continue;
    masters.set(String(c.name).toLowerCase(), c);
  }
  const masterFor = (kind: string) => {
    for (const name of (mapping as Record<string, string[]>)[kind] ?? [])
      if (masters.has(name.toLowerCase()))
        return masters.get(name.toLowerCase());
    return undefined;
  };

  async function instance(node: SceneNode, master: FNode) {
    let comp = master;
    if (master.type === 'COMPONENT_SET') {
      const want = {
        variant: node.ds!.variant.toLowerCase(),
        size: node.ds!.size?.toLowerCase(),
      };
      comp =
        master.children.find((c: FNode) => {
          const props = Object.entries(c.variantProperties ?? {}).map(
            ([k, v]) => [k.toLowerCase(), String(v).toLowerCase()],
          );
          const has = (k: string, v?: string) =>
            !v ||
            !props.some(([pk]) => pk === k) ||
            props.some(([pk, pv]) => pk === k && pv === v);
          return (
            has('variant', want.variant) &&
            has('size', want.size) &&
            props.some(([, pv]) => pv === want.variant)
          );
        }) ?? master.defaultVariant;
      if (
        !comp.variantProperties ||
        !Object.values(comp.variantProperties).some(
          (v) => String(v).toLowerCase() === want.variant,
        )
      )
        warn(
          `Variante « ${node.ds!.variant} » absente du composant « ${master.name} » : variante par défaut utilisée.`,
        );
    }
    const inst = comp.createInstance();
    inst.name = node.name;
    inst.setPluginData('ds', JSON.stringify(node.ds));
    if (node.ds!.text) {
      const label = inst.findOne((n: FNode) => n.type === 'TEXT');
      if (label) {
        await figma.loadFontAsync(label.fontName);
        label.characters = node.ds!.text;
      }
    }
    if (Math.abs(inst.width - node.w) > 1 || Math.abs(inst.height - node.h) > 1)
      warn(
        `Instance « ${node.name} » : taille du maître (${Math.round(inst.width)}×${Math.round(inst.height)}) ≠ rendu DS-Studio (${Math.round(node.w)}×${Math.round(node.h)}).`,
      );
    report.instances++;
    return inst;
  }

  // Chemin du calque en cours, pour nommer le nœud fautif en cas d'erreur.
  const path: string[] = [];
  async function build(
    node: SceneNode,
    parent: FNode,
    autoParent: boolean,
  ): Promise<FNode> {
    path.push(node.name);
    let out: FNode;
    const master = node.ds ? masterFor(node.ds.kind) : undefined;
    if (master) out = await instance(node, master);
    else if (node.type === 'SVG') {
      out = figma.createNodeFromSvg(node.svg);
      out.name = node.name;
      out.resize(Math.max(node.w, 0.01), Math.max(node.h, 0.01));
      report.vectors++;
    } else if (node.type === 'TEXT') {
      const t = node.text!;
      out = figma.createText();
      out.name = node.name;
      out.fontName = fonts.get(`${t.family}|${t.weight}|${t.italic}`);
      out.characters = t.chars;
      out.fontSize = t.size;
      out.lineHeight = t.lineHeight
        ? { unit: 'PIXELS', value: t.lineHeight }
        : { unit: 'AUTO' };
      out.letterSpacing = { unit: 'PIXELS', value: t.letterSpacing };
      out.fills = [fillOf(t.color)];
      out.textAlignHorizontal = t.align;
      if (t.upper) out.textCase = 'UPPER';
      if (t.underline) out.textDecoration = 'UNDERLINE';
      if (t.wrap) {
        out.textAutoResize = 'HEIGHT';
        out.resize(Math.max(node.w, 1), Math.max(node.h, 1));
      } else out.textAutoResize = 'WIDTH_AND_HEIGHT';
      report.texts++;
    } else {
      out = figma.createFrame();
      out.name = node.name;
      out.fills = node.fill ? [fillOf(node.fill)] : [];
      out.clipsContent = !!node.clip;
      if (node.stroke) {
        out.strokes = [fillOf(node.stroke.color)];
        out.strokeWeight = node.stroke.weight;
        out.strokeAlign = 'INSIDE';
      }
      if (node.radius) {
        [
          out.topLeftRadius,
          out.topRightRadius,
          out.bottomRightRadius,
          out.bottomLeftRadius,
        ] = node.radius;
      }
      if (node.shadows)
        out.effects = node.shadows.map((s) => ({
          type: 'DROP_SHADOW',
          color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a },
          offset: { x: s.x, y: s.y },
          radius: s.blur,
          spread: s.spread,
          visible: true,
          blendMode: 'NORMAL',
        }));
      out.resize(Math.max(node.w, 0.01), Math.max(node.h, 0.01));
      const l = node.layout;
      if (l) {
        out.layoutMode = l.mode;
        if (l.mode === 'HORIZONTAL')
          out.layoutWrap = l.wrap ? 'WRAP' : 'NO_WRAP';
        out.itemSpacing = l.gap;
        if (l.wrap) out.counterAxisSpacing = l.crossGap;
        [out.paddingTop, out.paddingRight, out.paddingBottom, out.paddingLeft] =
          l.padding;
        out.primaryAxisAlignItems = l.primary;
        out.counterAxisAlignItems =
          l.counter === 'BASELINE' && l.mode === 'VERTICAL' ? 'MIN' : l.counter;
      }
      if (node.ds) out.setPluginData('ds', JSON.stringify(node.ds));
      report.frames++;
    }
    if (node.opacity !== undefined) out.opacity = node.opacity;
    parent.appendChild(out);
    if (!autoParent) {
      out.x = node.x;
      out.y = node.y;
    }
    if (node.type === 'FRAME' && !master)
      for (const c of node.children ?? []) await build(c, out, !!node.layout);
    path.pop();
    // Hug / Fill / Fixed : l'API ne l'admet que pour un enfant d'Auto Layout
    // ou une frame Auto Layout elle-même (Fill seulement dans un parent AL).
    const ownLayout = node.type === 'FRAME' && !!node.layout && !master;
    if (autoParent || ownLayout) {
      const canHug = node.type === 'TEXT' || ownLayout;
      const sizing = (v: 'FIXED' | 'HUG' | 'FILL') =>
        v === 'FILL' && !autoParent
          ? 'FIXED'
          : v === 'HUG' && !canHug
            ? 'FIXED'
            : v;
      out.layoutSizingHorizontal = sizing(node.sizing.h);
      out.layoutSizingVertical = sizing(node.sizing.v);
    }
    return out;
  }

  // Tout ou rien : en cas d'erreur, le cadre partiel est retiré.
  let root: FNode;
  const created = new Set(page.children);
  try {
    root = await build(
      { ...scene.root, name: `DS-Studio · ${scene.name}` },
      page,
      false,
    );
  } catch (e) {
    for (const n of [...page.children]) if (!created.has(n)) n.remove();
    throw new Error(
      `Import annulé, rien n’a été ajouté. Calque « ${path.join(' › ')} » : ${(e as Error).message}`,
    );
  }
  root.setPluginData('dsScreen', scene.screenId);
  if (existing) {
    root.x = existing.x;
    root.y = existing.y;
    existing.remove();
  } else {
    const right = page.children
      .filter((n: FNode) => n !== root)
      .reduce((m: number, n: FNode) => Math.max(m, n.x + n.width), 0);
    root.x = right ? right + 120 : 0;
    root.y = 0;
  }
  if (
    Math.abs(root.width - scene.root.w) > 1 ||
    Math.abs(root.height - scene.root.h) > 1
  )
    warn(
      `Taille finale ${Math.round(root.width)}×${Math.round(root.height)} ≠ rendu DS-Studio ${Math.round(scene.root.w)}×${Math.round(scene.root.h)} : vérifiez les calques signalés.`,
    );
  page.selection = [root];
  figma.viewport?.scrollAndZoomIntoView?.([root]);
  return report;
}

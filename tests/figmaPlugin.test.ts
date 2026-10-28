import assert from 'node:assert/strict';
import test from 'node:test';
import { fontCandidates, importScene } from '../figma-plugin/importer.js';
import {
  sceneSchema,
  type Scene,
  type SceneNode,
} from '../app/shared/figmaScene.js';

// Maquette minimale de l'API Plugin Figma : enregistre les nœuds créés et
// leurs propriétés, applique les règles qui comptent (Hug/Fill seulement
// dans un parent Auto Layout, polices à charger avant le texte).
/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeFigma(opts: { fonts?: string[]; masters?: any[] } = {}) {
  const loaded = new Set<string>();
  const available = new Set(
    opts.fonts ?? ['Inter|Regular', 'Inter|Semi Bold', 'Inter|Bold'],
  );
  const node = (type: string): any => {
    const n: any = {
      type,
      children: [],
      data: {} as Record<string, string>,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      parent: undefined,
      resize(w: number, h: number) {
        n.width = w;
        n.height = h;
      },
      appendChild(c: any) {
        c.parent = n;
        n.children.push(c);
      },
      setPluginData(k: string, v: string) {
        n.data[k] = v;
      },
      getPluginData(k: string) {
        return n.data[k] ?? '';
      },
      remove() {
        n.parent.children.splice(n.parent.children.indexOf(n), 1);
      },
      findOne(f: (x: any) => boolean): any {
        for (const c of n.children) {
          if (f(c)) return c;
          const d = c.findOne?.(f);
          if (d) return d;
        }
      },
    };
    return new Proxy(n, {
      set(t, k, v) {
        // Règle réelle de l'API : enfant d'Auto Layout ou frame AL elle-même.
        if (k === 'layoutSizingHorizontal' || k === 'layoutSizingVertical') {
          const al = (x: any) =>
            x?.layoutMode === 'HORIZONTAL' || x?.layoutMode === 'VERTICAL';
          if (!al(t.parent) && !al(t))
            throw new Error(
              `set_${String(k)}: node must be an auto-layout frame or a child of an auto-layout frame`,
            );
          if (v === 'FILL' && !al(t.parent))
            throw new Error('FILL hors Auto Layout');
        }
        if (
          k === 'characters' &&
          !loaded.has(`${t.fontName?.family}|${t.fontName?.style}`)
        )
          throw new Error('police non chargée');
        t[k as string] = v;
        return true;
      },
    });
  };
  const page = node('PAGE');
  page.selection = [];
  const vars: any[] = [];
  const collections: any[] = [];
  return {
    page,
    vars,
    currentPage: page,
    root: {
      findAllWithCriteria: () => opts.masters ?? [],
    },
    loadAllPagesAsync: async () => undefined,
    loadFontAsync: async (f: { family: string; style: string }) => {
      if (!available.has(`${f.family}|${f.style}`)) throw new Error('absente');
      loaded.add(`${f.family}|${f.style}`);
    },
    createFrame: () => node('FRAME'),
    createText: () => node('TEXT'),
    createNodeFromSvg: (svg: string) => Object.assign(node('FRAME'), { svg }),
    viewport: { scrollAndZoomIntoView() {} },
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => vars,
      createVariableCollection(name: string) {
        const c = {
          id: `c${collections.length}`,
          name,
          modes: [{ modeId: 'm' }],
        };
        collections.push(c);
        return c;
      },
      createVariable(name: string, c: any, type: string) {
        const v: any = { name, type, variableCollectionId: c.id, values: {} };
        v.setValueForMode = (m: string, val: unknown) => (v.values[m] = val);
        vars.push(v);
        return v;
      },
      setBoundVariableForPaint: (p: any, _f: string, v: any) => ({
        ...p,
        bound: v.name,
      }),
    },
  };
}

const ink = { r: 0.04, g: 0.04, b: 0.04, a: 1 };
const brand = { r: 0.2, g: 0.4, b: 0.8, a: 1 };
const text = (
  chars: string,
  weight = 400,
  family = 'Inter Variable',
): SceneNode => ({
  type: 'TEXT',
  name: 'texte',
  x: 0,
  y: 0,
  w: 80,
  h: 20,
  sizing: { h: 'HUG', v: 'HUG' },
  text: {
    chars,
    family,
    weight,
    italic: false,
    size: 14,
    lineHeight: 20,
    letterSpacing: 0,
    color: ink,
    align: 'LEFT',
    upper: false,
    underline: false,
    wrap: false,
  },
});
const scene: Scene = sceneSchema.parse({
  version: 1,
  screenId: 'page-abc',
  name: 'Accueil',
  device: 'mobile',
  scheme: 'light',
  createdAt: new Date().toISOString(),
  tokens: [
    { name: 'color/brand', type: 'COLOR', value: brand },
    { name: 'space/md', type: 'FLOAT', value: 16 },
  ],
  warnings: [],
  root: {
    type: 'FRAME',
    name: 'Accueil',
    x: 0,
    y: 0,
    w: 393,
    h: 300,
    sizing: { h: 'FIXED', v: 'HUG' },
    layout: {
      mode: 'VERTICAL',
      wrap: false,
      gap: 24,
      crossGap: 0,
      padding: [24, 24, 24, 24],
      primary: 'MIN',
      counter: 'MIN',
    },
    fill: { r: 1, g: 1, b: 1, a: 1 },
    children: [
      {
        type: 'FRAME',
        name: 'Actions',
        x: 24,
        y: 24,
        w: 345,
        h: 40,
        sizing: { h: 'FILL', v: 'HUG' },
        layout: {
          mode: 'HORIZONTAL',
          wrap: true,
          gap: 8,
          crossGap: 8,
          padding: [0, 0, 0, 0],
          primary: 'SPACE_BETWEEN',
          counter: 'CENTER',
        },
        children: [
          {
            type: 'FRAME',
            name: 'Bouton / primary',
            x: 0,
            y: 0,
            w: 120,
            h: 40,
            sizing: { h: 'HUG', v: 'HUG' },
            fill: brand,
            radius: [8, 8, 8, 8],
            stroke: { color: ink, weight: 1 },
            ds: {
              id: 'b1',
              kind: 'button',
              variant: 'primary',
              size: 'md',
              text: 'Réserver',
              label: 'Bouton / primary',
            },
            layout: {
              mode: 'HORIZONTAL',
              wrap: false,
              gap: 0,
              crossGap: 0,
              padding: [10, 16, 10, 16],
              primary: 'CENTER',
              counter: 'CENTER',
            },
            children: [text('Réserver', 600)],
          },
          {
            type: 'SVG',
            name: 'icône',
            x: 200,
            y: 8,
            w: 24,
            h: 24,
            sizing: { h: 'FIXED', v: 'FIXED' },
            svg: '<svg width="24" height="24"></svg>',
          },
        ],
      },
      {
        type: 'FRAME',
        name: 'div.card',
        x: 24,
        y: 88,
        w: 345,
        h: 100,
        sizing: { h: 'FILL', v: 'FIXED' },
        children: [{ ...text('Libre', 400, 'Georgia'), x: 12, y: 30 }],
      },
    ],
  },
});

test('scène → calques : Auto Layout, tailles, textes, icônes, tokens', async () => {
  const figma = fakeFigma();
  const r = await importScene(figma, scene);
  assert.equal(r.needsConfirm, undefined);
  const root = figma.page.children[0];
  assert.equal(root.name, 'DS-Studio · Accueil');
  assert.equal(root.getPluginData('dsScreen'), 'page-abc');
  assert.equal(root.layoutMode, 'VERTICAL');
  assert.equal(root.itemSpacing, 24);
  assert.equal(root.paddingLeft, 24);
  assert.equal(root.layoutSizingVertical, 'HUG');
  const actions = root.children[0];
  assert.equal(actions.layoutWrap, 'WRAP');
  assert.equal(actions.counterAxisSpacing, 8);
  assert.equal(actions.primaryAxisAlignItems, 'SPACE_BETWEEN');
  assert.equal(actions.layoutSizingHorizontal, 'FILL');
  const button = actions.children[0];
  assert.equal(button.name, 'Bouton / primary');
  assert.equal(button.topLeftRadius, 8);
  assert.equal(button.strokeWeight, 1);
  assert.equal(button.fills[0].bound, 'color/brand'); // lié à la variable
  assert.equal(JSON.parse(button.getPluginData('ds')).variant, 'primary');
  assert.deepEqual(button.children[0].fontName, {
    family: 'Inter',
    style: 'Semi Bold',
  });
  assert.equal(actions.children[1].svg, '<svg width="24" height="24"></svg>');
  // Bloc sans flex : position exacte, pas d'Auto Layout ni de Hug.
  const card = root.children[1];
  assert.equal(card.layoutMode, undefined);
  assert.equal(card.children[0].x, 12);
  assert.equal(card.children[0].y, 30);
  assert.equal(r.variables, 2);
  assert.equal(figma.vars.find((v) => v.name === 'space/md').values.m, 16);
  // Police absente : remplacement signalé, pas silencieux.
  assert.ok(r.warnings.some((w) => w.includes('Georgia')));
});

test('réimport : confirmation, remplacement sans doublon, variables réutilisées', async () => {
  const figma = fakeFigma();
  await importScene(figma, scene);
  figma.page.children[0].x = 500;
  const ask = await importScene(figma, scene);
  assert.deepEqual(ask.needsConfirm, { name: 'DS-Studio · Accueil' });
  assert.equal(figma.page.children.length, 1);
  await importScene(figma, scene, { replace: true });
  assert.equal(figma.page.children.length, 1);
  assert.equal(figma.page.children[0].x, 500);
  assert.equal(figma.vars.length, 2);
});

test('maître du fichier : instance liée, variante choisie, texte repris', async () => {
  const variant = (v: string) => ({
    type: 'COMPONENT',
    name: `Variant=${v}`,
    variantProperties: { Variant: v },
    parent: { type: 'COMPONENT_SET' },
    createInstance() {
      const label: any = {
        type: 'TEXT',
        fontName: { family: 'Inter', style: 'Regular' },
      };
      return {
        name: '',
        width: 120,
        height: 40,
        data: {} as Record<string, string>,
        variant: v,
        label,
        setPluginData(k: string, val: string) {
          this.data[k] = val;
        },
        findOne: () => label,
        appendChild() {},
      };
    },
  });
  const set = {
    type: 'COMPONENT_SET',
    name: 'Button',
    children: [variant('secondary'), variant('primary')],
  };
  (set as any).defaultVariant = set.children[0];
  const figma = fakeFigma({ masters: [set] });
  const r = await importScene(figma, scene);
  const button = figma.page.children[0].children[0].children[0];
  assert.equal(button.variant, 'primary');
  assert.equal(button.label.characters, 'Réserver');
  assert.equal(r.instances, 1);
});

test('polices : Inter Variable → Inter, système → SF Pro puis Inter', () => {
  assert.deepEqual(fontCandidates('Inter Variable', 600, false)[0], {
    family: 'Inter',
    style: 'Semi Bold',
  });
  assert.equal(
    fontCandidates('system-ui', 400, false)[0].family,
    'SF Pro Text',
  );
  assert.equal(fontCandidates('Inter', 700, true)[0].style, 'Bold Italic');
});

test('parent sans Auto Layout : aucune taille AL imposée, enfants AL corrects', async () => {
  const figma = fakeFigma();
  const nested = sceneSchema.parse({
    ...scene,
    screenId: 'page-nested',
    root: {
      ...scene.root,
      children: [
        {
          type: 'FRAME',
          name: 'Bloc',
          x: 24,
          y: 24,
          w: 345,
          h: 80,
          sizing: { h: 'FILL', v: 'FIXED' },
          children: [
            {
              ...scene.root.children![0],
              name: 'Corps AL',
              sizing: { h: 'FILL', v: 'HUG' },
            },
            {
              type: 'TEXT',
              name: 'texte',
              x: 0,
              y: 60,
              w: 100,
              h: 20,
              sizing: { h: 'HUG', v: 'HUG' },
              text: scene.root.children![0].children![0].children![0].text,
            },
          ],
        },
      ],
    },
  });
  const r = await importScene(figma, nested);
  const bloc = figma.page.children[0].children[0];
  assert.equal(bloc.layoutSizingHorizontal, 'FILL');
  assert.equal(bloc.children[0].layoutSizingHorizontal, 'FIXED');
  assert.equal(bloc.children[0].layoutSizingVertical, 'HUG');
  assert.equal(bloc.children[1].layoutSizingHorizontal, undefined);
  assert.equal(bloc.children[1].y, 60);
  assert.ok(r.frames > 3);
});

test('erreur en cours d’import : rien ne reste, calque fautif nommé', async () => {
  const figma = fakeFigma();
  figma.createNodeFromSvg = () => {
    throw new Error('SVG invalide');
  };
  await assert.rejects(
    importScene(figma, scene),
    /Import annulé[\s\S]*icône[\s\S]*SVG invalide/,
  );
  assert.equal(figma.page.children.length, 0);
});

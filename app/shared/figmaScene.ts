import { z } from 'zod';

// Scène Figma : rendu réel d'un écran DS-Studio mesuré dans l'aperçu,
// transmis au plugin DS-Studio Bridge. Valeurs en pixels CSS = pixels
// Figma. Auto Layout pour les conteneurs flex et grille ; positions
// exactes pour les blocs sans flex. Jamais d'image aplatie.
const paint = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1),
});
export type ScenePaint = z.infer<typeof paint>;
const sizing = z.enum(['FIXED', 'HUG', 'FILL']);
const text = z.object({
  chars: z.string().max(5000),
  family: z.string().max(80),
  weight: z.number().int().min(100).max(900),
  italic: z.boolean(),
  size: z.number().positive().max(400),
  lineHeight: z.number().positive().max(800).nullable(),
  letterSpacing: z.number().min(-50).max(50),
  color: paint,
  align: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']),
  upper: z.boolean(),
  underline: z.boolean(),
  wrap: z.boolean(),
});
export type SceneText = z.infer<typeof text>;
const layout = z.object({
  mode: z.enum(['HORIZONTAL', 'VERTICAL']),
  wrap: z.boolean(),
  gap: z.number().min(0).max(2000),
  crossGap: z.number().min(0).max(2000),
  padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  primary: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']),
  counter: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']),
});
export type SceneLayout = z.infer<typeof layout>;
const ds = z.object({
  id: z.string().max(40),
  kind: z.string().max(40),
  variant: z.string().max(40),
  size: z.string().max(10).optional(),
  text: z.string().max(200).optional(),
  label: z.string().max(60),
});
export type SceneNode = {
  type: 'FRAME' | 'TEXT' | 'SVG';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sizing: { h: z.infer<typeof sizing>; v: z.infer<typeof sizing> };
  layout?: SceneLayout;
  fill?: ScenePaint;
  stroke?: { color: ScenePaint; weight: number };
  radius?: [number, number, number, number];
  shadows?: {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: ScenePaint;
  }[];
  opacity?: number;
  clip?: boolean;
  text?: SceneText;
  svg?: string;
  ds?: z.infer<typeof ds>;
  children?: SceneNode[];
};
export const sceneNodeSchema: z.ZodType<SceneNode> = z.lazy(() =>
  z.object({
    type: z.enum(['FRAME', 'TEXT', 'SVG']),
    name: z.string().max(120),
    x: z.number(),
    y: z.number(),
    w: z.number().min(0).max(20000),
    h: z.number().min(0).max(50000),
    sizing: z.object({ h: sizing, v: sizing }),
    layout: layout.optional(),
    fill: paint.optional(),
    stroke: z
      .object({ color: paint, weight: z.number().min(0).max(50) })
      .optional(),
    radius: z
      .tuple([z.number(), z.number(), z.number(), z.number()])
      .optional(),
    shadows: z
      .array(
        z.object({
          x: z.number(),
          y: z.number(),
          blur: z.number().min(0),
          spread: z.number(),
          color: paint,
        }),
      )
      .max(4)
      .optional(),
    opacity: z.number().min(0).max(1).optional(),
    clip: z.boolean().optional(),
    text: text.optional(),
    svg: z.string().max(60000).optional(),
    ds: ds.optional(),
    children: z.array(sceneNodeSchema).max(400).optional(),
  }),
);
export const sceneSchema = z.object({
  version: z.literal(1),
  screenId: z.string().max(40),
  name: z.string().max(60),
  device: z.string().max(20),
  scheme: z.enum(['light', 'dark']),
  createdAt: z.string().datetime(),
  root: sceneNodeSchema,
  tokens: z
    .array(
      z.object({
        name: z.string().max(60),
        type: z.enum(['COLOR', 'FLOAT']),
        value: z.union([paint, z.number()]),
      }),
    )
    .max(200),
  warnings: z.array(z.string().max(200)).max(100),
});
export type Scene = z.infer<typeof sceneSchema>;

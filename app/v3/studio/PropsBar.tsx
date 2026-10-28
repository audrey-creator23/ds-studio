import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowUp,
  Columns3,
  Copy,
  Grid2x2,
  MoveHorizontal,
  Palette,
  Rows3,
  Scaling,
  Space,
  Square,
  SquareDashed,
  Trash2,
  Group,
  Ungroup,
  Type,
  type LucideProps,
} from 'lucide-react';
import {
  aligns,
  blockSpecs,
  gaps,
  justifies,
  layoutLabels,
  layouts,
  sizes,
  spaces,
  widths,
  type Box,
  type Composition,
  type Item,
  type Section,
} from '../../shared/composition.js';
import type { CompositionState } from '../../client/design/useComposition.js';

// Alignement propre des blocs sélectionnés dans leur conteneur parent.
// Re-cliquer l'option active la retire. Dans une pile verticale, la hauteur
// d'un bloc est celle de son contenu : l'alignement vertical y est inactif.
const alignOptions = [
  ['alignX', 'start', 'Aligner à gauche', AlignStartVertical],
  ['alignX', 'center', 'Centrer horizontalement', AlignCenterVertical],
  ['alignX', 'end', 'Aligner à droite', AlignEndVertical],
  ['alignY', 'start', 'Aligner en haut', AlignStartHorizontal],
  ['alignY', 'center', 'Centrer verticalement', AlignCenterHorizontal],
  ['alignY', 'end', 'Aligner en bas', AlignEndHorizontal],
] as const;
function parentLayout(c: Composition, id: string) {
  for (const s of c.sections)
    for (const i of s.items) {
      if (i.id === id) return { item: i, layout: s.layout };
      const child = i.children?.find((x) => x.id === id);
      if (child) return { item: child as Item, layout: i.variant };
    }
}
function AlignTools({ c, ids }: { c: CompositionState; ids: string[] }) {
  const found = ids.flatMap((id) => parentLayout(c.draft, id) ?? []);
  if (!found.length) return null;
  const stacked = found.every((f) => f.layout === 'stack');
  return (
    <div className="props-align" role="group" aria-label="Alignement">
      {alignOptions.map(([key, value, label, Icon]) => {
        const active = found.every((f) => f.item[key] === value);
        const off = key === 'alignY' && stacked;
        return (
          <button
            key={`${key}-${value}`}
            type="button"
            className="props-btn"
            aria-label={label}
            title={
              off ? `${label} : sans effet dans une pile verticale` : label
            }
            aria-pressed={active}
            disabled={off}
            onClick={() =>
              c.patchItems(
                found.map((f) => f.item.id),
                { [key]: active ? undefined : value },
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

// Barre de propriétés ultra-fine, à droite de l'aperçu : seules les
// propriétés de la sélection, une icône par réglage, contrôle en popover.
const alignLabels = {
  start: 'Début',
  center: 'Centre',
  end: 'Fin',
  stretch: 'Étirer',
};
const justifyLabels = {
  start: 'Début',
  center: 'Centre',
  end: 'Fin',
  between: 'Réparti',
};
const spaceLabels = { none: 'Aucun', sm: 'S', md: 'M', lg: 'L' };
const gapLabels = { sm: 'S', md: 'M', lg: 'L' };

type Tool = {
  id: string;
  label: string;
  icon: ComponentType<LucideProps>;
  control?: ReactNode;
  action?: () => void;
};

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="toggle-group wrap" role="group">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
const entries = <T extends string>(
  list: readonly T[],
  labels: Record<T, string>,
) => list.map((v) => [v, labels[v]] as const);
const nums = (from: number) =>
  ['1', '2', '3', '4'].slice(from - 1).map((n) => [n, n] as const);

function boxTools(
  box: Box & { layout: string },
  set: (patch: Partial<Box> & { layout?: string }) => void,
  section?: Section,
  onSection?: (patch: Partial<Section>) => void,
): Tool[] {
  const tools: Tool[] = [
    {
      id: 'layout',
      label: 'Direction',
      icon:
        box.layout === 'row'
          ? Columns3
          : box.layout === 'grid'
            ? Grid2x2
            : Rows3,
      control: (
        <Choice
          value={box.layout as (typeof layouts)[number]}
          options={entries(layouts, layoutLabels)}
          onChange={(layout) =>
            set({
              layout,
              columns: layout === 'grid' ? Math.max(2, box.columns) : 1,
            })
          }
        />
      ),
    },
  ];
  if (box.layout === 'grid')
    tools.push({
      id: 'columns',
      label: 'Colonnes',
      icon: Grid2x2,
      control: (
        <Choice
          value={String(box.columns)}
          options={nums(2)}
          onChange={(v) => set({ columns: Number(v) })}
        />
      ),
    });
  tools.push(
    {
      id: 'align',
      label: 'Alignement',
      icon: AlignVerticalJustifyCenter,
      control: (
        <Choice
          value={box.align}
          options={entries(aligns, alignLabels)}
          onChange={(align) => set({ align })}
        />
      ),
    },
    {
      id: 'justify',
      label: 'Justification',
      icon: AlignHorizontalJustifyCenter,
      control: (
        <Choice
          value={box.justify}
          options={entries(justifies, justifyLabels)}
          onChange={(justify) => set({ justify })}
        />
      ),
    },
    {
      id: 'gap',
      label: 'Espacement (gap)',
      icon: Space,
      control: (
        <Choice
          value={box.gap}
          options={entries(gaps, gapLabels)}
          onChange={(gap) => set({ gap })}
        />
      ),
    },
    {
      id: 'padding',
      label: 'Marge intérieure (padding)',
      icon: SquareDashed,
      control: (
        <Choice
          value={box.padding}
          options={entries(spaces, spaceLabels)}
          onChange={(padding) => set({ padding })}
        />
      ),
    },
  );
  if (section && onSection)
    tools.push(
      {
        id: 'margin',
        label: 'Marge extérieure (margin)',
        icon: Square,
        control: (
          <Choice
            value={section.margin}
            options={entries(spaces, spaceLabels)}
            onChange={(margin) => onSection({ margin })}
          />
        ),
      },
      {
        id: 'name',
        label: 'Nom de la section',
        icon: Type,
        control: (
          <input
            className="input input-sm"
            aria-label="Nom de la section"
            value={section.name}
            maxLength={40}
            onChange={(e) => onSection({ name: e.target.value })}
          />
        ),
      },
    );
  return tools;
}

function itemTools(
  item: Item,
  parentGrid: boolean,
  set: (patch: Partial<Item>) => void,
): Tool[] {
  const spec = blockSpecs[item.kind];
  const tools: Tool[] = [];
  if (spec.variants.length > 1)
    tools.push({
      id: 'variant',
      label: 'Variante',
      icon: Palette,
      control: (
        <Choice
          value={item.variant}
          options={spec.variants}
          onChange={(variant) => set({ variant })}
        />
      ),
    });
  if (spec.text !== undefined)
    tools.push({
      id: 'text',
      label: 'Contenu',
      icon: Type,
      control: (
        <input
          className="input input-sm"
          aria-label="Contenu"
          value={item.text}
          maxLength={160}
          onChange={(e) => set({ text: e.target.value })}
        />
      ),
    });
  if (spec.sizes)
    tools.push({
      id: 'size',
      label: 'Taille',
      icon: Scaling,
      control: (
        <Choice
          value={item.size}
          options={sizes.map((s) => [s, s.toUpperCase()] as const)}
          onChange={(size) => set({ size })}
        />
      ),
    });
  tools.push({
    id: 'width',
    label: 'Largeur',
    icon: MoveHorizontal,
    control: (
      <Choice
        value={item.width}
        options={entries(widths, { fill: 'Remplir', hug: 'Contenu' })}
        onChange={(width) => set({ width })}
      />
    ),
  });
  if (parentGrid)
    tools.push({
      id: 'span',
      label: 'Colonnes et lignes occupées',
      icon: Grid2x2,
      control: (
        <>
          <span className="muted small">Colonnes</span>
          <Choice
            value={String(item.span)}
            options={nums(1)}
            onChange={(v) => set({ span: Number(v) })}
          />
          <span className="muted small">Lignes</span>
          <Choice
            value={String(item.rows)}
            options={nums(1)}
            onChange={(v) => set({ rows: Number(v) })}
          />
        </>
      ),
    });
  return tools;
}

export default function PropsBar({
  c,
  multi = [],
  onGrouped,
}: {
  c: CompositionState;
  // Sélection multiple (Maj / ⌘ + clic) : action « Grouper ».
  multi?: string[];
  onGrouped?: () => void;
}) {
  const [open, setOpen] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(undefined), [c.selected]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !root.current?.contains(e.target as Node)
      )
        setOpen(undefined);
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', close);
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', close);
    };
  }, [open]);

  const sel = c.selected;
  const section = c.draft.sections.find((s) => s.id === sel);
  let item: Item | undefined;
  let parentGrid = false;
  for (const s of c.draft.sections) {
    for (const i of s.items) {
      if (i.id === sel) {
        item = i;
        parentGrid = s.layout === 'grid';
      }
      const child = i.children?.find((x) => x.id === sel);
      if (child) {
        item = child as Item;
        parentGrid = i.variant === 'grid';
      }
    }
  }
  if (multi.length > 1)
    return (
      <aside
        className="props-bar"
        aria-label={`Propriétés : ${multi.length} éléments`}
      >
        <span
          className="props-count"
          title={`${multi.length} éléments sélectionnés`}
        >
          {multi.length}
        </span>
        <AlignTools c={c} ids={multi} />
        <button
          type="button"
          className="props-btn"
          aria-label="Grouper"
          title="Grouper"
          onClick={() => {
            if (c.group(multi)) onGrouped?.();
          }}
        >
          <Group size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </aside>
    );
  if (!section && !item)
    return (
      <aside className="props-bar" aria-label="Propriétés">
        <span
          className="props-empty"
          title="Sélectionnez un élément dans l’écran ou les calques"
        >
          ·
        </span>
      </aside>
    );

  const tools: Tool[] = section
    ? boxTools(
        { ...section },
        ({ layout, ...patch }) =>
          c.patchSection(section.id, {
            ...patch,
            ...(layout ? { layout: layout as Section['layout'] } : {}),
          }),
        section,
        (patch) => c.patchSection(section.id, patch),
      )
    : item!.kind === 'group' && item!.box
      ? [
          ...boxTools(
            { ...item!.box, layout: item!.variant },
            ({ layout, ...patch }) =>
              c.patchItem(item!.id, {
                box: { ...item!.box!, ...patch },
                ...(layout ? { variant: layout } : {}),
              }),
          ),
          ...itemTools(item!, parentGrid, (p) =>
            c.patchItem(item!.id, p),
          ).filter((t) => t.id !== 'variant'),
        ]
      : itemTools(item!, parentGrid, (p) => c.patchItem(item!.id, p));
  const id = sel!;
  tools.push(
    { id: 'up', label: 'Monter', icon: ArrowUp, action: () => c.move(id, -1) },
    {
      id: 'down',
      label: 'Descendre',
      icon: ArrowDown,
      action: () => c.move(id, 1),
    },
  );
  if (item?.kind === 'group')
    tools.push({
      id: 'ungroup',
      label: 'Dégrouper',
      icon: Ungroup,
      action: () => c.ungroup(id),
    });
  if (item)
    tools.push({
      id: 'copy',
      label: 'Dupliquer',
      icon: Copy,
      action: () => c.duplicate(id),
    });
  tools.push({
    id: 'delete',
    label: 'Supprimer',
    icon: Trash2,
    action: () => c.remove(id),
  });

  return (
    <aside
      className="props-bar"
      ref={root}
      aria-label={`Propriétés : ${section ? `section ${section.name}` : blockSpecs[item!.kind].label}`}
    >
      {item && <AlignTools c={c} ids={[item.id]} />}
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <div key={t.id} className="props-tool">
            <button
              type="button"
              className="props-btn"
              aria-label={t.label}
              title={t.label}
              aria-expanded={t.control ? open === t.id : undefined}
              onClick={() =>
                t.action
                  ? t.action()
                  : setOpen(open === t.id ? undefined : t.id)
              }
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
            {open === t.id && t.control && (
              <div className="props-pop" role="dialog" aria-label={t.label}>
                <strong>{t.label}</strong>
                {t.control}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

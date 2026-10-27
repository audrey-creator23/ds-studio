import {
  Badge,
  Button,
  createTheme,
  defaultVariantColorsResolver,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';

// Thème unique du chrome DS-Studio (Mantine). Il ne touche jamais les tokens
// éditables du DS Lisière : seule l'interface de l'atelier en dépend.
// Échelles dérivées de la palette : 0-4 éclaircies vers le blanc, 5 = teinte
// de référence, 6-9 assombries vers Rich Mahogany. Contrastes WCAG mesurés
// sur blanc (b) ou sur Mahogany (m), vérifiés dans tests/theme.test.ts.
export const palette = {
  sunflower: '#FABC3C', // Sunflower Gold
  sandy: '#F19143', // Sandy Brown
  tangerine: '#FF773D', // Atomic Tangerine
  tomato: '#F55536', // Tomato
  ember: '#EA300B', // Pure Red
  mahogany: '#4B1207', // Rich Mahogany
} as const;

const scales = {
  sunflower: [
    '#FFFAEF',
    '#FEF3DC',
    '#FDE8BD',
    '#FCDC9A',
    '#FBCD6F',
    '#FABC3C',
    '#D79A31',
    '#BB7F29',
    '#9F6420',
    '#834818',
  ],
  sandy: [
    '#FEF6F0',
    '#FCEBDD',
    '#FADABF',
    '#F8C69D',
    '#F5AE74',
    '#F19143',
    '#D07837',
    '#B5632D',
    '#9B4F24',
    '#803B1A',
  ],
  tangerine: [
    '#FFF4EF',
    '#FFE7DC',
    '#FFD1BD',
    '#FFB89A',
    '#FF9A6F',
    '#FF773D',
    '#DB6332',
    '#BE532A',
    '#A14221',
    '#853218',
  ],
  tomato: [
    '#FEF1EF',
    '#FDE0DB',
    '#FCC5BB',
    '#FAA796',
    '#F8816A',
    '#F55536',
    '#D3482D',
    '#B83D25',
    '#9D321E',
    '#812716',
  ],
  ember: [
    '#FDEEEB',
    '#FBDAD3',
    '#F8B9AC',
    '#F49380',
    '#EF664A',
    '#EA300B',
    '#CA2A0A',
    '#B1250A',
    '#972009',
    '#7E1C08',
  ],
  mahogany: [
    '#F4F1F0',
    '#E6DEDC',
    '#D0C1BF',
    '#B7A09C',
    '#9C7D77',
    '#815951',
    '#66362C',
    '#4B1207',
    '#380E05',
    '#290A04',
  ],
} satisfies Record<keyof typeof palette, MantineColorsTuple>;

// Kit Figma « shadcn/ui components » (sitsiilia), lu via le MCP Figma et les
// données du skill figma-shadcn-by-sitsiilia : neutres (Tailwind neutral),
// rayons, typographie Inter, ombres noires à 10 % et focus en halo de 3 px.
// La palette ci-dessus garde les rôles de couleur (primary, accent…).
export const kit = {
  foreground: '#0A0A0A',
  muted: '#F5F5F5', // secondary, muted, accent du kit
  mutedForeground: '#737373', // 4,7:1 sur blanc
  border: '#E5E5E5',
  ring: '#737373', // bordure au focus
  ringSubtle: '#A1A1A180', // halo de 3 px
  ringDestructive: '#DC262633',
  sidebar: '#FAFAFA',
  shadowXs: '0 1px 2px 0 rgb(0 0 0 / 0.10)',
  shadowMd:
    '0 2px 4px -2px rgb(0 0 0 / 0.10), 0 4px 6px -1px rgb(0 0 0 / 0.10)',
  shadowLg:
    '0 4px 6px -4px rgb(0 0 0 / 0.10), 0 10px 15px -3px rgb(0 0 0 / 0.10)',
} as const;

// Rôles : chaque usage pointe vers une teinte dont le contraste est suffisant.
export const roles = {
  primary: scales.ember[6], // boutons pleins, liens, sélection : 5,5:1 (b)
  primaryHover: scales.ember[7], // 6,7:1 (b)
  primarySoft: scales.ember[0], // fond de sélection, texte primary dessus
  focus: palette.ember, // anneau de focus : 4,3:1 (b), ≥ 3:1 requis
  accent: palette.tangerine, // pastilles, bulle : texte Mahogany 5,7:1
  accentSoft: scales.tangerine[0],
  warning: palette.sunflower, // texte Mahogany 8,9:1
  warningSoft: scales.sunflower[0],
  warningText: scales.sunflower[9], // 7,2:1 (b)
  danger: scales.tomato[7], // bouton destructif : 5,6:1 (b)
  dangerSoft: scales.tomato[0],
  dangerText: scales.tomato[8], // 7,2:1 (b)
  onAccent: palette.mahogany,
  surface: '#FFFFFF',
  surfaceWarm: scales.sandy[0], // barre latérale, zones calmes
  surfaceDark: palette.mahogany, // panneaux sombres, bulle, volcan : blanc 15:1
} as const;

// Variantes du kit sur Button et Badge : default (Mantine filled), outline,
// secondary, ghost, destructive (teinte douce), link.
const kitVariants: VariantColorsResolver = (input) => {
  const danger = {
    background: roles.dangerSoft,
    hover: scales.tomato[1],
    color: roles.dangerText,
    border: '1px solid transparent',
  };
  switch (input.variant) {
    case 'outline':
      return {
        background: '#FFFFFF',
        hover: kit.muted,
        color: kit.foreground,
        border: `1px solid ${kit.border}`,
      };
    case 'secondary':
      return {
        background: kit.muted,
        hover: '#EBEBEB',
        color: kit.foreground,
        border: '1px solid transparent',
      };
    case 'ghost':
      return {
        background: 'transparent',
        hover: kit.muted,
        color: kit.foreground,
        border: '1px solid transparent',
      };
    case 'destructive':
      return danger;
    case 'link':
      return {
        background: 'transparent',
        hover: 'transparent',
        color: kit.foreground,
        border: '1px solid transparent',
      };
    default:
      return defaultVariantColorsResolver(input);
  }
};

// Tailles du kit : xs 24, sm 28, default 32 (Mantine md), lg 36.
const buttonSizes = {
  xs: { h: 24, px: 8, fz: 12, r: 6 },
  sm: { h: 28, px: 10, fz: 12, r: 6 },
  md: { h: 32, px: 10, fz: 14, r: 10 },
  lg: { h: 36, px: 10, fz: 14, r: 10 },
} as const;

export const theme = createTheme({
  colors: scales,
  primaryColor: 'ember',
  primaryShade: { light: 6, dark: 7 },
  autoContrast: true,
  luminanceThreshold: 0.35,
  variantColorResolver: kitVariants,
  black: kit.foreground,
  fontFamily:
    "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  fontSizes: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
  lineHeights: { xs: '16px', sm: '20px', md: '24px', lg: '28px', xl: '28px' },
  headings: { fontWeight: '600' },
  defaultRadius: 'lg',
  radius: { xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '14px' },
  shadows: {
    xs: kit.shadowXs,
    sm: kit.shadowXs,
    md: kit.shadowMd,
    lg: kit.shadowLg,
  },
  focusRing: 'never',
  respectReducedMotion: true,
  cursorType: 'pointer',
  components: {
    Button: Button.extend({
      defaultProps: { size: 'md' },
      vars: (_theme, props) => {
        const s =
          buttonSizes[(props.size ?? 'md') as keyof typeof buttonSizes] ??
          buttonSizes.md;
        return {
          root: {
            '--button-height': `${s.h}px`,
            '--button-padding-x': `${s.px}px`,
            '--button-fz': `${s.fz}px`,
            '--button-radius': `${s.r}px`,
          },
        };
      },
    }),
    Card: { defaultProps: { radius: 'xl', withBorder: true, shadow: 'xs' } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 300 } },
    Badge: Badge.extend({
      defaultProps: { radius: 26, size: 'md' },
      vars: () => ({
        root: {
          '--badge-height': '22px',
          '--badge-padding-x': '8px',
          '--badge-fz': '12px',
        },
      }),
    }),
    Input: { defaultProps: { radius: 'lg', size: 'sm' } },
    InputWrapper: { defaultProps: { size: 'sm' } },
    NavLink: { defaultProps: { variant: 'subtle' } },
  },
  other: { roles },
});

// Variables --ui-* du chrome générées depuis le thème : une seule source.
export const resolver: CSSVariablesResolver = () => ({
  variables: {
    '--ui-page': roles.surface,
    '--ui-sidebar': roles.surfaceWarm,
    '--ui-fg': kit.foreground,
    '--ui-fg-secondary': '#404040',
    '--ui-fg-support': kit.mutedForeground,
    '--ui-fg-weak': kit.mutedForeground,
    '--ui-brand': roles.primary,
    '--ui-brand-hover': roles.primaryHover,
    '--ui-brand-soft': roles.primarySoft,
    '--ui-focus': kit.ring,
    '--ui-ring-subtle': kit.ringSubtle,
    '--ui-ring-destructive': kit.ringDestructive,
    '--ui-muted': kit.muted,
    '--ui-shadow-xs': kit.shadowXs,
    '--ui-shadow-md': kit.shadowMd,
    '--ui-shadow-lg': kit.shadowLg,
    '--ui-accent': roles.accent,
    '--ui-accent-soft': roles.accentSoft,
    '--ui-warning': roles.warning,
    '--ui-warning-soft': roles.warningSoft,
    '--ui-warning-text': roles.warningText,
    '--ui-danger': roles.danger,
    '--ui-danger-soft': roles.dangerSoft,
    '--ui-danger-text': roles.dangerText,
    '--ui-on-accent': roles.onAccent,
    '--ui-surface-dark': roles.surfaceDark,
    '--ui-border': kit.border,
    '--ui-border-strong': kit.border,
    '--ui-hover': kit.muted,
    '--ui-tabs': kit.muted,
    '--ui-radius': '10px',
    '--ui-radius-box': '14px',
    '--ui-box-shadow': `0 0 0 1px ${kit.border}, ${kit.shadowXs}`,
  },
  light: {},
  dark: {},
});

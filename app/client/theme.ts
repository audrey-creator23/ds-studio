import {
  Badge,
  Button,
  createTheme,
  defaultVariantColorsResolver,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';

// Identité DS-Studio = thème shadcn/create collé (ui.shadcn.com/create),
// bloc `.dark`, converti d'oklch en hexadécimal ; kit Figma shadcn/ui
// (sitsiilia) pour la géométrie. Interface sombre uniquement. Ce thème ne
// touche jamais les tokens éditables du DS Lisière.
export const shadcnDark = {
  background: '#0A0A0A', // oklch(0.145 0 0)
  foreground: '#FAFAFA', // oklch(0.985 0 0)
  card: '#171717', // oklch(0.205 0 0) — card, popover, sidebar
  primary: '#E5E5E5', // oklch(0.922 0 0)
  primaryForeground: '#171717', // oklch(0.205 0 0)
  secondary: '#262626', // oklch(0.269 0 0) — secondary, muted, accent
  mutedForeground: '#A1A1A1', // oklch(0.708 0 0)
  destructive: '#FF6467', // oklch(0.704 0.191 22.216)
  border: 'rgb(255 255 255 / 0.10)', // oklch(1 0 0 / 10%)
  input: 'rgb(255 255 255 / 0.15)', // oklch(1 0 0 / 15%)
  ring: '#737373', // oklch(0.556 0 0)
  sidebarPrimary: '#1447E6', // oklch(0.488 0.243 264.376)
  // --chart-1 → 5 : rampe bleue (Radix/Tailwind blue).
  chart: ['#8EC5FF', '#2B7FFF', '#155DFC', '#1447E6', '#193CB8'],
} as const;

// Bloc `:root` (clair) : utilisé seulement par l'aperçu des pages du DS.
export const shadcnLight = {
  background: '#FFFFFF',
  foreground: '#0A0A0A',
  card: '#FFFFFF',
  primary: '#171717',
  primaryForeground: '#FAFAFA',
  secondary: '#F5F5F5',
  mutedForeground: '#737373',
  destructive: '#E7000B',
  border: '#E5E5E5',
  input: '#E5E5E5',
  ring: '#A1A1A1',
  sidebar: '#FAFAFA',
} as const;

// Rayon de base du thème (--radius: 0.875rem) ; chaque palier en dérive par
// décalage, comme dans le kit : xs = base − 6 … 4xl = base + 16.
export const radiusBase = 14;
export const radii = {
  xs: radiusBase - 6,
  sm: radiusBase - 4,
  md: radiusBase - 2,
  lg: radiusBase,
  xl: radiusBase + 4,
  '2xl': radiusBase + 8,
  '3xl': radiusBase + 12,
  '4xl': radiusBase + 16,
} as const;

const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.30)',
  md: '0 2px 4px -2px rgb(0 0 0 / 0.40), 0 4px 6px -1px rgb(0 0 0 / 0.40)',
  lg: '0 4px 6px -4px rgb(0 0 0 / 0.50), 0 10px 15px -3px rgb(0 0 0 / 0.50)',
};

// Échelles Mantine (10 teintes). `dark` porte les surfaces du mode sombre :
// 0 texte, 2 texte atténué, 4 bordures, 5 survol, 6 cartes, 7 page.
const scales = {
  dark: [
    '#FAFAFA',
    '#E5E5E5',
    '#A1A1A1',
    '#737373',
    '#2E2E2E',
    '#262626',
    '#171717',
    '#0A0A0A',
    '#050505',
    '#000000',
  ],
  neutral: [
    '#FAFAFA',
    '#F5F5F5',
    '#E5E5E5',
    '#D4D4D4',
    '#A1A1A1',
    '#737373',
    '#525252',
    '#404040',
    '#262626',
    '#171717',
  ],
  blue: [
    '#EFF6FF',
    '#DBEAFE',
    '#BEDBFF',
    '#8EC5FF',
    '#51A2FF',
    '#2B7FFF',
    '#155DFC',
    '#1447E6',
    '#193CB8',
    '#1C398E',
  ],
  // Palette officielle des accents (jaune → rouge) : 5 teintes et nuances
  // interpolées ; 9 = rouge le plus soutenu pour les états actifs.
  accent: [
    '#FFF3DA',
    '#FABC3C',
    '#FCB73A',
    '#FFB238',
    '#F8A23E',
    '#F19143',
    '#F88440',
    '#FF773D',
    '#FA663A',
    '#F55536',
  ],
  red: [
    '#FEF2F2',
    '#FFE2E2',
    '#FFC9C9',
    '#FFA2A2',
    '#FF6467',
    '#FB2C36',
    '#E7000B',
    '#C10007',
    '#9F0712',
    '#82181A',
  ],
  green: [
    '#F0FDF4',
    '#DCFCE7',
    '#B9F8CF',
    '#7BF1A8',
    '#05DF72',
    '#00C950',
    '#00A63E',
    '#008236',
    '#016630',
    '#0D542B',
  ],
} satisfies Record<string, MantineColorsTuple>;

// Rôles : contrastes mesurés sur la carte #171717, vérifiés par test.
export const roles = {
  page: shadcnDark.background,
  surface: shadcnDark.card,
  raised: shadcnDark.secondary, // tuiles internes, survol, rail d'onglets
  text: shadcnDark.foreground,
  textMuted: shadcnDark.mutedForeground,
  primary: shadcnDark.primary, // bouton plein clair
  primaryHover: '#D4D4D4',
  onPrimary: shadcnDark.primaryForeground,
  accent: '#F19143', // palette officielle (Sandy Brown)
  accentSoft: 'rgb(241 145 67 / 0.16)',
  danger: shadcnDark.destructive,
  dangerSoft: 'rgb(255 100 103 / 0.12)',
  success: '#05DF72',
  successSoft: 'rgb(5 223 114 / 0.12)',
  warning: '#FDC700',
  focus: shadcnDark.ring,
  ringSubtle: 'rgb(115 115 115 / 0.50)',
  ringDestructive: 'rgb(255 100 103 / 0.30)',
} as const;

// Variantes du kit sur Button, Badge et Alert : default (Mantine filled),
// outline, secondary, ghost, destructive (teinte douce), link.
const kitVariants: VariantColorsResolver = (input) => {
  const plain = {
    hover: 'var(--ui-muted)',
    color: 'var(--ui-fg)',
    border: '1px solid transparent',
  };
  switch (input.variant) {
    case 'filled':
      if (input.color && input.color !== 'neutral')
        return defaultVariantColorsResolver(input);
      return {
        background: 'var(--ui-brand)',
        hover: 'var(--ui-brand-hover)',
        color: 'var(--ui-on-brand)',
        border: '1px solid transparent',
      };
    case 'outline':
      return {
        ...plain,
        background: 'var(--ui-input-bg)',
        border: '1px solid var(--ui-input)',
      };
    case 'secondary':
      return {
        ...plain,
        background: 'var(--ui-muted)',
        hover: 'var(--ui-muted-hover)',
      };
    case 'ghost':
      return { ...plain, background: 'transparent' };
    case 'destructive':
      return {
        background: 'var(--ui-danger-soft)',
        hover: 'var(--ui-danger-soft-hover)',
        color: 'var(--ui-danger)',
        border: '1px solid transparent',
      };
    case 'link':
      return { ...plain, background: 'transparent', hover: 'transparent' };
    default:
      return defaultVariantColorsResolver(input);
  }
};

// Tailles du kit : xs 24, sm 28, default 32 (Mantine md), lg 36.
const buttonSizes = {
  xs: { h: 24, px: 8, fz: 12, r: radii.sm },
  sm: { h: 28, px: 10, fz: 12, r: radii.sm },
  md: { h: 32, px: 10, fz: 14, r: radii.lg },
  lg: { h: 36, px: 10, fz: 14, r: radii.lg },
} as const;

export const theme = createTheme({
  colors: scales,
  primaryColor: 'neutral',
  primaryShade: { light: 9, dark: 2 },
  autoContrast: true,
  luminanceThreshold: 0.45,
  variantColorResolver: kitVariants,
  white: '#FFFFFF',
  black: shadcnDark.background,
  fontFamily:
    "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  fontSizes: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
  lineHeights: { xs: '16px', sm: '20px', md: '24px', lg: '28px', xl: '28px' },
  headings: { fontWeight: '600' },
  defaultRadius: 'lg',
  radius: {
    xs: `${radii.xs}px`,
    sm: `${radii.sm}px`,
    md: `${radii.md}px`,
    lg: `${radii.lg}px`,
    xl: `${radii.xl}px`,
  },
  shadows: { xs: shadows.xs, sm: shadows.xs, md: shadows.md, lg: shadows.lg },
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
      defaultProps: { radius: radii['4xl'], size: 'md' },
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

// Variables --ui-* : mêmes noms dans les deux modes, valeurs du thème collé.
function uiVariables(mode: 'light' | 'dark'): Record<string, string> {
  const dark = mode === 'dark';
  const t = dark ? shadcnDark : shadcnLight;
  return {
    '--mantine-color-body': t.background,
    '--mantine-color-text': t.foreground,
    '--mantine-color-dimmed': t.mutedForeground,
    '--mantine-color-default-border': t.border,
    '--mantine-color-placeholder': t.mutedForeground,
    '--ui-page': t.background,
    '--ui-card': t.card,
    '--ui-sidebar': dark ? shadcnDark.card : shadcnLight.sidebar,
    '--ui-fg': t.foreground,
    '--ui-fg-secondary': dark ? '#D4D4D4' : '#404040',
    '--ui-fg-support': t.mutedForeground,
    '--ui-fg-weak': t.mutedForeground,
    '--ui-brand': t.primary,
    '--ui-brand-hover': dark ? roles.primaryHover : '#262626',
    '--ui-brand-soft': t.secondary,
    '--ui-on-brand': t.primaryForeground,
    '--ui-muted': t.secondary,
    '--ui-muted-hover': dark ? '#2E2E2E' : '#EBEBEB',
    '--ui-input': t.input,
    '--ui-input-bg': dark ? 'rgb(255 255 255 / 0.045)' : '#FFFFFF',
    '--ui-focus': dark ? shadcnDark.ring : '#737373',
    '--ui-ring-subtle': dark ? roles.ringSubtle : 'rgb(161 161 161 / 0.50)',
    '--ui-ring-destructive': roles.ringDestructive,
    '--ui-accent': roles.accent,
    '--ui-accent-strong': '#8C4122', // orange profond : texte blanc 7,3:1
    '--ui-accent-soft': roles.accentSoft,
    '--ui-warning': dark ? roles.warning : '#A65F00',
    '--ui-warning-soft': 'rgb(253 199 0 / 0.12)',
    '--ui-warning-text': dark ? roles.warning : '#A65F00',
    '--ui-danger': t.destructive,
    '--ui-danger-soft': dark ? roles.dangerSoft : 'rgb(231 0 11 / 0.10)',
    '--ui-danger-soft-hover': dark
      ? 'rgb(255 100 103 / 0.2)'
      : 'rgb(231 0 11 / 0.16)',
    '--ui-danger-text': t.destructive,
    '--ui-success': dark ? roles.success : '#008236',
    '--ui-success-soft': roles.successSoft,
    '--ui-on-accent': '#FFFFFF',
    '--ui-surface-dark': shadcnDark.card,
    '--ui-shadow-xs': shadows.xs,
    '--ui-shadow-md': shadows.md,
    '--ui-shadow-lg': shadows.lg,
    '--ui-border': t.border,
    '--ui-border-strong': t.input,
    '--ui-hover': t.secondary,
    '--ui-tabs': t.secondary,
    '--ui-radius': `${radii.lg}px`,
    '--ui-radius-box': `${radii.xl}px`,
    '--ui-radius-md': `${radii.md}px`,
    '--ui-radius-bubble': `${radii['3xl']}px`,
    '--ui-box-shadow': `0 0 0 1px ${t.border}, ${shadows.xs}`,
    ...Object.fromEntries(
      shadcnDark.chart.map((c, i) => [`--ui-chart-${i + 1}`, c]),
    ),
  };
}

// Interface sombre ; l'aperçu des pages du DS reste clair.
export const resolver: CSSVariablesResolver = () => ({
  variables: {},
  light: uiVariables('light'),
  dark: uiVariables('dark'),
});

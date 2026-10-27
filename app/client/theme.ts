import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
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

export const theme = createTheme({
  colors: scales,
  primaryColor: 'ember',
  primaryShade: { light: 6, dark: 7 },
  autoContrast: true,
  luminanceThreshold: 0.35,
  black: '#32302C',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
  headings: { fontWeight: '650' },
  defaultRadius: 'sm',
  radius: { xs: '4px', sm: '6px', md: '12px', lg: '16px', xl: '24px' },
  shadows: {
    sm: 'rgba(0, 0, 0, 0.05) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px',
    md: 'rgba(0, 0, 0, 0.03) 0 12px 32px, rgba(0, 0, 0, 0.05) 0 0 0 1px',
    lg: 'rgba(75, 18, 7, 0.12) 0 16px 40px, rgba(0, 0, 0, 0.06) 0 0 0 1px',
  },
  focusRing: 'auto',
  respectReducedMotion: true,
  cursorType: 'pointer',
  components: {
    Button: { defaultProps: { radius: 'sm' } },
    Card: { defaultProps: { radius: 'md', withBorder: true, padding: 'lg' } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 300 } },
    Badge: { defaultProps: { radius: 'sm' } },
  },
  other: { roles },
});

// Variables --ui-* du chrome générées depuis le thème : une seule source.
export const resolver: CSSVariablesResolver = () => ({
  variables: {
    '--ui-page': roles.surface,
    '--ui-sidebar': roles.surfaceWarm,
    '--ui-fg': '#32302C',
    '--ui-fg-secondary': '#5F5E5B',
    '--ui-fg-support': '#91918E',
    '--ui-fg-weak': '#73726E',
    '--ui-brand': roles.primary,
    '--ui-brand-hover': roles.primaryHover,
    '--ui-brand-soft': roles.primarySoft,
    '--ui-focus': roles.focus,
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
    '--ui-border': 'rgba(84, 72, 49, 0.08)',
    '--ui-border-strong': 'rgba(55, 53, 47, 0.16)',
    '--ui-hover': 'rgba(0, 0, 0, 0.03)',
    '--ui-tabs': 'rgba(0, 0, 0, 0.04)',
    '--ui-radius': '6px',
    '--ui-radius-box': '12px',
    '--ui-box-shadow':
      'rgba(0, 0, 0, 0.03) 0 12px 32px, rgba(0, 0, 0, 0.05) 0 0 0 1px',
  },
  light: {},
  dark: {},
});

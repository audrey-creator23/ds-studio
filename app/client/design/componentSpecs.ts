// Registre des composants configurables : ajouter une entrée suffit pour
// qu'elle apparaisse dans l'inspecteur et dans la planche de l'aperçu.
export type ComponentId = 'button' | 'field' | 'badge' | 'card' | 'navigation';
export type ComponentState =
  'default' | 'hover' | 'focus' | 'error' | 'disabled';
export type ComponentSize = 'sm' | 'md' | 'lg';

export interface ComponentConfig {
  component: ComponentId;
  variant: string;
  size: ComponentSize;
  text: string;
}

export const componentSpecs: Record<
  ComponentId,
  {
    label: string;
    variants: [string, string][];
    sizes: boolean;
    text?: string;
    states: [ComponentState, string][];
  }
> = {
  button: {
    label: 'Bouton',
    variants: [
      ['primary', 'Principal'],
      ['secondary', 'Secondaire'],
      ['danger', 'Danger'],
    ],
    sizes: true,
    text: 'Réserver une place',
    states: [
      ['default', 'Par défaut'],
      ['hover', 'Survol'],
      ['focus', 'Focus'],
      ['disabled', 'Désactivé'],
    ],
  },
  field: {
    label: 'Champ',
    variants: [
      ['text', 'Texte'],
      ['email', 'E-mail'],
    ],
    sizes: false,
    text: 'Votre prénom',
    states: [
      ['default', 'Par défaut'],
      ['focus', 'Focus'],
      ['error', 'Erreur'],
      ['disabled', 'Désactivé'],
    ],
  },
  badge: {
    label: 'Badge',
    variants: [
      ['neutral', 'Neutre'],
      ['brand', 'Marque'],
      ['success', 'Succès'],
      ['danger', 'Danger'],
    ],
    sizes: false,
    text: '6 places disponibles',
    states: [['default', 'Par défaut']],
  },
  card: {
    label: 'Carte',
    variants: [
      ['standard', 'Standard'],
      ['accent', 'Mise en avant'],
    ],
    sizes: false,
    states: [
      ['default', 'Par défaut'],
      ['hover', 'Survol'],
    ],
  },
  navigation: {
    label: 'Navigation',
    variants: [
      ['Découvrir', 'Onglet Découvrir'],
      ['Favoris', 'Onglet Favoris'],
      ['Profil', 'Onglet Profil'],
    ],
    sizes: false,
    states: [['default', 'Par défaut']],
  },
};

export const defaultConfig: ComponentConfig = {
  component: 'button',
  variant: 'primary',
  size: 'md',
  text: componentSpecs.button.text!,
};

export function normalizeConfig(value: unknown): ComponentConfig {
  const v = value as Partial<ComponentConfig> | null;
  const spec = v?.component && componentSpecs[v.component];
  if (!spec) return defaultConfig;
  return {
    component: v.component!,
    variant: spec.variants.some(([id]) => id === v.variant)
      ? v.variant!
      : spec.variants[0][0],
    size: v.size === 'sm' || v.size === 'lg' ? v.size : 'md',
    text: typeof v.text === 'string' ? v.text.slice(0, 60) : (spec.text ?? ''),
  };
}

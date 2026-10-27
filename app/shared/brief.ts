import {
  statusLabels,
  statusOf,
  tasks,
  type TaskId,
  type TaskState,
} from './tasks.js';

// Synthèse du brief PFE et de la note d'intention, consultés sur Notion en
// lecture seule. Source unique pour la page Brief, le Dashboard Volcan et
// l'assistant. Mettre à jour à la main si les sources évoluent.
export const briefSources = [
  {
    label: 'Brief PFE',
    url: 'https://app.notion.com/p/PFE-M2UXUI-2026-27-2989c8cd131380fb85e5f3b42fe6d1f8',
  },
  {
    label: 'Note d’intention',
    url: 'https://app.notion.com/p/Note-d-intention-Audrey-NOIRAN-4022df0ba53e8005b9a6d9462024ce21',
  },
] as const;

// Année scolaire 2026-27 indiquée par le brief. Les tâches reliées donnent le
// statut réel d'un jalon : une date passée ne vaut pas validation.
export const milestones: {
  date: string;
  label: string;
  title: string;
  detail: string;
  tasks: TaskId[];
}[] = [
  {
    date: '2026-09-25',
    label: '25 sept.',
    title: 'Lancement',
    detail: 'Présentation du PFE, recherche de sujets',
    tasks: [],
  },
  {
    date: '2026-11-13',
    label: '13 nov.',
    title: 'Note de cadrage',
    detail: 'Livrable : note de cadrage · validation des projets · atelier',
    tasks: ['intention', 'validation'],
  },
  {
    date: '2026-12-11',
    label: '11 déc.',
    title: 'Accessibilité & RGPD',
    detail: 'Points de cadrage, atelier et suivi individuel',
    tasks: ['technique'],
  },
  {
    date: '2027-01-08',
    label: '8 janv.',
    title: 'Début du DS',
    detail: 'Démarrage du cours Design System',
    tasks: [],
  },
  {
    date: '2027-01-29',
    label: '29 janv.',
    title: 'Document de cadrage',
    detail: 'Livrable : document de cadrage · cours DS structure & méthode',
    tasks: ['contexte', 'fonctionnel', 'technique'],
  },
  {
    date: '2027-03-12',
    label: '12 mars',
    title: 'Fin du DS',
    detail: 'Fin du cours Design System',
    tasks: ['design-system'],
  },
];

export type MilestoneStatus =
  'validated' | 'done' | 'late' | 'current' | 'past' | 'upcoming';
export const milestoneLabels: Record<MilestoneStatus, string> = {
  validated: 'Validé',
  done: 'Terminé',
  late: 'Échéance passée, non terminé',
  current: 'En cours',
  past: 'Passé',
  upcoming: 'À venir',
};

export const today = () => new Date().toISOString().slice(0, 10);
export function nextMilestone(day = today()) {
  return milestones.findIndex((m) => m.date >= day);
}
export function milestoneStatus(
  index: number,
  state: TaskState | undefined,
  day = today(),
): MilestoneStatus {
  const m = milestones[index];
  const statuses = state ? m.tasks.map((id) => statusOf(state, id)) : [];
  if (m.tasks.length && statuses.length) {
    if (statuses.every((s) => s === 'validated')) return 'validated';
    if (statuses.every((s) => s !== 'todo')) return 'done';
  }
  if (index === nextMilestone(day)) return 'current';
  if (m.date < day) return m.tasks.length ? 'late' : 'past';
  return 'upcoming';
}
export function progress(state: TaskState | undefined) {
  if (!state) return 0;
  const finished = tasks.filter((t) => statusOf(state, t.id) !== 'todo');
  return Math.round((finished.length / tasks.length) * 100);
}
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
// Part de la période du projet écoulée, de 0 (lancement) à 1 (échéance finale).
export function timeProgress(day = today()) {
  const start = Date.parse(milestones[0].date);
  const end = Date.parse(milestones[milestones.length - 1].date);
  return Math.min(1, Math.max(0, (Date.parse(day) - start) / (end - start)));
}

export interface BriefCard {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  size: 'wide' | 'small';
  paragraphs?: string[];
  items?: string[];
  columns?: boolean;
}
export const briefCards: BriefCard[] = [
  {
    id: 'sujet',
    emoji: '🌋',
    title: 'Sujet et problématique',
    summary:
      'App de prévention et de gestion des risques naturels en Martinique.',
    size: 'wide',
    paragraphs: [
      'Comment intégrer la prévention des risques naturels au quotidien des Martiniquais, sans générer d’anxiété, tout en facilitant la préparation et la décision en urgence ?',
      'Constat : informations officielles dispersées (Préfecture, Météo-France, OVSM-IPGP) et bons réflexes mal connus. Risques : cyclones, séismes, tsunamis, fortes pluies, montagne Pelée, brumes de sable, sargasses.',
    ],
  },
  {
    id: 'objectifs',
    emoji: '🎯',
    title: 'Objectifs',
    summary: 'Avant, pendant et après une catastrophe.',
    size: 'small',
    items: [
      'Information fiable, centralisée et compréhensible.',
      'Préparation progressive : réflexes, kit d’urgence, évacuation.',
      'Urgence : consignes, zones et actions prioritaires.',
      'Après : eau, alimentation, santé, démarches.',
    ],
  },
  {
    id: 'cibles',
    emoji: '👥',
    title: 'Cibles',
    summary: 'Habitants du Nord, du Centre et du Sud.',
    size: 'small',
    items: [
      'Familles, personnes âgées, personnes en situation de handicap.',
      'Personnes peu à l’aise avec le numérique.',
      'Touristes et nouveaux arrivants.',
      'Interface inclusive, lisible même sous stress.',
    ],
  },
  {
    id: 'fonctionnalites',
    emoji: '🧩',
    title: 'Fonctionnalités',
    summary: '10 pistes, à confirmer par la recherche utilisateurs.',
    size: 'wide',
    columns: true,
    items: [
      'Tableau de bord et vigilances',
      'Carte des zones, abris, rassemblements',
      'Évacuation et itinéraires officiels',
      'Préparation : checklists, kit, réflexes',
      'Sécurité des proches',
      'Mode urgence, en partie hors ligne',
      'Alertes par commune',
      'Indicateur de préparation',
      'Accompagnement après catastrophe',
      'Téléchargement hors ligne daté',
    ],
  },
  {
    id: 'ux',
    emoji: '🎨',
    title: 'Intentions UX/UI',
    summary: 'Rassurant au quotidien, direct en urgence.',
    size: 'small',
    items: [
      'Quotidien : navigation intuitive, identité martiniquaise.',
      'Urgence : messages courts, hiérarchie claire, peu d’actions.',
      'Charge cognitive réduite, confiance.',
    ],
  },
  {
    id: 'support',
    emoji: '📱',
    title: 'Support',
    summary: 'iOS · iPhone et iPad.',
    size: 'small',
    paragraphs: [
      'Démarche centrée utilisateurs : recherche, parcours, Design System, maquettes et prototype interactif testé.',
    ],
  },
  {
    id: 'livrables',
    emoji: '📦',
    title: 'Livrables',
    summary: 'Cadrage puis Design System.',
    size: 'wide',
    items: [
      'Note puis document de cadrage.',
      'Charte : typographies, couleurs, icônes, pictos.',
      'Primitives et tokens, layouts par écran.',
      'Composants fonctionnels.',
      'Critères C3.2, C3.3, C3.4, C3.5.',
    ],
  },
  {
    id: 'contraintes',
    emoji: '⚠️',
    title: 'Contraintes',
    summary: 'Hors ligne · RGPD · accessibilité.',
    size: 'wide',
    items: [
      'Coupures réseau : contenus consultables hors ligne, datés.',
      'Données personnelles : géolocalisation, partage aux proches.',
      'Accessibilité, SEO, compatibilité OS (cadrage).',
      'Ne pas remplacer les organismes officiels.',
    ],
  },
  {
    id: 'tests',
    emoji: '🧪',
    title: 'Tests utilisateurs',
    summary: 'Tester le risqué et le critique, pas tout.',
    size: 'wide',
    paragraphs: [
      '4 critères notés de 1 à 5 : importance, incertitude, risque, impact. 16–20 P1 · 11–15 P2 · 6–10 P3 · 1–5 P4.',
    ],
  },
];

// Contexte texte en lecture seule, utilisé par l'assistant.
export function briefAsText(state: TaskState | undefined, day = today()) {
  const lines = [
    '## Brief du projet (synthèse Notion)',
    ...briefCards.map((c) =>
      [
        `### ${c.title}`,
        c.summary,
        ...(c.paragraphs ?? []),
        ...(c.items ?? []).map((i) => `- ${i}`),
      ].join('\n'),
    ),
    '## Planning',
    ...milestones.map(
      (m, i) =>
        `- ${m.label} (${m.date}) · ${m.title} · ${m.detail} · statut : ${milestoneLabels[milestoneStatus(i, state, day)]}`,
    ),
    '## Checklist',
    ...tasks.map(
      (t) =>
        `- ${t.label}${t.due ? ` (échéance ${t.due})` : ''} · ${state ? statusLabels[statusOf(state, t.id)] : statusLabels[t.initial]}`,
    ),
  ];
  return lines.join('\n');
}

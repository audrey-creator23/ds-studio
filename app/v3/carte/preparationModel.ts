import { kitBase, kitNeeds, risks } from './risks.js';

export type Kit = {
  adults: number;
  children: number;
  needs: string[];
  done: string[];
};
export const emptyKit: Kit = { adults: 1, children: 0, needs: [], done: [] };
export const planKey = 'ds-v3-plan';
export const kitKey = 'ds-v3-trousse';
export const guideKey = 'ds-v3-preparation';
export type PersonalPlan = Record<string, string>;
export function kitItems(kit: Kit) {
  const people = Math.max(1, kit.adults + kit.children);
  return [
    ...kitBase.map((k) => ({
      id: k.id,
      label:
        'perPerson' in k
          ? `${k.label} : ${k.perPerson! * people} ${k.unit} (${k.perPerson} ${k.unit} × ${people} pers.)`
          : k.label,
      group: 'Socle commun',
    })),
    ...kitNeeds
      .filter((n) => kit.needs.includes(n.id))
      .flatMap((n) =>
        n.items.map((label) => ({
          id: `${n.id}:${label}`,
          label,
          group: n.label,
        })),
      ),
    ...risks.flatMap((r) =>
      r.kit.map((label) => ({ id: `${r.id}:${label}`, label, group: r.label })),
    ),
  ];
}
export const guideSteps = [
  {
    id: 'offline',
    title: 'Ressources hors ligne',
    help: 'Gardez vos consignes et vos contacts à portée de main.',
    why: 'Le réseau peut être coupé. Téléchargez les ressources pendant qu’il est disponible.',
  },
  {
    id: 'foyer',
    title: 'Mon foyer',
    help: 'Adaptez la préparation aux personnes qui comptent sur vous.',
    why: 'Les quantités et les besoins changent selon votre foyer : enfants, bébés, animaux ou traitements.',
  },
  {
    id: 'proches',
    title: 'Mes proches & point de ralliement',
    help: 'Décidez ensemble comment vous retrouver et vous donner des nouvelles.',
    why: 'Un contact et un rendez-vous convenus évitent de chercher ces informations dans l’urgence.',
  },
  {
    id: 'trousse',
    title: 'Trousse d’urgence',
    help: 'Préparez votre autonomie pour les premières 72 heures.',
    why: 'Votre checklist reste disponible ici. Cochez uniquement ce qui est réellement prêt.',
  },
  {
    id: 'exposition',
    title: 'Exposition & évacuation',
    help: 'Retrouvez les consignes officielles pour votre secteur.',
    why: 'Une adresse ou une simulation ne détermine jamais un itinéraire d’évacuation ni un abri sûr.',
  },
  {
    id: 'information',
    title: 'Moyens d’information',
    help: 'Notez les moyens confirmés pour rester informé.',
    why: 'Une radio et des contacts vérifiés restent utiles lorsque le réseau est dégradé.',
  },
  {
    id: 'resume',
    title: 'Récapitulatif',
    help: 'Relisez votre plan, repérez les manques et revenez le compléter.',
    why: 'Un plan préparé doit rester à jour et connu de votre foyer. Ce suivi ne garantit pas votre sécurité.',
  },
] as const;
export type GuideId = (typeof guideSteps)[number]['id'];
export type Guide = {
  started: boolean;
  active: GuideId;
  validated: Partial<Record<GuideId, string>>;
  skipped: GuideId[];
};
export const emptyGuide: Guide = {
  started: false,
  active: 'offline',
  validated: {},
  skipped: [],
};
export type Preparation = {
  plan: PersonalPlan;
  kit: Kit;
  home: { label: string; lat: number; lon: number } | null;
  cached: string[];
};
// Les anciennes données préremplissent les formulaires, sans inventer de
// validation. Une modification invalide la validation de l'étape concernée.
export function signature(id: GuideId, d: Preparation): string {
  const fields = (keys: string[]) => keys.map((k) => d.plan[k] ?? '');
  switch (id) {
    case 'offline':
      return JSON.stringify([...d.cached].sort());
    case 'foyer':
      return JSON.stringify([
        d.kit.adults,
        d.kit.children,
        [...d.kit.needs].sort(),
      ]);
    case 'proches':
      return JSON.stringify(
        fields(['contactNom', 'contactTel', 'ralliement', 'partage']),
      );
    case 'trousse':
      return JSON.stringify([signature('foyer', d), [...d.kit.done].sort()]);
    case 'exposition':
      return JSON.stringify([
        d.home,
        fields(['evacuation', 'rassemblement', 'evacuationSource']),
      ]);
    case 'information':
      return JSON.stringify(fields(['pc', 'radio', 'infoSource']));
    case 'resume':
      return JSON.stringify(
        guideSteps.slice(0, 6).map((s) => signature(s.id, d)),
      );
  }
}
const filled = (d: Preparation, keys: string[]) =>
  keys.every((k) => !!d.plan[k]?.trim());
const officialSource = (s: string | undefined) => {
  try {
    const u = new URL(s ?? '');
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.gouv.fr') || u.hostname === 'gouv.fr')
    );
  } catch {
    return false;
  }
};
export function ready(id: GuideId, d: Preparation): boolean {
  switch (id) {
    case 'offline':
      return ['relief', 'consignes', 'contacts', 'trousse'].every((k) =>
        d.cached.includes(k),
      );
    case 'foyer':
      return (
        Number.isInteger(d.kit.adults) &&
        d.kit.adults >= 1 &&
        d.kit.adults <= 12 &&
        Number.isInteger(d.kit.children) &&
        d.kit.children >= 0 &&
        d.kit.children <= 12
      );
    case 'proches':
      return (
        filled(d, ['contactNom', 'contactTel', 'ralliement']) &&
        /^\+?[\d\s().-]{6,24}$/.test(d.plan.contactTel)
      );
    case 'trousse':
      return (
        ready('foyer', d) &&
        kitItems(d.kit).every((k) => d.kit.done.includes(k.id))
      );
    case 'exposition':
      return (
        !!d.home &&
        filled(d, ['evacuation', 'rassemblement']) &&
        officialSource(d.plan.evacuationSource)
      );
    case 'information':
      return filled(d, ['radio']) && officialSource(d.plan.infoSource);
    case 'resume':
      return guideSteps.slice(0, 6).every((s) => ready(s.id, d));
  }
}
export function complete(id: GuideId, guide: Guide, d: Preparation): boolean {
  return (
    ready(id, d) &&
    guide.validated[id] === signature(id, d) &&
    (id !== 'resume' ||
      guideSteps.slice(0, 6).every((s) => complete(s.id, guide, d)))
  );
}

import { z } from 'zod';
import { statusOf, type TaskId, type TaskState } from './tasks.js';

// Étapes du PFE (v3) : un statut par étape, choisi à la main, source unique
// de la checklist et des rendus du Dashboard. Données privées, hors Git.
export const stepIds = [
  'presentation',
  'problematique',
  'objectifs',
  'publics',
  'solution',
  'ux',
  'perimetre',
  'methode',
  'livrables',
  'echeances',
] as const;
export type StepId = (typeof stepIds)[number];
export const stepStatuses = [
  'todo',
  'doing',
  'rework',
  'done',
  'validated',
] as const;
export type StepStatus = (typeof stepStatuses)[number];
export const stepLabels: Record<StepStatus, string> = {
  todo: 'À faire',
  doing: 'En cours',
  rework: 'À retravailler',
  done: 'Fait',
  validated: 'Validé par le prof',
};
export const stepDone = (s: StepStatus) => s === 'done' || s === 'validated';
// Un rendu n'est acquis qu'une fois validé par le prof : « Fait » (remis,
// en attente) ou « À retravailler » le laissent dans les rendus restants.
export const renduAcquired = (s: StepStatus) => s === 'validated';
// Tâches liées (reprise des anciens statuts quand l'étape n'a pas encore de
// statut propre).
export const stepTasks: Record<StepId, TaskId[]> = {
  presentation: ['intention'],
  problematique: ['intention', 'contexte'],
  objectifs: ['contexte'],
  publics: ['contexte', 'recherche'],
  solution: ['fonctionnel'],
  ux: ['prototype'],
  perimetre: ['technique'],
  methode: ['recherche', 'tests'],
  livrables: ['validation', 'design-system', 'prototype'],
  echeances: [],
};

const note = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    text: z.string().max(2000),
    color: z.enum(['1', '3', '5', '7', '9']),
    pinned: z.boolean(),
    remindAt: z.string().datetime().nullable(),
    remindedAt: z.string().datetime().nullable(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type Note = z.infer<typeof note>;
export const userDataSchema = z
  .object({
    steps: z.partialRecord(z.enum(stepIds), z.enum(stepStatuses)).default({}),
    ideas: z
      .partialRecord(z.enum(stepIds), z.array(z.string().max(300)).max(20))
      .default({}),
    notes: z.array(note).max(200).default([]),
  })
  .strict();
export type UserData = z.infer<typeof userDataSchema>;
export const userDataUpdate = z.discriminatedUnion('key', [
  z.object({ key: z.literal('steps'), value: userDataSchema.shape.steps }),
  z.object({ key: z.literal('ideas'), value: userDataSchema.shape.ideas }),
  z.object({ key: z.literal('notes'), value: userDataSchema.shape.notes }),
]);

// Statut effectif : propre à l'étape, sinon « En cours » si une tâche liée
// a démarré, sinon « À faire ».
export function stepStatus(
  data: UserData | undefined,
  tasks: TaskState | undefined,
  id: StepId,
): StepStatus {
  const own = data?.steps[id];
  if (own) return own;
  const linked = stepTasks[id];
  if (!tasks || !linked.length) return 'todo';
  // Les anciennes tâches indiquent un avancement, jamais un rendu effectué :
  // « Fait » / « Validé » se déclarent uniquement dans les Étapes du PFE.
  const all = linked.map((t) => statusOf(tasks, t));
  return all.some((s) => s !== 'todo') ? 'doing' : 'todo';
}

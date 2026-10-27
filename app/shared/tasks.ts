import { z } from 'zod';

// Tâches du PFE, tirées du brief Notion et de la note d'intention (lecture seule).
// Seuls les statuts sont modifiables ; ils restent sur ce poste.
export const taskStatuses = ['todo', 'done', 'validated'] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const statusLabels: Record<TaskStatus, string> = {
  todo: 'À faire',
  done: 'Fait',
  validated: 'Validé par le prof',
};

export const tasks = [
  {
    id: 'intention',
    label: 'Note d’intention / note de cadrage',
    due: '13 nov.',
    initial: 'done',
  },
  {
    id: 'validation',
    label: 'Validation du sujet PFE',
    due: '13 nov.',
    initial: 'todo',
  },
  {
    id: 'contexte',
    label: 'Cadrage : contexte sectoriel, existant, cibles',
    due: '29 janv.',
    initial: 'todo',
  },
  {
    id: 'fonctionnel',
    label: 'Spécifications fonctionnelles et user flows',
    due: '29 janv.',
    initial: 'todo',
  },
  {
    id: 'technique',
    label: 'Accessibilité, SEO, RGPD et compatibilité iOS',
    due: '29 janv.',
    initial: 'todo',
  },
  {
    id: 'recherche',
    label: 'Recherche utilisateurs',
    due: '',
    initial: 'todo',
  },
  {
    id: 'design-system',
    label: 'Design System : charte, tokens, layouts, composants',
    due: '12 mars',
    initial: 'todo',
  },
  {
    id: 'prototype',
    label: 'Maquettes et prototype interactif iPhone / iPad',
    due: '',
    initial: 'todo',
  },
  {
    id: 'tests',
    label: 'Tests utilisateurs priorisés (P1 à P4)',
    due: '',
    initial: 'todo',
  },
] as const satisfies readonly {
  id: string;
  label: string;
  due: string;
  initial: TaskStatus;
}[];
export type TaskId = (typeof tasks)[number]['id'];
const taskIds = tasks.map((t) => t.id) as [TaskId, ...TaskId[]];

export const taskStateSchema = z
  .object({
    statuses: z
      .partialRecord(z.enum(taskIds), z.enum(taskStatuses))
      .default({}),
  })
  .strict();
export type TaskState = z.infer<typeof taskStateSchema>;
export const taskUpdateSchema = z
  .object({ id: z.enum(taskIds), status: z.enum(taskStatuses) })
  .strict();

export function statusOf(state: TaskState, id: TaskId): TaskStatus {
  return state.statuses[id] ?? tasks.find((t) => t.id === id)!.initial;
}

import { Badge, Group, Progress } from '@mantine/core';
import type { TaskState } from '../shared/tasks.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
  type TaskStatus,
} from '../shared/tasks.js';

// Composants Mantine personnalisés du chrome, partagés par toutes les pages.
// Les couleurs viennent du thème (app/client/theme.ts), jamais d'ici.

export const statusColors: Record<TaskStatus, string> = {
  todo: 'neutral',
  doing: 'yellow',
  done: 'accent',
  validated: 'green',
};

export function TaskProgress({
  value,
  label = 'Tâches faites ou validées',
  tone = 'accent.5',
}: {
  value: number;
  label?: string;
  tone?: string;
}) {
  return (
    <Progress
      className="ui-progress"
      value={value}
      color={tone}
      size="md"
      radius="sm"
      aria-label={label}
      transitionDuration={300}
    />
  );
}

export function StatusTag({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) {
  return (
    <Badge
      className="ui-status"
      variant="light"
      color={statusColors[status]}
      size="lg"
      tt="none"
      fw={500}
    >
      {children}
    </Badge>
  );
}

// Décompte des tâches par statut : une ligne de badges.
export function StatusSummary({ state }: { state?: TaskState }) {
  return (
    <Group className="status-summary" gap={6}>
      {taskStatuses.map((s) => (
        <StatusTag key={s} status={s}>
          {statusLabels[s]} ·{' '}
          {state ? tasks.filter((t) => statusOf(state, t.id) === s).length : 0}
        </StatusTag>
      ))}
    </Group>
  );
}

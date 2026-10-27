import type { CSSProperties } from 'react';
import {
  daysBetween,
  milestoneLabels,
  milestones,
  timeProgress,
  type MilestoneStatus,
} from '../shared/brief.js';
import { Badge, type BadgeVariant } from './ui.js';

// Frise des jalons partagée (Dashboard, Brief) : pas réguliers, rail rempli
// jusqu'à la date affichée. Avec `onSelect`, chaque jalon prévisualise sa date.
const statusBadge: Record<MilestoneStatus, BadgeVariant> = {
  validated: 'default',
  done: 'secondary',
  current: 'outline',
  late: 'destructive',
  past: 'outline',
  upcoming: 'outline',
};
// Rampe --chart-1 → 5 : plus l'activité monte, plus la teinte est soutenue.
export const chartOf = (a: number) =>
  `var(--chart-${Math.min(5, 1 + Math.floor(a * 5))})`;
export const short = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
function railFill(day: string) {
  const n = milestones.length - 1;
  for (let i = 0; i < n; i++) {
    const a = milestones[i].date;
    const b = milestones[i + 1].date;
    if (day <= b) {
      const t = day <= a ? 0 : daysBetween(a, day) / daysBetween(a, b);
      return ((i + t) / n) * 100;
    }
  }
  return 100;
}

export default function Timeline({
  day,
  statuses,
  selected,
  onSelect,
  details = false,
}: {
  day: string;
  statuses: MilestoneStatus[];
  selected?: string;
  onSelect?: (date: string) => void;
  details?: boolean;
}) {
  return (
    <div className="timeline">
      <div className="timeline-rail" aria-hidden="true">
        <span style={{ width: `${railFill(day)}%` }} />
      </div>
      <ol>
        {milestones.map((m, i) => {
          const body = (
            <>
              <span className="dot" aria-hidden="true" />
              <time dateTime={m.date}>{short(m.date)}</time>
              <strong>{m.title}</strong>
              <Badge variant={statusBadge[statuses[i]]}>
                {milestoneLabels[statuses[i]]}
              </Badge>
              {details && <small className="timeline-detail">{m.detail}</small>}
            </>
          );
          return (
            <li
              key={m.date}
              style={
                { '--tone': chartOf(timeProgress(m.date)) } as CSSProperties
              }
            >
              {onSelect ? (
                <button
                  type="button"
                  className="timeline-item"
                  aria-pressed={selected === m.date}
                  aria-label={`${m.title}, ${short(m.date)}, ${milestoneLabels[statuses[i]]} : prévisualiser l’activité`}
                  onClick={() => onSelect(m.date)}
                >
                  {body}
                </button>
              ) : (
                <div className="timeline-item">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

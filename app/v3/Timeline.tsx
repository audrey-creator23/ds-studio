import type { CSSProperties } from 'react';
import { daysBetween, milestones } from '../shared/brief.js';
import { Badge } from './ui.js';

// Frise des jalons : pas réguliers, rail rempli jusqu'à la date affichée.
// États temporels seulement (Passé / À venir) : une date passée ne vaut pas
// validation. Avec `onSelect`, chaque jalon prévisualise sa date.
// Proximité : le prochain jalon est rouge, le plus lointain jaune (palette
// --accent-1 → 9) ; un jalon passé est atténué (passé ≠ terminé).
function toneOf(date: string, today: string) {
  const upcoming = milestones.filter((m) => m.date >= today);
  const rank = upcoming.findIndex((m) => m.date === date);
  if (rank < 0) return 'var(--muted-foreground)';
  const step = upcoming.length > 1 ? (8 * rank) / (upcoming.length - 1) : 0;
  return `var(--accent-${9 - Math.round(step)})`;
}
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
  today,
  selected,
  onSelect,
}: {
  day: string;
  today: string;
  selected?: string;
  onSelect?: (date: string) => void;
}) {
  return (
    <div className="timeline">
      <div className="timeline-rail" aria-hidden="true">
        <span style={{ width: `${railFill(day)}%` }} />
      </div>
      <ol>
        {milestones.map((m) => {
          const past = m.date < today;
          const label = past ? 'Passé' : 'À venir';
          const body = (
            <>
              <span className="dot" aria-hidden="true" />
              <time dateTime={m.date}>{short(m.date)}</time>
              <strong>{m.title}</strong>
              <Badge variant={past ? 'outline' : 'default'}>{label}</Badge>
            </>
          );
          return (
            <li
              key={m.date}
              data-time={past ? 'past' : 'upcoming'}
              style={{ '--tone': toneOf(m.date, today) } as CSSProperties}
            >
              {onSelect ? (
                <button
                  type="button"
                  className="timeline-item"
                  aria-pressed={selected === m.date}
                  aria-label={`${m.title}, ${short(m.date)}, ${label} : aperçu du volcan`}
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

import { useState } from 'react';
import { SegmentedControl } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { StatusSummary, TaskProgress } from './ui.js';
import { useTasks } from './useTasks.js';
import { Card } from './Card.js';
import Masonry from './Masonry.js';
import Volcano, { levelOf, type VolcanoQuality } from './Volcano.js';
import type { Page } from './Sidebar.js';
import {
  daysBetween,
  milestoneLabels,
  milestoneStatus,
  milestones,
  nextMilestone,
  progress,
  timeProgress,
  today,
} from '../shared/brief.js';
import { statusOf, tasks } from '../shared/tasks.js';
import { tokenKeys, type Tokens } from '../shared/model.js';

const start = milestones[0].date;
const end = milestones[milestones.length - 1].date;
const days = daysBetween;

export default function VolcanoDashboard({
  tokens,
  onPage,
}: {
  tokens: Tokens;
  onPage: (page: Page) => void;
}) {
  const { state, error } = useTasks();
  const now = today();
  const [day, setDay] = useState(now);
  const [quality, setQuality] = useLocalStorage<VolcanoQuality>({
    key: 'ds-studio-volcano-quality',
    defaultValue: 'realistic',
    getInitialValueInEffect: false,
  });
  // Intensité du volcan : dates du projet. Avancement : tâches réalisées.
  const intensity = timeProgress(day);
  const done = progress(state);
  const next = nextMilestone(now);
  const statuses = milestones.map((_, i) => milestoneStatus(i, state, now));
  const finished = statuses.filter(
    (s) => s === 'done' || s === 'validated',
  ).length;
  const late = statuses.filter((s) => s === 'late').length;
  const elapsed = Math.max(0, days(start, now));
  const total = days(start, end);
  return (
    <section className="page volcano-page" aria-labelledby="volcan-title">
      <header className="page-head">
        <div>
          <h2 id="volcan-title" tabIndex={-1}>
            Dashboard Volcan
          </h2>
          <p>
            Le volcan s’intensifie avec les dates du PFE, jusqu’à l’éruption du{' '}
            {milestones[milestones.length - 1].label}.
          </p>
        </div>
        <SegmentedControl
          className="volcano-quality"
          aria-label="Rendu du volcan"
          value={quality}
          onChange={(v) => setQuality(v as VolcanoQuality)}
          data={[
            { value: 'realistic', label: 'Réaliste' },
            { value: 'light', label: 'Léger' },
          ]}
        />
        <dl className="page-kpis">
          <div>
            <dt>Avancement du projet</dt>
            <dd>{state ? `${done} %` : '…'}</dd>
          </div>
        </dl>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="volcano-layout">
        <article className="volcano-hero">
          <Volcano activity={intensity} quality={quality} />
          <p className="volcano-level">
            Intensité · {levelOf(intensity)}
            {day !== now && ` · au ${day}`}
          </p>
          <div className="volcano-track">
            <div
              className="volcano-fill"
              style={{ width: `${intensity * 100}%` }}
            />
            <ol>
              {milestones.map((m, i) => (
                <li
                  key={m.date}
                  className={`is-${statuses[i]}`}
                  style={{ left: `${timeProgress(m.date) * 100}%` }}
                >
                  <button
                    onClick={() => setDay(m.date)}
                    aria-pressed={day === m.date}
                    aria-label={`${m.label} · ${m.title} · ${milestoneLabels[statuses[i]]} : prévisualiser l’intensité`}
                  >
                    <span className="timeline-dot" aria-hidden="true" />
                    <time dateTime={m.date}>{m.label}</time>
                    <strong>{m.title}</strong>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          {day !== now && (
            <p className="volcano-preview" role="status">
              <button onClick={() => setDay(now)}>Revenir à aujourd’hui</button>
            </p>
          )}
        </article>
        <Masonry className="volcano-cards">
          <Card emoji="✅" title="Tâches" className="size-full">
            <p className="card-figure">{state ? `${done} %` : '…'}</p>
            <TaskProgress value={done} />
            <StatusSummary state={state} />
            {state && (
              <>
                <p className="card-subtitle">À faire ensuite</p>
                <ul className="card-list">
                  {tasks
                    .filter((t) => statusOf(state, t.id) === 'todo')
                    .slice(0, 3)
                    .map((t) => (
                      <li key={t.id}>
                        {t.label}
                        {t.due && <small> · {t.due}</small>}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </Card>
          <Card emoji="🎯" title="Prochaine échéance" className="size-half">
            {next >= 0 ? (
              <>
                <p className="card-figure">
                  J-{days(now, milestones[next].date)}
                </p>
                <p className="card-summary">
                  {milestones[next].label} · {milestones[next].title} ·{' '}
                  {milestoneLabels[statuses[next]]}
                </p>
              </>
            ) : (
              <p className="card-figure">Terminé</p>
            )}
          </Card>
          <Card emoji="⏳" title="Période" className="size-half">
            <p className="card-figure">
              {elapsed}/{total} j
            </p>
            <p className="card-summary">
              {milestones[0].label} → {milestones[milestones.length - 1].label}{' '}
              · {Math.max(0, total - elapsed)} jours restants
            </p>
          </Card>
          <Card emoji="📊" title="Indicateurs clés" className="size-half">
            <ul className="card-list">
              <li>
                <strong>
                  {finished}/{milestones.length}
                </strong>{' '}
                jalons terminés
              </li>
              <li>
                <strong>{late}</strong> jalon(s) en retard
              </li>
              <li>
                <strong>{tokenKeys.length}</strong> tokens · marque{' '}
                <span
                  className="swatch"
                  style={{ background: String(tokens['color.brand'].$value) }}
                  aria-hidden="true"
                />{' '}
                {tokens['color.brand'].$value}
              </li>
            </ul>
          </Card>
          <Card emoji="🧭" title="Accès aux pages" className="size-half">
            <ul className="card-list card-links">
              {(
                [
                  ['workshop', 'Atelier Design System'],
                  ['assistant', 'Contexte & Assistant'],
                  ['brief', 'Brief du projet'],
                ] as const
              ).map(([id, label]) => (
                <li key={id}>
                  <button onClick={() => onPage(id)}>{label}</button>
                </li>
              ))}
            </ul>
          </Card>
        </Masonry>
      </div>
    </section>
  );
}

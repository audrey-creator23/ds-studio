import { Card, Expandable, Toggle } from './Card.js';
import { useTasks } from './useTasks.js';
import Masonry from './Masonry.js';
import {
  briefCards,
  briefSources,
  milestoneLabels,
  milestoneStatus,
  milestones,
  nextMilestone,
  progress,
} from '../shared/brief.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
  type TaskStatus,
} from '../shared/tasks.js';

export function Timeline({
  state,
}: {
  state: Parameters<typeof milestoneStatus>[1];
}) {
  return (
    <ol className="timeline">
      {milestones.map((m, i) => {
        const status = milestoneStatus(i, state);
        return (
          <li
            key={m.date}
            className={`is-${status}`}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            <span className="timeline-dot" aria-hidden="true" />
            <time dateTime={m.date}>{m.label}</time>
            <strong>{m.title}</strong>
            <span className="sr-only">{milestoneLabels[status]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineLegend() {
  return (
    <ul className="timeline-legend" aria-label="Légende">
      {(['validated', 'done', 'current', 'late', 'upcoming'] as const).map(
        (s) => (
          <li key={s} className={`is-${s}`}>
            <span className="timeline-dot" aria-hidden="true" />
            {milestoneLabels[s]}
          </li>
        ),
      )}
    </ul>
  );
}

export default function ProjectContent() {
  const { state, error, update } = useTasks();
  const counts = Object.fromEntries(
    taskStatuses.map((s) => [
      s,
      state ? tasks.filter((t) => statusOf(state, t.id) === s).length : 0,
    ]),
  ) as Record<TaskStatus, number>;
  const done = progress(state);
  const next = nextMilestone();
  return (
    <section className="page brief-page" aria-labelledby="projet-title">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">PFE M2 UX/UI · 2026-27</p>
          <h2 id="projet-title" tabIndex={-1}>
            Brief du projet
          </h2>
        </div>
        <dl className="page-kpis">
          <div>
            <dt>Avancement</dt>
            <dd>{state ? `${done} %` : '…'}</dd>
          </div>
          <div>
            <dt>Prochaine échéance</dt>
            <dd>
              {next >= 0
                ? `${milestones[next].label} · ${milestones[next].title}`
                : 'Planning terminé'}
            </dd>
          </div>
        </dl>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Masonry className="brief-grid">
        <Card emoji="📅" title="Planning" className="size-full">
          <Timeline state={state} />
          <Expandable label="Détail des échéances" aside={<TimelineLegend />}>
            <ul>
              {milestones.map((m) => (
                <li key={m.date}>
                  <strong>{m.label}</strong> · {m.detail}
                </li>
              ))}
            </ul>
          </Expandable>
        </Card>
        <Card emoji="✅" title="Checklist" className="size-m brief-tasks">
          <div
            className="progress"
            role="progressbar"
            aria-label="Tâches faites ou validées"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${done}%` }} />
          </div>
          <p className="status-summary">
            {taskStatuses.map((s) => (
              <span key={s} className={`status-tag status-${s}`}>
                {statusLabels[s]} · {counts[s]}
              </span>
            ))}
          </p>
          <Toggle label={`Voir les ${tasks.length} tâches`}>
            <p className="task-note">
              Statuts enregistrés sur ce poste uniquement.
            </p>
            <ul className="task-list">
              {tasks.map((t) => {
                const status = state ? statusOf(state, t.id) : t.initial;
                return (
                  <li key={t.id}>
                    <span>
                      {t.label}
                      {t.due && <small> · {t.due}</small>}
                    </span>
                    <select
                      className={`status-tag status-${status}`}
                      aria-label={`Statut : ${t.label}`}
                      value={status}
                      disabled={!state}
                      onChange={(e) =>
                        void update(t.id, e.target.value as TaskStatus)
                      }
                    >
                      {taskStatuses.map((s) => (
                        <option key={s} value={s}>
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </Toggle>
        </Card>
        {briefCards.map((c) => (
          <Card
            key={c.id}
            emoji={c.emoji}
            title={c.title}
            className={c.size === 'wide' ? 'size-m' : 'size-s'}
          >
            <p className="card-summary">{c.summary}</p>
            <Toggle label="Détails">
              {c.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {c.items && (
                <ul className={c.columns ? 'brief-columns' : undefined}>
                  {c.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </Toggle>
          </Card>
        ))}
      </Masonry>
      <p className="page-source">
        Synthèse Notion, consultée sans modification :{' '}
        {briefSources.map((src, i) => (
          <span key={src.url}>
            {i > 0 && ' · '}
            <a href={src.url} target="_blank" rel="noreferrer">
              {src.label}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}

import { Card, Surface, Toggle } from './Card.js';
import { StatusSummary, TaskProgress } from './ui.js';
import { statusOf, tasks } from '../shared/tasks.js';
import Masonry from './Masonry.js';
import { useTasks } from './useTasks.js';
import type { Page } from './Sidebar.js';
import {
  briefSources,
  daysBetween,
  milestoneLabels,
  milestoneStatus,
  milestones,
  nextMilestone,
  progress,
  timeProgress,
  today,
} from '../shared/brief.js';

// Accueil : chaque indicateur n'apparaît qu'une fois, à l'endroit le plus utile.
const destinations: {
  page: Page;
  emoji: string;
  title: string;
  description: string;
}[] = [
  {
    page: 'workshop',
    emoji: '🎨',
    title: 'Design',
    description: 'Tokens, composants et aperçu en direct',
  },
  {
    page: 'brief',
    emoji: '📋',
    title: 'Brief',
    description: 'Planning, cadrage et checklist',
  },
  {
    page: 'assistant',
    emoji: '💬',
    title: 'Assistant',
    description: 'Interroger Claude sur le projet',
  },
  {
    page: 'volcano',
    emoji: '🌋',
    title: 'Volcan',
    description: 'Voir le projet monter en intensité',
  },
];

export default function HomePage({ onPage }: { onPage: (p: Page) => void }) {
  const { state, error } = useTasks();
  const now = today();
  const next = nextMilestone(now);
  const statuses = milestones.map((_, i) => milestoneStatus(i, state, now));
  const late = milestones.filter((_, i) => statuses[i] === 'late');
  const done = progress(state);
  const remaining = Math.max(
    0,
    daysBetween(now, milestones[milestones.length - 1].date),
  );
  const urgent =
    next >= 0 && state
      ? milestones[next].tasks.filter((id) => statusOf(state, id) === 'todo')
      : [];
  return (
    <section className="page home-page" aria-labelledby="home-title">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">PFE M2 UX/UI · 2026-27</p>
          <h2 id="home-title" tabIndex={-1}>
            Tableau de bord
          </h2>
        </div>
        <div className="home-cta">
          <a
            className="cta cta-primary"
            href={briefSources[0].url}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir le brief du prof <span aria-hidden="true">↗</span>
          </a>
          <a
            className="cta"
            href={briefSources[1].url}
            target="_blank"
            rel="noreferrer"
          >
            Accéder à mon Notion <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Masonry className="home-grid">
        <Card emoji="✅" title="Avancement" className="size-m">
          <p className="card-figure">{state ? `${done} %` : '…'}</p>
          <TaskProgress value={done} />
          <StatusSummary state={state} />
          <Toggle label={`Voir les ${milestones.length} jalons`}>
            <ul className="card-list">
              {milestones.map((m, i) => (
                <li key={m.date}>
                  {m.label} · {m.title}{' '}
                  <small>· {milestoneLabels[statuses[i]]}</small>
                </li>
              ))}
            </ul>
          </Toggle>
        </Card>
        <Card emoji="🎯" title="Prochaine échéance" className="size-m">
          {next >= 0 ? (
            <>
              <p className="card-figure">
                J-{daysBetween(now, milestones[next].date)}
              </p>
              <p className="card-summary">
                <strong>{milestones[next].title}</strong> ·{' '}
                {milestones[next].label}
              </p>
              <p className="card-subtitle">À faire avant</p>
              {urgent.length ? (
                <ul className="card-list">
                  {urgent.map((id) => (
                    <li key={id}>{tasks.find((t) => t.id === id)!.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="card-summary">Rien en attente.</p>
              )}
              <button
                type="button"
                className="card-action"
                onClick={() => onPage('brief')}
              >
                Mettre à jour la checklist
              </button>
            </>
          ) : (
            <p className="card-figure">Planning terminé</p>
          )}
        </Card>
        <Card emoji="⏳" title="Temps restant" className="size-m">
          <p className="card-figure">{remaining} jours</p>
          <TaskProgress
            value={Math.round(timeProgress(now) * 100)}
            label="Période écoulée"
            tone="neutral.4"
          />
          <p className="card-summary">
            Du {milestones[0].label} au{' '}
            {milestones[milestones.length - 1].label}
          </p>
          <p className="card-subtitle">Alertes</p>
          {late.length ? (
            <ul className="card-list home-alerts">
              {late.map((m) => (
                <li key={m.date}>
                  {m.title} : échéance du {m.label} passée
                </li>
              ))}
            </ul>
          ) : (
            <p className="card-summary">Aucun retard.</p>
          )}
        </Card>
      </Masonry>
      <nav className="home-nav" aria-label="Pages de DS-Studio">
        {destinations.map((d) => (
          <Surface
            key={d.page}
            component="button"
            type="button"
            className="nav-card"
            onClick={() => onPage(d.page)}
          >
            <span className="card-emoji" aria-hidden="true">
              {d.emoji}
            </span>
            <strong>{d.title}</strong>
            <span>{d.description}</span>
          </Surface>
        ))}
      </nav>
    </section>
  );
}

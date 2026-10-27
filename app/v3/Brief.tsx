import { useId, useState, type ReactNode } from 'react';
import { useTasks } from '../client/useTasks.js';
import {
  briefCards,
  briefSources,
  milestoneStatus,
  milestones,
  progress,
  today,
  type BriefCard,
} from '../shared/brief.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
  type TaskStatus,
} from '../shared/tasks.js';
import Timeline from './Timeline.js';
import { Button, Progress } from './ui.js';

// Fiche PFE présentable à un tiers. Contenu : synthèse Notion (lecture
// seule, app/shared/brief.ts), jalons et tâches locales. Rien n'est inventé :
// chaque section cite les blocs existants qui la nourrissent.
const card = (id: string) => briefCards.find((c) => c.id === id) as BriefCard;
const body = (c: BriefCard, from = 0) => (
  <>
    {c.paragraphs?.slice(from).map((p) => (
      <p key={p}>{p}</p>
    ))}
    {c.items && (
      <ul className={c.columns ? 'cols' : undefined}>
        {c.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    )}
  </>
);
const sujet = card('sujet');
const sections: {
  id: string;
  title: string;
  summary: string;
  detail: ReactNode;
}[] = [
  {
    id: 'presentation',
    title: 'Présentation et contexte',
    summary: sujet.summary,
    detail: <p>{sujet.paragraphs![1]}</p>,
  },
  {
    id: 'problematique',
    title: 'Problématique et enjeux',
    summary: sujet.paragraphs![0],
    detail: <p>{card('contraintes').items![3]}</p>,
  },
  {
    id: 'objectifs',
    title: 'Objectifs',
    summary: card('objectifs').summary,
    detail: body(card('objectifs')),
  },
  {
    id: 'publics',
    title: 'Publics et besoins',
    summary: card('cibles').summary,
    detail: body(card('cibles')),
  },
  {
    id: 'solution',
    title: 'Solution et fonctionnalités',
    summary: card('fonctionnalites').summary,
    detail: body(card('fonctionnalites')),
  },
  {
    id: 'ux',
    title: 'Points forts et intentions UX',
    summary: card('ux').summary,
    detail: body(card('ux')),
  },
  {
    id: 'perimetre',
    title: 'Périmètre et contraintes',
    summary: `${card('support').summary} · ${card('contraintes').summary}`,
    detail: body(card('contraintes')),
  },
  {
    id: 'methode',
    title: 'Méthode, recherche et tests',
    summary: card('tests').summary,
    detail: (
      <>
        {card('support').paragraphs!.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {body(card('tests'))}
      </>
    ),
  },
  {
    id: 'livrables',
    title: 'Livrables',
    summary: card('livrables').summary,
    detail: body(card('livrables')),
  },
];

function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="sheet-section" aria-labelledby={`${id}-t`}>
      <div className="sheet-row">
        <h2 id={`${id}-t`}>{title}</h2>
        <div className="sheet-summary">{summary}</div>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Masquer' : 'Voir le détail'}
        </Button>
      </div>
      {open && (
        <div id={id} className="sheet-detail">
          {children}
        </div>
      )}
    </section>
  );
}

export default function Brief() {
  const { state, error, update } = useTasks();
  const now = today();
  const statuses = milestones.map((_, i) => milestoneStatus(i, state, now));
  const done = progress(state);
  return (
    <div className="page sheet">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Fiche PFE
        </h1>
        <p className="lead">
          {sujet.summary} Synthèse en lecture seule de{' '}
          {briefSources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ' et '}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          .
        </p>
      </header>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <div className="sheet-body">
        {sections.map((s) => (
          <Section key={s.id} title={s.title} summary={s.summary}>
            {s.detail}
          </Section>
        ))}
        <Section
          title="Échéances"
          summary={`${milestones.length} jalons, du ${milestones[0].label} au ${milestones[milestones.length - 1].label}.`}
        >
          <Timeline day={now} statuses={statuses} details />
        </Section>
        <Section
          title="Checklist"
          summary={
            <>
              <span>
                {state ? `${done} % des tâches faites ou validées` : '…'}
              </span>
              <Progress value={done} label="Tâches faites ou validées" />
            </>
          }
        >
          <ul className="checklist">
            {tasks.map((t) => {
              const s = state ? statusOf(state, t.id) : t.initial;
              return (
                <li key={t.id}>
                  <span>
                    {t.label}
                    {t.due && <small> · {t.due}</small>}
                  </span>
                  <select
                    aria-label={`Statut : ${t.label}`}
                    value={s}
                    disabled={!state}
                    data-status={s}
                    onChange={(e) =>
                      void update(t.id, e.target.value as TaskStatus)
                    }
                  >
                    {taskStatuses.map((x) => (
                      <option key={x} value={x}>
                        {statusLabels[x]}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}

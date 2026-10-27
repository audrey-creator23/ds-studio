import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useTasks } from '../client/useTasks.js';
import {
  briefCards,
  briefSources,
  milestones,
  progress,
  type BriefCard,
} from '../shared/brief.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
  type TaskId,
  type TaskState,
  type TaskStatus,
} from '../shared/tasks.js';
import { short } from './Timeline.js';
import { Badge, Button, Card, Progress, type BadgeVariant } from './ui.js';

// Fiche PFE présentable à un tiers. Contenu : synthèse Notion (lecture
// seule, app/shared/brief.ts), jalons du brief du professeur et tâches
// locales ; rien d'inventé. Le statut d'une étape est choisi à la main dans
// son détail, jamais déduit de la date.
const card = (id: string) => briefCards.find((c) => c.id === id) as BriefCard;
const body = (c: BriefCard) => (
  <>
    {c.paragraphs?.map((p) => (
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
type Step = {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  detail: ReactNode;
  tasks: TaskId[];
};
const steps: Step[] = [
  {
    id: 'presentation',
    emoji: '🌋',
    title: 'Présentation et contexte',
    summary: sujet.summary,
    detail: <p>{sujet.paragraphs![1]}</p>,
    tasks: ['intention'],
  },
  {
    id: 'problematique',
    emoji: '🧭',
    title: 'Problématique et enjeux',
    summary: sujet.paragraphs![0],
    detail: (
      <>
        <p>{sujet.paragraphs![1]}</p>
        <p>{card('contraintes').items![3]}</p>
      </>
    ),
    tasks: ['intention', 'contexte'],
  },
  {
    id: 'objectifs',
    emoji: '🎯',
    title: 'Objectifs',
    summary: card('objectifs').summary,
    detail: body(card('objectifs')),
    tasks: ['contexte'],
  },
  {
    id: 'publics',
    emoji: '👥',
    title: 'Publics et besoins',
    summary: card('cibles').summary,
    detail: body(card('cibles')),
    tasks: ['contexte', 'recherche'],
  },
  {
    id: 'solution',
    emoji: '🧩',
    title: 'Solution et fonctionnalités',
    summary: card('fonctionnalites').summary,
    detail: body(card('fonctionnalites')),
    tasks: ['fonctionnel'],
  },
  {
    id: 'ux',
    emoji: '🎨',
    title: 'Points forts et intentions UX',
    summary: card('ux').summary,
    detail: body(card('ux')),
    tasks: ['prototype'],
  },
  {
    id: 'perimetre',
    emoji: '⚠️',
    title: 'Périmètre et contraintes',
    summary: `${card('support').summary} · ${card('contraintes').summary}`,
    detail: body(card('contraintes')),
    tasks: ['technique'],
  },
  {
    id: 'methode',
    emoji: '🧪',
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
    tasks: ['recherche', 'tests'],
  },
  {
    id: 'livrables',
    emoji: '📦',
    title: 'Livrables',
    summary: card('livrables').summary,
    detail: body(card('livrables')),
    tasks: ['validation', 'design-system', 'prototype'],
  },
  {
    id: 'echeances',
    emoji: '📅',
    title: 'Échéances',
    summary: `${milestones.length} jalons, du ${milestones[0].label} au ${milestones[milestones.length - 1].label}.`,
    detail: (
      <ul>
        {milestones.map((m) => (
          <li key={m.date}>
            <strong>{short(m.date)}</strong> · {m.title} — {m.detail}
          </li>
        ))}
      </ul>
    ),
    tasks: [],
  },
];

const stepStatuses = ['todo', 'doing', 'done', 'validated'] as const;
type StepStatus = (typeof stepStatuses)[number];
const stepBadge: Record<StepStatus, BadgeVariant> = {
  todo: 'outline',
  doing: 'secondary',
  done: 'secondary',
  validated: 'default',
};
const stepsKey = 'ds-v3-steps';
function readSteps(): Record<string, StepStatus> {
  try {
    return JSON.parse(localStorage.getItem(stepsKey) || '{}');
  } catch {
    return {};
  }
}

// Sélecteur de statut d'une tâche (persisté côté serveur, progression
// recalculée partout).
function TaskRow({
  id,
  state,
  update,
}: {
  id: TaskId;
  state?: TaskState;
  update: (id: TaskId, s: TaskStatus) => Promise<void>;
}) {
  const t = tasks.find((x) => x.id === id)!;
  const s = state ? statusOf(state, id) : t.initial;
  return (
    <li>
      <span>
        {t.label}
        {t.due && <small> · {t.due}</small>}
      </span>
      <select
        className="input input-sm"
        aria-label={`Statut : ${t.label}`}
        value={s}
        disabled={!state}
        data-status={s}
        onChange={(e) => void update(id, e.target.value as TaskStatus)}
      >
        {taskStatuses.map((x) => (
          <option key={x} value={x}>
            {statusLabels[x]}
          </option>
        ))}
      </select>
    </li>
  );
}

function StepCard({
  n,
  step,
  status,
  onStatus,
  state,
  update,
}: {
  n: number;
  step: Step;
  status: StepStatus;
  onStatus: (s: StepStatus) => void;
  state?: TaskState;
  update: (id: TaskId, s: TaskStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const linked = milestones.filter((m) =>
    m.tasks.some((t) => step.tasks.includes(t)),
  );
  return (
    <li className="step" data-status={status}>
      <span className="step-n" aria-hidden="true">
        {n}
      </span>
      <Card className="step-card" aria-labelledby={`${id}-t`}>
        <div className="step-head">
          <span className="step-emoji" aria-hidden="true">
            {step.emoji}
          </span>
          <div className="step-text">
            <h2 id={`${id}-t`}>
              <span className="sr-only">Étape {n} : </span>
              {step.title}
            </h2>
            <p className="step-summary">{step.summary}</p>
          </div>
          <Badge variant={stepBadge[status]} className="step-badge">
            {statusLabels[status]}
          </Badge>
        </div>
        {open && (
          <div id={id} className="step-detail">
            <section>
              <h3>Contenu</h3>
              {step.detail}
            </section>
            {linked.length > 0 && (
              <section>
                <h3>Échéances et attendus (brief du professeur)</h3>
                <ul>
                  {linked.map((m) => (
                    <li key={m.date}>
                      <strong>{short(m.date)}</strong> · {m.title} — {m.detail}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3>Suivi</h3>
              <label className="step-status-edit">
                <span>Statut de l’étape</span>
                <select
                  className="input input-sm"
                  aria-label={`Statut de l’étape : ${step.title}`}
                  value={status}
                  data-status={status}
                  onChange={(e) => onStatus(e.target.value as StepStatus)}
                >
                  {stepStatuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
              {step.tasks.length > 0 && (
                <ul className="checklist">
                  {step.tasks.map((t) => (
                    <TaskRow key={t} id={t} state={state} update={update} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <div className="step-foot">
          <Button
            variant="outline"
            size="sm"
            className="detail-toggle"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Masquer le détail' : 'Voir le détail'}
          </Button>
        </div>
      </Card>
    </li>
  );
}

export default function Brief() {
  const { state, error, update } = useTasks();
  const done = progress(state);
  const finished = state
    ? tasks.filter((t) => ['done', 'validated'].includes(statusOf(state, t.id)))
        .length
    : 0;
  const [statuses, setStatuses] = useState(readSteps);
  const [checklist, setChecklist] = useState(false);
  const setStep = (id: string, s: StepStatus) => {
    const next = { ...statuses, [id]: s };
    setStatuses(next);
    try {
      localStorage.setItem(stepsKey, JSON.stringify(next));
    } catch {
      /* Statut gardé pour la session seulement. */
    }
  };
  // Frise verticale : remplissage selon le défilement, jusqu'au bas du
  // parcours (1 quand la page est entièrement défilée).
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = list.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const bottom =
          innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
        const seen = bottom ? 1 : (innerHeight * 0.6 - r.top) / r.height;
        el.style.setProperty(
          '--progress',
          String(Math.min(1, Math.max(0, seen))),
        );
      });
    };
    measure();
    addEventListener('scroll', measure, { passive: true });
    addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', measure);
      removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className="page sheet">
      <header className="page-header sheet-header">
        <div>
          <h1 id="page-title" tabIndex={-1}>
            Fiche PFE
          </h1>
          <p className="lead">{sujet.summary}</p>
        </div>
        <div className="sheet-links">
          {(
            [
              ['Accéder au brief Notion', briefSources[0].url],
              ['Accéder à ma rédaction Notion', briefSources[1].url],
            ] as const
          ).map(([label, url]) => (
            <a
              key={url}
              className="button"
              data-variant="outline"
              data-size="sm"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              {label} <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          ))}
        </div>
      </header>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <Card className="checklist-card" aria-labelledby="checklist-title">
        <div className="checklist-head">
          <div>
            <h2 id="checklist-title">Checklist</h2>
            <p className="muted">Progression des livrables du PFE</p>
          </div>
          <strong className="stat">{state ? `${done} %` : '…'}</strong>
        </div>
        <Progress value={done} label="Tâches faites ou validées" />
        <div className="row">
          <span className="muted">
            {finished} tâche(s) faite(s) · {tasks.length - finished} restante(s)
          </span>
          <Button size="sm" onClick={() => setChecklist(true)}>
            Continuer ma progression
          </Button>
        </div>
      </Card>

      <ol className="steps" ref={list} aria-label="Étapes du PFE">
        {steps.map((s, i) => (
          <StepCard
            key={s.id}
            n={i + 1}
            step={s}
            status={statuses[s.id] ?? 'todo'}
            onStatus={(v) => setStep(s.id, v)}
            state={state}
            update={update}
          />
        ))}
      </ol>

      {checklist && (
        <div className="dialog-backdrop" onClick={() => setChecklist(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="progress-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setChecklist(false)}
          >
            <div className="panel-head">
              <h2 id="progress-title">Ma progression · {done} %</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                autoFocus
                onClick={() => setChecklist(false)}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
            <Progress value={done} label="Tâches faites ou validées" />
            <ul className="checklist checklist-full">
              {tasks.map((t) => (
                <TaskRow key={t.id} id={t.id} state={state} update={update} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

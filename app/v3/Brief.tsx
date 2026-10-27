import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
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
  type TaskStatus,
} from '../shared/tasks.js';
import { short } from './Timeline.js';
import { Button, Card, Progress } from './ui.js';

// Fiche PFE présentable à un tiers. Contenu : synthèse Notion (lecture
// seule, app/shared/brief.ts), jalons et tâches locales ; rien d'inventé.
// Chaque étape porte un statut choisi à la main, jamais déduit de la date.
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
const steps: {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  detail: ReactNode;
}[] = [
  {
    id: 'presentation',
    emoji: '🌋',
    title: 'Présentation et contexte',
    summary: sujet.summary,
    detail: <p>{sujet.paragraphs![1]}</p>,
  },
  {
    id: 'problematique',
    emoji: '🧭',
    title: 'Problématique et enjeux',
    summary: sujet.paragraphs![0],
    detail: <p>{card('contraintes').items![3]}</p>,
  },
  {
    id: 'objectifs',
    emoji: '🎯',
    title: 'Objectifs',
    summary: card('objectifs').summary,
    detail: body(card('objectifs')),
  },
  {
    id: 'publics',
    emoji: '👥',
    title: 'Publics et besoins',
    summary: card('cibles').summary,
    detail: body(card('cibles')),
  },
  {
    id: 'solution',
    emoji: '🧩',
    title: 'Solution et fonctionnalités',
    summary: card('fonctionnalites').summary,
    detail: body(card('fonctionnalites')),
  },
  {
    id: 'ux',
    emoji: '🎨',
    title: 'Points forts et intentions UX',
    summary: card('ux').summary,
    detail: body(card('ux')),
  },
  {
    id: 'perimetre',
    emoji: '⚠️',
    title: 'Périmètre et contraintes',
    summary: `${card('support').summary} · ${card('contraintes').summary}`,
    detail: body(card('contraintes')),
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
  },
  {
    id: 'livrables',
    emoji: '📦',
    title: 'Livrables',
    summary: card('livrables').summary,
    detail: body(card('livrables')),
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
  },
];

const stepStatuses = ['todo', 'doing', 'done', 'validated'] as const;
type StepStatus = (typeof stepStatuses)[number];
const stepLabels: Record<StepStatus, string> = {
  todo: 'À faire',
  doing: 'En cours',
  done: 'Fait',
  validated: 'Validé prof',
};
const stepsKey = 'ds-v3-steps';
function readSteps(): Record<string, StepStatus> {
  try {
    return JSON.parse(localStorage.getItem(stepsKey) || '{}');
  } catch {
    return {};
  }
}

function Step({
  n,
  step,
  status,
  onStatus,
}: {
  n: number;
  step: (typeof steps)[number];
  status: StepStatus;
  onStatus: (s: StepStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
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
          <h2 id={`${id}-t`}>
            <span className="sr-only">Étape {n} : </span>
            {step.title}
          </h2>
          <select
            className="input input-sm step-status"
            aria-label={`Statut : ${step.title}`}
            value={status}
            data-status={status}
            onChange={(e) => onStatus(e.target.value as StepStatus)}
          >
            {stepStatuses.map((s) => (
              <option key={s} value={s}>
                {stepLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <p className="step-summary">{step.summary}</p>
        <div className="step-foot">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Masquer le détail' : 'Voir le détail'}
          </Button>
        </div>
        {open && (
          <div id={id} className="step-detail">
            {step.detail}
          </div>
        )}
      </Card>
    </li>
  );
}

export default function Brief() {
  const { state, error, update } = useTasks();
  const done = progress(state);
  const [statuses, setStatuses] = useState(readSteps);
  const setStep = (id: string, s: StepStatus) => {
    const next = { ...statuses, [id]: s };
    setStatuses(next);
    try {
      localStorage.setItem(stepsKey, JSON.stringify(next));
    } catch {
      /* Statut gardé pour la session seulement. */
    }
  };
  // Frise verticale : remplissage selon le défilement de la liste d'étapes.
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = list.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const seen = (innerHeight * 0.6 - r.top) / r.height;
        el.style.setProperty(
          '--progress',
          String(Math.min(1, Math.max(0, seen))),
        );
      });
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
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
        <div className="row">
          <a
            className="button"
            data-variant="outline"
            data-size="sm"
            href={briefSources[0].url}
            target="_blank"
            rel="noreferrer"
          >
            Brief du professeur <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
          <a
            className="button"
            data-variant="default"
            data-size="sm"
            href={briefSources[1].url}
            target="_blank"
            rel="noreferrer"
          >
            Mon Notion <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </div>
      </header>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <Card className="checklist-card" aria-labelledby="checklist-title">
        <div className="checklist-head">
          <h2 id="checklist-title">Checklist</h2>
          <strong className="stat">{state ? `${done} %` : '…'}</strong>
        </div>
        <Progress value={done} label="Tâches faites ou validées" />
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
                  className="input input-sm"
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
      </Card>

      <ol className="steps" ref={list} aria-label="Étapes du PFE">
        {steps.map((s, i) => (
          <Step
            key={s.id}
            n={i + 1}
            step={s}
            status={statuses[s.id] ?? 'todo'}
            onStatus={(v) => setStep(s.id, v)}
          />
        ))}
      </ol>
    </div>
  );
}

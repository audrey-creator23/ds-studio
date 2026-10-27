import { useState, type CSSProperties } from 'react';
import { useTasks } from './useTasks.js';
import { BentoCard } from './ProjectContent.js';
import type { Page } from './Sidebar.js';
import {
  milestoneLabels,
  milestoneStatus,
  milestones,
  nextMilestone,
  progress,
  timeProgress,
  today,
} from '../shared/brief.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
} from '../shared/tasks.js';
import { tokenKeys, type Tokens } from '../shared/model.js';

const DAY = 86_400_000;
const start = milestones[0].date;
const end = milestones[milestones.length - 1].date;
const days = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const levels = [
  [1, 'Éruption'],
  [0.75, 'Pré-éruption'],
  [0.5, 'Grondement'],
  [0.25, 'Fumerolles'],
  [0, 'Sommeil'],
] as const;
const levelOf = (a: number) => levels.find(([min]) => a >= min)![1];

// Volcan dessiné en SVG, inspiré de l'emoji 🌋 : l'activité (0 → 1) suit la
// période réelle du projet, éruption maximale à l'échéance finale.
function Volcano({ activity }: { activity: number }) {
  const smoke = 3 + Math.round(activity * 5);
  const embers = activity >= 0.4 ? Math.round(activity * 14) : 0;
  const style = {
    '--activity': activity,
    '--speed': `${(6 - activity * 4).toFixed(2)}s`,
  } as CSSProperties;
  return (
    <svg
      className="volcano-svg"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      style={style}
      role="img"
      aria-label={`Volcan, activité ${Math.round(activity * 100)} % : ${levelOf(activity)}`}
    >
      <defs>
        <linearGradient
          id="v-sky"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="300"
        >
          <stop offset="0" stopColor="#2a1712" />
          <stop offset="1" stopColor="#5a2a1c" />
        </linearGradient>
        <linearGradient id="v-rock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a5a44" />
          <stop offset="0.55" stopColor="#5c3a2e" />
          <stop offset="1" stopColor="#2f1d17" />
        </linearGradient>
        <radialGradient id="v-glow">
          <stop offset="0" stopColor="#ffd166" />
          <stop offset="0.45" stopColor="#ff7a1f" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-1200" y="-300" width="2800" height="900" fill="url(#v-sky)" />
      <circle
        className="v-glow"
        cx="200"
        cy="108"
        r={40 + activity * 70}
        fill="url(#v-glow)"
        opacity={0.25 + activity * 0.75}
      />
      {Array.from({ length: smoke }, (_, i) => (
        <circle
          key={`s${i}`}
          className="v-smoke"
          cx={185 + ((i * 17) % 34)}
          cy={96}
          r={10 + (i % 3) * 5}
          style={{ animationDelay: `calc(var(--speed) * ${i / smoke} * -1)` }}
        />
      ))}
      {activity >= 0.95 && (
        <path
          className="v-fountain"
          d="M200 108 C188 70 178 40 168 20 M200 108 C200 64 202 30 200 6 M200 108 C212 70 222 40 234 20"
        />
      )}
      {Array.from({ length: embers }, (_, i) => (
        <circle
          key={`e${i}`}
          className="v-ember"
          cx={190 + ((i * 7) % 22)}
          cy={104}
          r={2 + (i % 2)}
          style={
            {
              '--dx': `${((i % 7) - 3) * 14}px`,
              animationDelay: `calc(var(--speed) * ${i / Math.max(1, embers)} * -0.6)`,
            } as CSSProperties
          }
        />
      ))}
      <path
        d="M30 290 L168 112 Q200 98 232 112 L370 290 Z"
        fill="url(#v-rock)"
      />
      <path
        d="M168 112 Q200 98 232 112 L218 126 Q200 118 182 126 Z"
        fill="#3a241c"
      />
      <ellipse
        cx="200"
        cy="110"
        rx="28"
        ry="7"
        fill="#ff7a1f"
        opacity={0.35 + activity * 0.65}
      />
      {[
        'M190 114 C182 150 160 180 150 230 C146 250 140 270 132 290',
        'M206 114 C214 160 236 196 244 240 C248 262 256 278 262 290',
        'M198 116 C198 170 194 220 200 290',
      ].map((d, i) => (
        <path
          key={d}
          className="v-lava"
          d={d}
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - Math.min(100, activity * (100 - i * 18))}
        />
      ))}
      <rect x="-1200" y="284" width="2800" height="300" fill="#1f1411" />
    </svg>
  );
}

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
  const activity = timeProgress(day);
  const next = nextMilestone(now);
  const statuses = milestones.map((_, i) => milestoneStatus(i, state, now));
  const finished = statuses.filter(
    (s) => s === 'done' || s === 'validated',
  ).length;
  const late = statuses.filter((s) => s === 'late').length;
  const elapsed = Math.max(0, days(start, now));
  const total = days(start, end);
  const counts = Object.fromEntries(
    taskStatuses.map((s) => [
      s,
      state ? tasks.filter((t) => statusOf(state, t.id) === s).length : 0,
    ]),
  );
  return (
    <section className="volcano-page" aria-labelledby="volcan-title">
      <header className="brief-head">
        <div>
          <h2 id="volcan-title" tabIndex={-1}>
            Dashboard Volcan
          </h2>
          <p>
            L’activité suit les dates réelles du PFE, jusqu’à l’éruption du{' '}
            {milestones[milestones.length - 1].label}.
          </p>
        </div>
        <dl className="brief-kpis">
          <div>
            <dt>Activité</dt>
            <dd>
              {Math.round(activity * 100)} % · {levelOf(activity)}
            </dd>
          </div>
        </dl>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="bento volcano-bento">
        <article className="bento-card volcano-hero">
          <Volcano activity={activity} />
          <div className="volcano-track">
            <div
              className="volcano-fill"
              style={{ width: `${activity * 100}%` }}
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
                    aria-label={`${m.label} · ${m.title} · ${milestoneLabels[statuses[i]]} : prévisualiser l’activité`}
                  >
                    <span className="timeline-dot" aria-hidden="true" />
                    <time dateTime={m.date}>{m.label}</time>
                    <strong>{m.title}</strong>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <p className="volcano-preview" role="status">
            {day === now ? (
              'Activité du jour.'
            ) : (
              <>
                Prévisualisation au {day}.{' '}
                <button onClick={() => setDay(now)}>
                  Revenir à aujourd’hui
                </button>
              </>
            )}
          </p>
        </article>
        <BentoCard emoji="🧭" title="Accès aux pages" className="volcano-nav">
          <ul>
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
        </BentoCard>
        <BentoCard emoji="⏳" title="Période">
          <p className="volcano-big">
            {elapsed} / {total} jours
          </p>
          <p className="bento-summary">
            {milestones[0].label} → {milestones[milestones.length - 1].label} ·{' '}
            {Math.max(0, total - elapsed)} jours restants
          </p>
        </BentoCard>
        <BentoCard emoji="🎯" title="Prochaine échéance">
          {next >= 0 ? (
            <>
              <p className="volcano-big">
                {milestones[next].label} · J-{days(now, milestones[next].date)}
              </p>
              <p className="bento-summary">
                {milestones[next].title} · {milestoneLabels[statuses[next]]}
              </p>
            </>
          ) : (
            <p className="volcano-big">Planning terminé</p>
          )}
        </BentoCard>
        <BentoCard emoji="✅" title="Tâches">
          <p className="volcano-big">{progress(state)} %</p>
          <p className="status-summary">
            {taskStatuses.map((s) => (
              <span key={s} className={`status-tag status-${s}`}>
                {statusLabels[s]} · {counts[s]}
              </span>
            ))}
          </p>
        </BentoCard>
        <BentoCard emoji="📊" title="Indicateurs clés">
          <ul className="volcano-kpis">
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
                className="volcano-swatch"
                style={{ background: String(tokens['color.brand'].$value) }}
                aria-hidden="true"
              />{' '}
              {tokens['color.brand'].$value}
            </li>
          </ul>
        </BentoCard>
      </div>
    </section>
  );
}

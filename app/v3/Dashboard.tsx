import { useState, type CSSProperties } from 'react';
import { useTasks } from '../client/useTasks.js';
import { levels, levelOf } from '../client/Volcano.js';
import VolcanoGL, { webglAvailable } from '../client/VolcanoGL.js';
import {
  daysBetween,
  milestoneLabels,
  milestoneStatus,
  milestones,
  nextMilestone,
  progress,
  timeProgress,
  today,
  type MilestoneStatus,
} from '../shared/brief.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
} from '../shared/tasks.js';
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
  ToggleGroup,
  type BadgeVariant,
} from './ui.js';

// Dashboard projet (itération v3). Concept conservé : l'activité du volcan
// suit les dates du PFE, pas les tâches ; la frise permet de prévisualiser
// une date. Tout le reste (hiérarchie, composants) est nouveau.
const start = milestones[0].date;
const end = milestones[milestones.length - 1].date;
const statusBadge: Record<MilestoneStatus, BadgeVariant> = {
  validated: 'default',
  done: 'secondary',
  current: 'outline',
  late: 'destructive',
  past: 'outline',
  upcoming: 'outline',
};
// Rampe --chart-1 → 5 : plus l'activité monte, plus la teinte est soutenue.
const chartOf = (a: number) =>
  `var(--chart-${Math.min(5, 1 + Math.floor(a * 5))})`;
// Frise à pas réguliers : la date affichée est placée entre ses deux jalons.
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
const short = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

export default function Dashboard() {
  const { state, error } = useTasks();
  const now = today();
  const [day, setDay] = useState(now);
  const [mode, setMode] = useState<'live' | 'still'>(() => {
    try {
      return localStorage.getItem('ds-v3-activity') === 'still'
        ? 'still'
        : 'live';
    } catch {
      return 'live';
    }
  });
  const [gl, setGl] = useState(webglAvailable);
  const [fail] = useState(() => () => setGl(false));
  const chooseMode = (m: 'live' | 'still') => {
    setMode(m);
    try {
      localStorage.setItem('ds-v3-activity', m);
    } catch {
      /* Préférence facultative. */
    }
  };

  const intensity = timeProgress(day);
  const statuses = milestones.map((_, i) => milestoneStatus(i, state, now));
  const finished = statuses.filter(
    (s) => s === 'done' || s === 'validated',
  ).length;
  const late = statuses.filter((s) => s === 'late').length;
  const next = nextMilestone(now);
  const total = daysBetween(start, end);
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, now)));
  const done = progress(state);
  const counts = taskStatuses.map((s) => ({
    status: s,
    n: state ? tasks.filter((t) => statusOf(state, t.id) === s).length : 0,
  }));
  const todo = state
    ? tasks.filter((t) => statusOf(state, t.id) === 'todo').slice(0, 4)
    : [];
  const previewing = day !== now;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Projet · PFE</p>
          <h1 id="page-title" tabIndex={-1}>
            Dashboard
          </h1>
          <p className="lead">
            L’activité suit les dates du projet, du {short(start)} au{' '}
            {short(end)}.
          </p>
        </div>
        <div className="page-header-side" role="status">
          {previewing ? (
            <>
              <Badge variant="outline">Aperçu au {short(day)}</Badge>
              <Button variant="outline" size="sm" onClick={() => setDay(now)}>
                Revenir à aujourd’hui
              </Button>
            </>
          ) : (
            <Badge variant="secondary">Aujourd’hui · {short(now)}</Badge>
          )}
        </div>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="kpis">
        <Card>
          <CardHeader>
            <CardDescription>Tâches réalisées</CardDescription>
            <CardTitle className="stat">{state ? `${done} %` : '…'}</CardTitle>
          </CardHeader>
          <CardFooter>
            <Progress value={done} label="Tâches faites ou validées" />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Prochaine échéance</CardDescription>
            <CardTitle className="stat">
              {next >= 0
                ? `J-${daysBetween(now, milestones[next].date)}`
                : 'Terminé'}
            </CardTitle>
          </CardHeader>
          <CardFooter className="muted">
            {next >= 0
              ? `${milestones[next].title} · ${short(milestones[next].date)}`
              : 'Tous les jalons sont passés.'}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Période écoulée</CardDescription>
            <CardTitle className="stat">
              {elapsed}
              <small> / {total} j</small>
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Progress value={(elapsed / total) * 100} label="Période écoulée" />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Jalons</CardDescription>
            <CardTitle className="stat">
              {finished}
              <small> / {milestones.length} finis</small>
            </CardTitle>
          </CardHeader>
          <CardFooter>
            {late ? (
              <Badge variant="destructive">{late} en retard</Badge>
            ) : (
              <span className="muted">Aucun retard</span>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="main-grid">
        <Card className="activity">
          <CardHeader>
            <CardTitle>Activité</CardTitle>
            <CardDescription>
              {levelOf(intensity)} · intensité {Math.round(intensity * 100)} %
            </CardDescription>
            <CardAction>
              <ToggleGroup
                label="Rendu de l’activité"
                value={mode}
                onChange={chooseMode}
                options={[
                  { value: 'live', label: 'Animé' },
                  { value: 'still', label: 'Léger' },
                ]}
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div
              className="stage"
              role="img"
              aria-label={`Volcan, intensité ${Math.round(intensity * 100)} % : ${levelOf(intensity)}`}
            >
              {gl ? (
                <VolcanoGL
                  activity={intensity}
                  onFail={fail}
                  still={mode === 'still'}
                />
              ) : (
                <p className="stage-fallback">
                  Rendu 3D indisponible sur cet appareil.
                </p>
              )}
            </div>
            <ol className="levels" aria-label="Paliers d’activité">
              {[...levels].reverse().map(([min, name]) => (
                <li
                  key={name}
                  aria-current={
                    levelOf(intensity) === name ? 'step' : undefined
                  }
                  style={{ '--tone': chartOf(min) } as CSSProperties}
                >
                  {name}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="tasks">
          <CardHeader>
            <CardTitle>Tâches</CardTitle>
            <CardDescription>
              {tasks.length} tâches · avancement indépendant des dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="stack-bar" aria-hidden="true">
              {counts.map((c) => (
                <span
                  key={c.status}
                  data-status={c.status}
                  style={{ flexGrow: c.n }}
                />
              ))}
            </div>
            <ul className="legend">
              {counts.map((c) => (
                <li key={c.status} data-status={c.status}>
                  <span>{statusLabels[c.status]}</span>
                  <strong>{c.n}</strong>
                </li>
              ))}
            </ul>
            {todo.length > 0 && (
              <>
                <h3 className="subhead">À faire ensuite</h3>
                <ul className="list">
                  {todo.map((t) => (
                    <li key={t.id}>
                      <span>{t.label}</span>
                      {t.due && <small>{t.due}</small>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="timeline-card">
        <CardHeader>
          <CardTitle>Frise des jalons</CardTitle>
          <CardDescription>
            Choisissez un jalon pour prévisualiser l’activité à sa date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="timeline">
            <div className="timeline-rail" aria-hidden="true">
              <span style={{ width: `${railFill(day)}%` }} />
            </div>
            <ol>
              {milestones.map((m, i) => {
                const a = timeProgress(m.date);
                return (
                  <li
                    key={m.date}
                    style={{ '--tone': chartOf(a) } as CSSProperties}
                  >
                    <button
                      type="button"
                      aria-pressed={day === m.date}
                      aria-label={`${m.title}, ${short(m.date)}, ${milestoneLabels[statuses[i]]} : prévisualiser l’activité`}
                      onClick={() => setDay(m.date)}
                    >
                      <span className="dot" aria-hidden="true" />
                      <time dateTime={m.date}>{short(m.date)}</time>
                      <strong>{m.title}</strong>
                      <Badge variant={statusBadge[statuses[i]]}>
                        {milestoneLabels[statuses[i]]}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

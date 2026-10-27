import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useTasks } from '../client/useTasks.js';
import { levels, levelOf } from '../client/Volcano.js';
import VolcanoGL, { webglAvailable } from '../client/VolcanoGL.js';
import {
  daysBetween,
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
  type TaskStatus,
} from '../shared/tasks.js';
import Timeline, { chartOf, short } from './Timeline.js';
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
  type BadgeVariant,
} from './ui.js';

// Dashboard projet (itération v3). L'activité du volcan suit les dates du
// PFE, pas les tâches ; un jalon de la frise prévisualise sa date (un second
// clic revient à aujourd'hui).
const start = milestones[0].date;
const end = milestones[milestones.length - 1].date;
export const taskBadge: Record<TaskStatus, BadgeVariant> = {
  todo: 'outline',
  done: 'secondary',
  validated: 'default',
};

// Liste réelle des tâches, ouverte depuis la carte « Tâches réalisées ».
function TaskList({ state }: { state: ReturnType<typeof useTasks>['state'] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !root.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', close);
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', close);
    };
  }, [open]);
  return (
    <div className="popover-root" ref={root}>
      <Button
        variant="outline"
        size="sm"
        aria-label="Voir la liste des tâches"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        Liste
      </Button>
      {open && (
        <div id={id} className="popover" role="region" aria-label="Tâches">
          <ul className="task-list">
            {tasks.map((t) => {
              const s = state ? statusOf(state, t.id) : t.initial;
              return (
                <li key={t.id}>
                  <span>
                    {t.label}
                    {t.due && <small> · {t.due}</small>}
                  </span>
                  <Badge variant={taskBadge[s]}>{statusLabels[s]}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { state, error } = useTasks();
  const now = today();
  const [day, setDay] = useState(now);
  const [gl, setGl] = useState(webglAvailable);
  const [fail] = useState(() => () => setGl(false));

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

  return (
    <div className="page">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Récapitulatif des échéances PFE
        </h1>
        <p className="lead">
          Activité calculée sur les dates · du {short(start)} au {short(end)} ·
          jour {elapsed} sur {total}
        </p>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <Card className="timeline-card" aria-labelledby="echeances">
        <CardHeader>
          <CardTitle id="echeances">Échéances à venir</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline
            day={day}
            statuses={statuses}
            selected={day}
            onSelect={(d) => setDay(day === d ? now : d)}
          />
        </CardContent>
      </Card>

      <div className="kpis">
        <Card>
          <CardHeader>
            <CardDescription>Tâches réalisées</CardDescription>
            <CardTitle className="stat">{state ? `${done} %` : '…'}</CardTitle>
            <CardAction>
              <TaskList state={state} />
            </CardAction>
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
              {day !== now && ` · au ${short(day)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="stage"
              role="img"
              aria-label={`Volcan, intensité ${Math.round(intensity * 100)} % : ${levelOf(intensity)}`}
            >
              {gl ? (
                <VolcanoGL activity={intensity} onFail={fail} />
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
    </div>
  );
}

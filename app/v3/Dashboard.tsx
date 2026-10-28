import { useState } from 'react';
import { ListChecks, Network, PenTool, StickyNote } from 'lucide-react';
import { useTasks } from '../client/useTasks.js';
import { levelOf } from '../client/Volcano.js';
import VolcanoGL, { webglAvailable } from '../client/VolcanoGL.js';
import {
  daysBetween,
  milestoneStatus,
  milestones,
  rendus,
  timeProgress,
  today,
} from '../shared/brief.js';
import Timeline from './Timeline.js';
import {
  renduAcquired,
  stepDone,
  stepStatus,
  type StepId,
} from '../shared/steps.js';
import { useUserData } from './useUserData.js';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
} from './ui.js';

// Dashboard projet (v3). L'activité du volcan suit les dates du PFE ; les
// rendus suivent le statut réel de leur étape (même source que la
// checklist des Étapes du PFE), jamais les dates.
const start = milestones[0].date;
const end = milestones[milestones.length - 1].date;
// Accès rapide : une teinte de la palette officielle par espace (texte
// encre dessus, ≥ 6:1), tuile entière cliquable vers la vraie route.
const spaces = [
  {
    id: 'design',
    title: 'Design',
    text: 'Créer mes interfaces',
    icon: PenTool,
    color: '1',
  },
  {
    id: 'brief',
    title: 'Étapes du PFE',
    text: 'Suivre mon avancement',
    icon: ListChecks,
    color: '3',
  },
  {
    id: 'schemas',
    title: 'Mes schémas',
    text: 'Organiser mes recherches',
    icon: Network,
    color: '5',
  },
  {
    id: 'notes',
    title: 'Mes notes',
    text: 'Retrouver mes idées et rappels',
    icon: StickyNote,
    color: '7',
  },
] as const;
const numeric = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('fr-FR');

export default function Dashboard() {
  const { state, error } = useTasks();
  const now = today();
  const [day, setDay] = useState(now);
  const [gl, setGl] = useState(webglAvailable);
  const [fail] = useState(() => () => setGl(false));
  const { data } = useUserData();
  // Statut de l'étape liée : validé = rendu acquis ; fait = remis, en
  // attente de validation (toujours à suivre) ; sinon à réaliser.
  const renduStatus = rendus.map((r) =>
    stepStatus(data, state, r.step as StepId),
  );
  const ok = renduStatus.map(renduAcquired);

  const intensity = timeProgress(day);
  const statuses = milestones.map((_, i) => milestoneStatus(i, state, now));
  const finished = statuses.filter(
    (s) => s === 'done' || s === 'validated',
  ).length;
  const late = statuses.filter((s) => s === 'late').length;
  const total = daysBetween(start, end);
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, now)));
  const ready = !!state && !!data;
  const done = ok.filter(Boolean).length;
  const nextI = ready ? ok.findIndex((x) => !x) : -1;
  const nextR = nextI >= 0 ? rendus[nextI] : undefined;
  // Échéance passée : en retard si rien n'est remis, sinon en attente de
  // validation (le rendu reste suivi tant qu'il n'est pas validé).
  const overdue =
    nextR?.date && nextR.date < now
      ? stepDone(renduStatus[nextI])
        ? ' · remis, en attente de validation'
        : ' · en retard'
      : '';

  return (
    <div className="page">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Dashboard
        </h1>
        <p className="lead">
          Récapitulatif des échéances du projet de fin d’études
        </p>
      </header>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="kpis">
        <Card>
          <CardHeader>
            <CardDescription>Rendus restants</CardDescription>
            <CardTitle className="stat">
              {ready ? rendus.length - done : '…'}
              <small>
                {' '}
                / {rendus.length} · {done} validé{done > 1 ? 's' : ''}
              </small>
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Progress
              value={(done / rendus.length) * 100}
              label="Rendus validés"
            />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Prochain rendu</CardDescription>
            <CardTitle className="stat">
              {!ready
                ? '…'
                : nextR
                  ? nextR.date
                    ? daysBetween(now, nextR.date) >= 0
                      ? `J-${daysBetween(now, nextR.date)}`
                      : `J+${-daysBetween(now, nextR.date)}`
                    : 'Sans date'
                  : 'Terminé'}
            </CardTitle>
          </CardHeader>
          <CardFooter className="muted">
            {!ready
              ? '…'
              : nextR
                ? `${nextR.title}${nextR.date ? ` · ${numeric(nextR.date)}${overdue}` : ' · date non fixée au planning'}`
                : 'Tous les rendus sont validés.'}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Délai écoulé</CardDescription>
            <CardTitle className="stat">
              {elapsed}
              <small> / {total} j</small>
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Progress value={(elapsed / total) * 100} label="Délai écoulé" />
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Jalon</CardDescription>
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

      <Card className="timeline-card" aria-labelledby="echeances">
        <CardHeader>
          <CardTitle id="echeances">Échéances à venir</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline
            day={day}
            today={now}
            selected={day}
            onSelect={(d) => setDay(day === d ? now : d)}
          />
        </CardContent>
      </Card>

      <div className="main-grid">
        <Card className="activity">
          <CardHeader>
            <CardTitle>Activité</CardTitle>
            <CardDescription>
              Le volcan illustre le temps restant avant le rendu final du PFE.
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
          </CardContent>
        </Card>

        <Card className="tasks">
          <CardHeader>
            <CardTitle>Accès rapide</CardTitle>
            <CardDescription>
              Retrouvez vos espaces de travail en un clic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="launcher" aria-label="Espaces de travail">
              {spaces.map(({ id, title, text, icon: Icon, color }) => (
                <li key={id}>
                  <a href={`?vue=${id}`} data-color={color}>
                    <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

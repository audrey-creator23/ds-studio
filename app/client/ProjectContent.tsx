import { useEffect, useState, type ReactNode } from 'react';
import { request } from './api.js';
import {
  statusLabels,
  statusOf,
  taskStatuses,
  tasks,
  type TaskId,
  type TaskState,
  type TaskStatus,
} from '../shared/tasks.js';

// Synthèse du brief PFE et de la note d'intention, consultés sur Notion en
// lecture seule. Mettre à jour ce fichier à la main si les sources évoluent.
const sources = [
  [
    'Brief PFE',
    'https://app.notion.com/p/PFE-M2UXUI-2026-27-2989c8cd131380fb85e5f3b42fe6d1f8',
  ],
  [
    'Note d’intention',
    'https://app.notion.com/p/Note-d-intention-Audrey-NOIRAN-4022df0ba53e8005b9a6d9462024ce21',
  ],
] as const;

// Année scolaire 2026-27 indiquée par le brief.
const milestones = [
  {
    date: '2026-09-25',
    label: '25 sept.',
    title: 'Lancement',
    detail: 'Présentation du PFE, recherche de sujets',
  },
  {
    date: '2026-11-13',
    label: '13 nov.',
    title: 'Note de cadrage',
    detail: 'Livrable : note de cadrage · validation des projets · atelier',
  },
  {
    date: '2026-12-11',
    label: '11 déc.',
    title: 'Accessibilité & RGPD',
    detail: 'Points de cadrage, atelier et suivi individuel',
  },
  {
    date: '2027-01-08',
    label: '8 janv.',
    title: 'Début du DS',
    detail: 'Démarrage du cours Design System',
  },
  {
    date: '2027-01-29',
    label: '29 janv.',
    title: 'Document de cadrage',
    detail: 'Livrable : document de cadrage · cours DS structure & méthode',
  },
  {
    date: '2027-03-12',
    label: '12 mars',
    title: 'Fin du DS',
    detail: 'Fin du cours Design System',
  },
];

const cards: {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  size: 'wide' | 'small';
  details: ReactNode;
}[] = [
  {
    id: 'sujet',
    emoji: '🌋',
    title: 'Sujet et problématique',
    summary:
      'App de prévention et de gestion des risques naturels en Martinique.',
    size: 'wide',
    details: (
      <>
        <p>
          Comment intégrer la prévention des risques naturels au quotidien des
          Martiniquais, sans générer d’anxiété, tout en facilitant la
          préparation et la décision en urgence ?
        </p>
        <p>
          Constat : informations officielles dispersées (Préfecture,
          Météo-France, OVSM-IPGP) et bons réflexes mal connus. Risques :
          cyclones, séismes, tsunamis, fortes pluies, montagne Pelée, brumes de
          sable, sargasses.
        </p>
      </>
    ),
  },
  {
    id: 'objectifs',
    emoji: '🎯',
    title: 'Objectifs',
    summary: 'Avant, pendant et après une catastrophe.',
    size: 'small',
    details: (
      <ul>
        <li>Information fiable, centralisée et compréhensible.</li>
        <li>Préparation progressive : réflexes, kit d’urgence, évacuation.</li>
        <li>Urgence : consignes, zones et actions prioritaires.</li>
        <li>Après : eau, alimentation, santé, démarches.</li>
      </ul>
    ),
  },
  {
    id: 'cibles',
    emoji: '👥',
    title: 'Cibles',
    summary: 'Habitants du Nord, du Centre et du Sud.',
    size: 'small',
    details: (
      <ul>
        <li>Familles, personnes âgées, personnes en situation de handicap.</li>
        <li>Personnes peu à l’aise avec le numérique.</li>
        <li>Touristes et nouveaux arrivants.</li>
        <li>Interface inclusive, lisible même sous stress.</li>
      </ul>
    ),
  },
  {
    id: 'fonctionnalites',
    emoji: '🧩',
    title: 'Fonctionnalités',
    summary: '10 pistes, à confirmer par la recherche utilisateurs.',
    size: 'wide',
    details: (
      <ul className="brief-columns">
        <li>Tableau de bord et vigilances</li>
        <li>Carte des zones, abris, rassemblements</li>
        <li>Évacuation et itinéraires officiels</li>
        <li>Préparation : checklists, kit, réflexes</li>
        <li>Sécurité des proches</li>
        <li>Mode urgence, en partie hors ligne</li>
        <li>Alertes par commune</li>
        <li>Indicateur de préparation</li>
        <li>Accompagnement après catastrophe</li>
        <li>Téléchargement hors ligne daté</li>
      </ul>
    ),
  },
  {
    id: 'ux',
    emoji: '🎨',
    title: 'Intentions UX/UI',
    summary: 'Rassurant au quotidien, direct en urgence.',
    size: 'small',
    details: (
      <ul>
        <li>Quotidien : navigation intuitive, identité martiniquaise.</li>
        <li>Urgence : messages courts, hiérarchie claire, peu d’actions.</li>
        <li>Charge cognitive réduite, confiance.</li>
      </ul>
    ),
  },
  {
    id: 'support',
    emoji: '📱',
    title: 'Support',
    summary: 'iOS · iPhone et iPad.',
    size: 'small',
    details: (
      <p>
        Démarche centrée utilisateurs : recherche, parcours, Design System,
        maquettes et prototype interactif testé.
      </p>
    ),
  },
  {
    id: 'livrables',
    emoji: '📦',
    title: 'Livrables',
    summary: 'Cadrage puis Design System.',
    size: 'small',
    details: (
      <ul>
        <li>Note puis document de cadrage.</li>
        <li>Charte : typographies, couleurs, icônes, pictos.</li>
        <li>Primitives et tokens, layouts par écran.</li>
        <li>Composants fonctionnels.</li>
        <li>Critères C3.2, C3.3, C3.4, C3.5.</li>
      </ul>
    ),
  },
  {
    id: 'contraintes',
    emoji: '⚠️',
    title: 'Contraintes',
    summary: 'Hors ligne · RGPD · accessibilité.',
    size: 'small',
    details: (
      <ul>
        <li>Coupures réseau : contenus consultables hors ligne, datés.</li>
        <li>Données personnelles : géolocalisation, partage aux proches.</li>
        <li>Accessibilité, SEO, compatibilité OS (cadrage).</li>
        <li>Ne pas remplacer les organismes officiels.</li>
      </ul>
    ),
  },
  {
    id: 'tests',
    emoji: '🧪',
    title: 'Tests utilisateurs',
    summary: 'Tester le risqué et le critique, pas tout.',
    size: 'wide',
    details: (
      <p>
        4 critères notés de 1 à 5 : importance, incertitude, risque, impact.
        16–20 P1 · 11–15 P2 · 6–10 P3 · 1–5 P4.
      </p>
    ),
  },
];

function Toggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="brief-toggle">
      <summary>{label}</summary>
      <div className="brief-toggle-body">{children}</div>
    </details>
  );
}

export default function ProjectContent() {
  const [state, setState] = useState<TaskState>();
  const [error, setError] = useState('');
  useEffect(() => {
    request<TaskState>('tasks').then(setState, (e: Error) =>
      setError(e.message),
    );
  }, []);
  async function update(id: TaskId, status: TaskStatus) {
    if (!state) return;
    const previous = state;
    setState({ statuses: { ...state.statuses, [id]: status } });
    try {
      setState(await request<TaskState>('tasks', { id, status }));
      setError('');
    } catch (e) {
      setState(previous);
      setError((e as Error).message);
    }
  }
  const counts = Object.fromEntries(
    taskStatuses.map((s) => [
      s,
      state ? tasks.filter((t) => statusOf(state, t.id) === s).length : 0,
    ]),
  ) as Record<TaskStatus, number>;
  const progress = Math.round(
    ((counts.done + counts.validated) / tasks.length) * 100,
  );
  const today = new Date().toISOString().slice(0, 10);
  const next = milestones.findIndex((m) => m.date >= today);
  return (
    <section className="brief-page" aria-labelledby="projet-title">
      <header className="brief-head">
        <div>
          <h2 id="projet-title" tabIndex={-1}>
            Brief du projet · PFE M2 UX/UI 2026-27
          </h2>
          <p>Prévention des risques naturels en Martinique · iPhone et iPad</p>
        </div>
        <dl className="brief-kpis">
          <div>
            <dt>Avancement</dt>
            <dd>{state ? `${progress} %` : '…'}</dd>
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
      <div className="bento">
        <article className="bento-card bento-planning">
          <h3>
            <span aria-hidden="true">📅</span> Planning
          </h3>
          <ol className="timeline">
            {milestones.map((m, i) => (
              <li
                key={m.date}
                className={
                  i === next ? 'is-next' : i < next || next < 0 ? 'is-past' : ''
                }
                aria-current={i === next ? 'step' : undefined}
              >
                <time dateTime={m.date}>{m.label}</time>
                <strong>{m.title}</strong>
              </li>
            ))}
          </ol>
          <Toggle label="Détail des échéances">
            <ul>
              {milestones.map((m) => (
                <li key={m.date}>
                  <strong>{m.label}</strong> · {m.detail}
                </li>
              ))}
            </ul>
          </Toggle>
        </article>
        <article className="bento-card bento-tasks">
          <h3>
            <span aria-hidden="true">✅</span> Checklist
          </h3>
          <div
            className="progress"
            role="progressbar"
            aria-label="Tâches faites ou validées"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="status-summary">
            {taskStatuses.map((s) => (
              <span key={s} className={`status-tag status-${s}`}>
                {statusLabels[s]} · {counts[s]}
              </span>
            ))}
          </p>
          <Toggle label={`Voir les ${tasks.length} tâches`}>
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
        </article>
        {cards.map((c) => (
          <article key={c.id} className={`bento-card bento-${c.size}`}>
            <h3>
              <span aria-hidden="true">{c.emoji}</span> <span>{c.title}</span>
            </h3>
            <p className="bento-summary">{c.summary}</p>
            <Toggle label="Détails">{c.details}</Toggle>
          </article>
        ))}
      </div>
      <p className="brief-source">
        Synthèse des pages Notion, consultées sans modification :{' '}
        {sources.map(([label, href], i) => (
          <span key={href}>
            {i > 0 && ' · '}
            <a href={href} target="_blank" rel="noreferrer">
              {label}
            </a>
          </span>
        ))}
        . Statuts enregistrés sur ce poste uniquement.
      </p>
    </section>
  );
}

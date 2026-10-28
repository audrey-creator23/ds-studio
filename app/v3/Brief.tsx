import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Pencil, X } from 'lucide-react';
import { useTasks } from '../client/useTasks.js';
import {
  briefCards,
  briefSources,
  milestones,
  rendus,
  type BriefCard,
} from '../shared/brief.js';
import type { TaskId } from '../shared/tasks.js';
import {
  stepDone,
  stepLabels,
  stepStatus,
  stepStatuses,
  stepTasks,
  type StepId,
  type StepStatus,
} from '../shared/steps.js';
import { useUserData } from './useUserData.js';
import { short } from './Timeline.js';
import { Button, Card, Progress } from './ui.js';

// Étapes du PFE : fiche présentable à un tiers. Trois sources, distinguées :
// exigences officielles (brief Notion du professeur : accueil, Planning des
// cours, Cadrage, Design System, Tests utilisateurs — lecture seule),
// propositions pour le projet (à valider, jamais présentées comme
// officielles) et ma synthèse (app/shared/brief.ts). Statuts choisis à la
// main dans le détail, jamais déduits de la date.
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
  official: string[];
  ideas: string[];
  mine: ReactNode;
  tasks: TaskId[];
};
const steps: Step[] = [
  {
    id: 'presentation',
    emoji: '🌋',
    title: 'Présentation et contexte',
    summary:
      'Une application iOS de prévention et de gestion des risques naturels en Martinique, pour s’informer, se préparer et agir avant, pendant et après une catastrophe.',
    official: [
      'Choisir un sujet, un secteur d’activité et un type de service numérique pour créer un service innovant qui répond à un problème spécifique (accueil du brief).',
      'Cadrage : note d’intention et contexte de projet.',
    ],
    ideas: [
      'Formuler l’intention en une phrase : préparer sans inquiéter, guider vite en urgence.',
      'Situer les risques propres à la Martinique : cyclones, séismes, tsunamis, fortes pluies, montagne Pelée, brumes de sable, sargasses.',
      'Citer les sources qui font foi : Préfecture de Martinique, Météo-France, OVSM-IPGP.',
    ],
    mine: <p>{sujet.paragraphs![1]}</p>,
    tasks: ['intention'],
  },
  {
    id: 'problematique',
    emoji: '🧭',
    title: 'Problématique et enjeux',
    summary: sujet.paragraphs![0],
    official: [
      'Cadrage : problématique.',
      'Cadrage : contexte sectoriel, et analyse de l’existant si refonte.',
    ],
    ideas: [
      'Relever où se trouvent aujourd’hui les consignes officielles (Préfecture, Météo-France, OVSM-IPGP) et ce qui manque pour un habitant.',
      'Comparer les applications et sites existants (benchmark) sur l’alerte, la préparation et l’après-crise.',
      'Vérifier en entretien l’enjeu « sans générer d’anxiété ».',
    ],
    mine: (
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
    summary:
      'Centraliser une information fiable et compréhensible, accompagner une préparation progressive (réflexes, kit, évacuation), guider en urgence et aider après la catastrophe.',
    official: [
      'Cadrage : objectifs.',
      'Démontrer la maîtrise des méthodologies UX et UI, la prise en compte des contraintes techniques et l’adaptabilité aux supports (accueil du brief).',
    ],
    ideas: [
      'Rendre chaque objectif mesurable, par exemple le temps pour trouver la consigne en cours.',
      'Relier « avant, pendant, après » à un parcours utilisateur chacun.',
    ],
    mine: body(card('objectifs')),
    tasks: ['contexte'],
  },
  {
    id: 'publics',
    emoji: '👥',
    title: 'Publics et besoins',
    summary:
      'Le grand public martiniquais du Nord, du Centre et du Sud — familles, personnes âgées ou en situation de handicap, personnes peu à l’aise avec le numérique, touristes et nouveaux arrivants — qui ont besoin de consignes claires, même sous stress.',
    official: ['Cadrage : contexte utilisateurs (cibles).'],
    ideas: [
      'Mener des entretiens dans le Nord, le Centre et le Sud, avec des profils variés.',
      'Construire des personas (famille, personne âgée, personne en situation de handicap, nouvel arrivant).',
      'Observer l’usage du téléphone lors des coupures de réseau ou d’électricité.',
    ],
    mine: body(card('cibles')),
    tasks: ['contexte', 'recherche'],
  },
  {
    id: 'solution',
    emoji: '🧩',
    title: 'Solution et fonctionnalités',
    summary:
      'Dix pistes à confirmer par la recherche : tableau de bord et vigilances, carte des zones et abris, évacuation, préparation, sécurité des proches, mode urgence hors ligne, alertes par commune…',
    official: [
      'Cadrage : spécifications fonctionnelles — liste des fonctionnalités, plan de l’app (navigation), systèmes de filtres et de tri, parcours utilisateur (user flow).',
    ],
    ideas: [
      'Prioriser les dix pistes après la recherche utilisateurs.',
      'Dessiner l’arborescence et le user flow « alerte → consigne → action ».',
      'Définir les filtres par commune et par type de risque.',
    ],
    mine: body(card('fonctionnalites')),
    tasks: ['fonctionnel'],
  },
  {
    id: 'ux',
    emoji: '🎨',
    title: 'Points forts et intentions UX',
    summary:
      'Une interface rassurante au quotidien et directe en urgence : messages courts, hiérarchie claire, peu d’actions et charge cognitive réduite, avec une identité martiniquaise.',
    official: [
      'Cadrage : spécifications graphiques, charte graphique, gabarits visuels et maquettes — à livrer à l’étape Design System.',
      'Design System, C3.2 : spécifications graphiques pour plusieurs supports (gabarits d’écrans, tailles d’image, polices, couleurs).',
    ],
    ideas: [
      'Tester la lisibilité sous stress : contraste, taille du texte, messages courts.',
      'Ancrer l’identité martiniquaise sans nuire à la clarté des alertes.',
      'Préparer les gabarits iPhone et iPad.',
    ],
    mine: body(card('ux')),
    tasks: ['prototype'],
  },
  {
    id: 'perimetre',
    emoji: '⚠️',
    title: 'Périmètre et contraintes',
    summary:
      'Application iOS pour iPhone et iPad, consultable hors ligne en cas de coupure, conforme au RGPD (géolocalisation, partage aux proches) et accessible ; elle ne remplace pas les organismes officiels.',
    official: [
      'Cadrage : spécifications techniques — accessibilité et SEO, RGPD, compatibilité navigateurs (web) ou OS (app).',
      'Design System, C3.3 : intégrer les exigences techniques (accessibilité, SEO, compatibilité, RGPD).',
    ],
    ideas: [
      'Viser le niveau AA des WCAG et documenter les choix d’accessibilité.',
      'Limiter les données de localisation et de partage, avec un consentement explicite.',
      'Fixer les versions d’iOS et d’iPadOS prises en charge.',
    ],
    mine: body(card('contraintes')),
    tasks: ['technique'],
  },
  {
    id: 'methode',
    emoji: '🧪',
    title: 'Méthode, recherche et tests',
    summary:
      'Une démarche centrée utilisateurs — recherche, parcours, Design System, maquettes, prototype interactif — et des tests priorisés selon l’importance, l’incertitude, le risque et l’impact.',
    official: [
      'Organiser, concevoir, prototyper et valider une solution design complète (accueil du brief).',
      'Tests utilisateurs : quatre critères notés de 1 à 5 (importance, incertitude, risque, impact), priorités P1 à P4 (synthèse de la page Tests utilisateurs).',
    ],
    ideas: [
      'Tester d’abord le mode urgence et les alertes (P1).',
      'Recruter des participants représentatifs des publics.',
    ],
    mine: (
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
    summary:
      'La note puis le document de cadrage, puis le Design System : charte, primitives et tokens, layouts par écran et composants fonctionnels, évalués sur les critères C3.2 à C3.5.',
    official: [
      'Design System, livrables attendus : charte graphique (typographies, couleurs, icônes, pictos), primitives et tokens, layouts de l’UI par écran et plateforme, composants fonctionnels.',
      'Critères : cohérence et évolutivité du Design System (C3.4), bibliothèque de ressources complète et conforme (C3.5).',
    ],
    ideas: [
      'Structurer le Design System : fondations, composants, accessibilité, documentation.',
      'Prévoir des couleurs d’alerte accessibles dans les tokens.',
    ],
    mine: body(card('livrables')),
    tasks: ['validation', 'design-system', 'prototype'],
  },
  {
    id: 'echeances',
    emoji: '📅',
    title: 'Échéances',
    summary:
      'Six jalons du 25 septembre 2026 au 12 mars 2027 : note de cadrage le 13 novembre, document de cadrage le 29 janvier, fin du cours Design System le 12 mars.',
    official: milestones.map((m) => `${m.label} : ${m.detail}.`),
    ideas: [
      'Garder une marge avant chaque rendu.',
      'Caler les dates du prototype et des tests, non fixées au planning.',
    ],
    mine: null,
    tasks: [],
  },
];

// Pistes de l'étape : éditables, enregistrées sur le serveur ; à défaut, les
// propositions par défaut (à valider).
function Ideas({
  defaults,
  saved,
  onSave,
}: {
  defaults: string[];
  saved?: string[];
  onSave: (ideas: string[]) => Promise<void>;
}) {
  const ideas = saved ?? defaults;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  if (!editing)
    return (
      <>
        {ideas.length ? (
          <ul>
            {ideas.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucune piste pour l’instant.</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ideas-edit"
          onClick={() => {
            setText(ideas.join('\n'));
            setEditing(true);
          }}
        >
          <Pencil size={14} aria-hidden="true" /> Modifier mes pistes
        </Button>
      </>
    );
  return (
    <div className="ideas-form">
      <label className="sr-only" htmlFor="ideas-text">
        Mes pistes, une par ligne
      </label>
      <textarea
        id="ideas-text"
        className="input"
        rows={Math.min(10, Math.max(4, ideas.length + 1))}
        maxLength={4000}
        value={text}
        placeholder="Une piste par ligne"
        autoFocus
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row">
        <small className="muted">Une piste par ligne (20 maximum).</small>
        <span className="row">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(
                  text
                    .split('\n')
                    .map((l) => l.trim().slice(0, 300))
                    .filter(Boolean)
                    .slice(0, 20),
                );
                setEditing(false);
              } catch {
                /* Erreur affichée par la page. */
              } finally {
                setBusy(false);
              }
            }}
          >
            Enregistrer
          </Button>
        </span>
      </div>
    </div>
  );
}

function StepCard({
  n,
  step,
  status,
  onStatus,
  ideas,
  onIdeas,
}: {
  n: number;
  step: Step;
  status: StepStatus;
  onStatus: (s: StepStatus) => Promise<void>;
  ideas?: string[];
  onIdeas: (ideas: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(status);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(status), [status]);
  const id = useId();
  const linked = milestones.filter((m) =>
    m.tasks.some((t) => stepTasks[step.id as StepId].includes(t)),
  );
  const due = rendus.filter((r) => r.step === step.id);
  const changed = draft !== status;
  async function toggle() {
    if (open && changed) {
      setBusy(true);
      try {
        await onStatus(draft);
      } catch {
        setBusy(false);
        return; // Erreur affichée ; le détail reste ouvert.
      }
      setBusy(false);
    }
    setOpen(!open);
  }
  return (
    <li className="step" id={`etape-${step.id}`} data-status={status}>
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
          <span className="status-badge" data-status={status}>
            {stepLabels[status]}
          </span>
        </div>
        {open && (
          <div id={id} className="step-detail">
            <section>
              <h3>Attendus du brief</h3>
              <ul>
                {step.official.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
            <hr className="step-sep" />
            <section>
              <h3>Mes pistes</h3>
              <Ideas defaults={step.ideas} saved={ideas} onSave={onIdeas} />
            </section>
            {(linked.length > 0 || due.length > 0) && (
              <section>
                <h3>Échéancier</h3>
                <ul>
                  {due.map((r) => (
                    <li key={r.id}>
                      <strong>
                        {r.date ? short(r.date) : 'Date non fixée'}
                      </strong>{' '}
                      · Rendu : {r.title}
                    </li>
                  ))}
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
                  value={draft}
                  data-status={draft}
                  onChange={(e) => setDraft(e.target.value as StepStatus)}
                >
                  {stepStatuses.map((s) => (
                    <option key={s} value={s}>
                      {stepLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            {step.mine && (
              <section>
                <h3>Ma synthèse actuelle</h3>
                {step.mine}
              </section>
            )}
          </div>
        )}
        <div className="step-foot">
          <Button
            variant={open && changed ? 'default' : 'outline'}
            size="sm"
            className={open && changed ? undefined : 'btn-soft'}
            aria-expanded={open}
            aria-controls={id}
            disabled={busy}
            onClick={() => void toggle()}
          >
            {!open
              ? 'Voir le détail'
              : changed
                ? busy
                  ? 'Sauvegarde…'
                  : 'Sauvegarder et masquer'
                : 'Masquer'}
          </Button>
        </div>
      </Card>
    </li>
  );
}

export default function Brief() {
  const { state } = useTasks();
  const { data, error, save } = useUserData();
  const status = (id: string) => stepStatus(data, state, id as StepId);
  const finished = steps.filter((s) => stepDone(status(s.id))).length;
  const done = Math.round((finished / steps.length) * 100);
  const ready = !!data && !!state;
  const [checklist, setChecklist] = useState(false);
  const setStep = (id: string, s: StepStatus) =>
    save('steps', (prev) => ({ ...prev, [id]: s }));
  // Ancre (#etape-…) depuis le Dashboard : défilement vers l'étape visée,
  // qui reste fermée comme toutes les autres (ouverture au clic seulement).
  const [target] = useState(() => location.hash.replace(/^#etape-/, ''));
  useEffect(() => {
    if (!target) return;
    // Après la mise en page complète (détail ouvert, polices) : 2 frames.
    const go = () =>
      document
        .getElementById(`etape-${target}`)
        ?.scrollIntoView({ block: 'start', behavior: 'instant' });
    const id = requestAnimationFrame(() => requestAnimationFrame(go));
    const late = setTimeout(go, 300);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(late);
    };
  }, [target]);
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
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Étapes du PFE
        </h1>
        <p className="lead">
          Retrouvez les étapes de votre PFE, suivez votre progression et
          actualisez l’état d’avancement de vos tâches.
        </p>
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
            <p className="muted">Progression des étapes du PFE</p>
          </div>
          <div className="sheet-links">
            {(
              [
                ['Accéder au brief', briefSources[0].url],
                ['Accéder à mon fichier de rédaction', briefSources[1].url],
              ] as const
            ).map(([label, url]) => (
              <a
                key={url}
                className="button btn-soft"
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
        </div>
        <div className="checklist-value">
          <strong className="stat">{ready ? `${done} %` : '…'}</strong>
          <Progress value={done} label="Étapes faites ou validées" />
        </div>
        <div className="row">
          <span className="muted">
            {finished} étape{finished > 1 ? 's' : ''} faite
            {finished > 1 ? 's' : ''} · {steps.length - finished} restante
            {steps.length - finished > 1 ? 's' : ''}
          </span>
          <Button size="sm" onClick={() => setChecklist(true)}>
            Actualiser ma progression
          </Button>
        </div>
      </Card>

      <ol className="steps" ref={list} aria-label="Étapes du PFE">
        {steps.map((s, i) => (
          <StepCard
            key={s.id}
            n={i + 1}
            step={s}
            status={status(s.id)}
            onStatus={(v) => setStep(s.id, v)}
            ideas={data?.ideas[s.id as StepId]}
            onIdeas={(v) => save('ideas', (prev) => ({ ...prev, [s.id]: v }))}
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
            <Progress value={done} label="Étapes faites ou validées" />
            <ul className="checklist checklist-full">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <span>
                    {i + 1}. {s.title}
                  </span>
                  <select
                    className="input input-sm"
                    aria-label={`Statut : ${s.title}`}
                    value={status(s.id)}
                    disabled={!ready}
                    data-status={status(s.id)}
                    onChange={(e) =>
                      void setStep(s.id, e.target.value as StepStatus)
                    }
                  >
                    {stepStatuses.map((x) => (
                      <option key={x} value={x}>
                        {stepLabels[x]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

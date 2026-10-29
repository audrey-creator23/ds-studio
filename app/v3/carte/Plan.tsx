import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../ui.js';

// Mon plan d'urgence : questionnaire court, par étapes, modifiable,
// gardé sur cet appareil. Aucun mécanisme simulé : le message « Je suis
// en vie » s'ouvre dans la messagerie du téléphone (l'envoi reste à faire
// soi-même) ; le partage de position passe par un service réel choisi
// avec ses proches ; les informations officielles (évacuation, points de
// rassemblement, PC sécurité, radio) se notent depuis les sources
// officielles, jamais devinées.
type Plan = Record<string, string>;
const KEY = 'ds-v3-plan';
const prefecture = 'https://www.martinique.gouv.fr/';
type Step = {
  id: string;
  title: string;
  help: string;
  fields: { id: string; label: string; placeholder?: string; type?: 'tel' }[];
  link?: { label: string; url: string };
};
const steps: Step[] = [
  {
    id: 'vie',
    title: 'Signaler « Je suis en vie »',
    help: 'Choisissez une personne à prévenir. Le bouton ouvre votre messagerie avec un message prêt : vous l’envoyez vous-même.',
    fields: [
      { id: 'contactNom', label: 'Nom de la personne' },
      {
        id: 'contactTel',
        label: 'Téléphone',
        type: 'tel',
        placeholder: '+596 …',
      },
    ],
  },
  {
    id: 'evacuation',
    title: 'Évacuation de mon secteur',
    help: 'Zones et itinéraires d’évacuation sont fixés par la commune et la préfecture (DICRIM). Notez ce qu’ils indiquent pour votre secteur.',
    fields: [
      { id: 'evacuation', label: 'Zone et itinéraire d’évacuation officiels' },
    ],
    link: { label: 'Préfecture de la Martinique', url: prefecture },
  },
  {
    id: 'rassemblement',
    title: 'Points de rassemblement et ralliement',
    help: 'Le point de rassemblement officiel est dans le DICRIM. Convenez aussi d’un point de ralliement avec votre famille, vos amis ou vos voisins.',
    fields: [
      { id: 'rassemblement', label: 'Point de rassemblement officiel' },
      { id: 'ralliement', label: 'Point de ralliement famille / voisins' },
    ],
  },
  {
    id: 'proches',
    title: 'Position de mes proches',
    help: 'Seulement avec leur accord et un service réel de partage de position (celui de votre téléphone, par exemple). Cette application ne localise personne.',
    fields: [{ id: 'partage', label: 'Service convenu et personnes d’accord' }],
  },
  {
    id: 'pc',
    title: 'PC sécurité et radio',
    help: 'Les postes de commandement (nord, centre, sud) et les fréquences radio sont communiqués par la préfecture : notez les informations officielles.',
    fields: [
      { id: 'pc', label: 'Mon PC sécurité (selon la préfecture)' },
      { id: 'radio', label: 'Radio et fréquence à écouter' },
    ],
    link: { label: 'Préfecture de la Martinique', url: prefecture },
  },
  {
    id: 'nourriture',
    title: 'Ressources alimentaires',
    help: 'Notez les ressources sûres de votre foyer. Ne consommez jamais une plante ou un fruit sauvage sans identification certaine : cette application ne donne aucune liste de plantes comestibles.',
    fields: [{ id: 'nourriture', label: 'Réserves et ressources sûres' }],
  },
  {
    id: 'risques',
    title: 'Préparation par risque',
    help: 'Pour le volcan, le séisme, le tsunami et le cyclone : relisez les gestes dans « Comprendre les risques » et cochez quand c’est fait.',
    fields: [],
  },
];
const risksToRead = ['Volcanisme', 'Séisme', 'Tsunami', 'Cyclone'];

export default function Plan() {
  const [plan, setPlan] = useState<Plan>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [i, setI] = useState(0);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(plan));
    } catch {
      // Stockage indisponible : plan gardé pour la session.
    }
  }, [plan]);
  const step = steps[i];
  const done = steps.filter((s) =>
    s.fields.length
      ? s.fields.every((f) => plan[f.id]?.trim())
      : risksToRead.every((r) => plan[`lu-${r}`] === '1'),
  ).length;
  const set = (id: string, v: string) => setPlan((p) => ({ ...p, [id]: v }));
  return (
    <div className="plan">
      <progress
        max={steps.length}
        value={done}
        aria-label={`${done} étapes complètes sur ${steps.length}`}
      />
      <small className="carte-stamp">
        {done} / {steps.length} étapes complètes · gardé sur cet appareil
        uniquement
      </small>
      <ol className="plan-steps" aria-label="Étapes du plan">
        {steps.map((s, k) => (
          <li key={s.id}>
            <button
              type="button"
              aria-current={k === i ? 'step' : undefined}
              onClick={() => setI(k)}
              title={s.title}
            >
              {k + 1}
            </button>
          </li>
        ))}
      </ol>
      <section className="plan-step" aria-label={step.title}>
        <h4>{step.title}</h4>
        <p className="small">{step.help}</p>
        {step.fields.map((f) => (
          <label key={f.id} className="plan-field">
            <span>{f.label}</span>
            <input
              className="input input-sm"
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              value={plan[f.id] ?? ''}
              onChange={(e) => set(f.id, e.target.value)}
            />
          </label>
        ))}
        {step.id === 'vie' && plan.contactTel?.trim() && (
          <a
            className="button plan-sms"
            data-variant="outline"
            data-size="sm"
            href={`sms:${plan.contactTel.replace(/\s/g, '')}?&body=${encodeURIComponent('Je suis en vie et en sécurité.')}`}
          >
            <MessageSquare size={14} aria-hidden="true" /> Préparer le message «
            Je suis en vie »
          </a>
        )}
        {step.id === 'risques' &&
          risksToRead.map((r) => (
            <label key={r} className="plan-check">
              <input
                type="checkbox"
                checked={plan[`lu-${r}`] === '1'}
                onChange={(e) => set(`lu-${r}`, e.target.checked ? '1' : '')}
              />
              J’ai relu les gestes : {r}
            </label>
          ))}
        {step.link && (
          <a
            className="carte-link"
            href={step.link.url}
            target="_blank"
            rel="noreferrer"
          >
            {step.link.label} <ExternalLink size={12} aria-hidden="true" />
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        )}
      </section>
      <div className="row">
        <Button
          variant="outline"
          size="sm"
          disabled={i === 0}
          onClick={() => setI(i - 1)}
        >
          <ChevronLeft size={14} aria-hidden="true" /> Précédent
        </Button>
        <Button
          size="sm"
          disabled={i === steps.length - 1}
          onClick={() => setI(i + 1)}
        >
          Suivant <ChevronRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

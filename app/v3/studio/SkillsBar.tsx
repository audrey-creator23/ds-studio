import { useEffect, useState } from 'react';
import { ChevronDown, FolderSearch, Puzzle, X } from 'lucide-react';
import { request } from '../../client/api.js';

// Skills Claude Code (skills/, Markdown seul) : désactivés par défaut,
// activés ici, puis chargés dans la session Claude pour UN message
// seulement, après accord (coût estimé affiché). Jamais d'injection
// automatique ; la suggestion ne fait que proposer.
export type Skill = {
  id: string;
  plugin: string;
  skill: string;
  description: string;
  version: string;
  repository: string;
  license: string;
  tokens: number;
};
type State = { skills: Skill[]; active: string[]; repoRead: boolean };

// Suggestion d'après la demande (mots clés), jamais chargée sans accord.
const hints: [RegExp, string][] = [
  [/bug|erreur|cass|ne marche|plant/i, 'superpowers:systematic-debugging'],
  [/plan|étapes|roadmap|découp/i, 'superpowers:writing-plans'],
  [
    /idée|imagin|concept|brainstorm|créer|nouvelle? (page|écran)/i,
    'superpowers:brainstorming',
  ],
  [
    /vérif|terminé|fini|valider|tester/i,
    'superpowers:verification-before-completion',
  ],
  [/court|bref|concis|token|caveman/i, 'caveman:caveman'],
  [/simple|minimal|yagni|lazy|ponytail|sobre/i, 'ponytail:ponytail'],
];
export const suggest = (text: string) =>
  hints.find(([re]) => re.test(text))?.[1];
const fmt = (n: number) => `≈ ${n.toLocaleString('fr-FR')} tokens`;

export default function SkillsBar({
  draft,
  chosen,
  onChoose,
}: {
  draft: string;
  chosen: Skill | null;
  onChoose: (s: Skill | null) => void;
}) {
  const [s, setS] = useState<State>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    request<State>('skills').then(setS, (e) => setError((e as Error).message));
  }, []);
  if (error && !s)
    return (
      <p className="key-alert" role="alert">
        Skills indisponibles : {error}
      </p>
    );
  if (!s) return null;
  // Affichage immédiat, enregistrement serveur ; en cas d'échec, retour à
  // l'état précédent et message.
  const save = async (next: Pick<State, 'active' | 'repoRead'>) => {
    const before = s;
    setError('');
    setS({ ...s, active: next.active, repoRead: next.repoRead });
    if (chosen && !next.active.includes(chosen.id)) onChoose(null);
    try {
      await request('skills', { active: next.active, repoRead: next.repoRead });
    } catch (e) {
      setS(before);
      setError((e as Error).message);
    }
  };
  const active = s.skills.filter((k) => s.active.includes(k.id));
  const hint = s.skills.find((k) => k.id === suggest(draft));
  return (
    <div className="skills">
      <div className="skills-row">
        <button
          type="button"
          className="chip-toggle skills-toggle"
          aria-expanded={open}
          aria-controls="skills-panel"
          onClick={() => setOpen(!open)}
        >
          <Puzzle size={13} aria-hidden="true" /> Skills · {active.length}/
          {s.skills.length} actifs
          {s.repoRead && (
            <FolderSearch
              size={13}
              aria-label="Lecture du projet activée"
              role="img"
            />
          )}
          <ChevronDown size={13} aria-hidden="true" />
        </button>
        {chosen ? (
          <span className="chip-toggle skills-chosen">
            {chosen.skill} · {fmt(chosen.tokens)}
            <button
              type="button"
              aria-label={`Ne pas utiliser ${chosen.skill}`}
              title="Retirer"
              onClick={() => onChoose(null)}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ) : (
          hint &&
          !chosen && (
            <button
              type="button"
              className="chip-toggle skills-hint"
              disabled={!s.active.includes(hint.id)}
              title={
                s.active.includes(hint.id)
                  ? `Utiliser ${hint.skill} pour ce message (${fmt(hint.tokens)})`
                  : `Activez d’abord ${hint.skill} dans Skills`
              }
              onClick={() => onChoose(hint)}
            >
              Suggestion : {hint.skill}
              {!s.active.includes(hint.id) && ' (inactif)'}
            </button>
          )
        )}
      </div>
      {error && (
        <p className="key-alert" role="alert">
          {error}
        </p>
      )}
      {open && (
        <div id="skills-panel" className="skills-panel">
          <ul>
            {s.skills.map((k) => {
              const on = s.active.includes(k.id);
              return (
                <li key={k.id}>
                  <label>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={on}
                      onChange={() =>
                        void save({
                          ...s,
                          active: on
                            ? s.active.filter((x) => x !== k.id)
                            : [...s.active, k.id],
                        })
                      }
                    />
                    <span>
                      <b>{k.skill}</b>{' '}
                      <small>
                        {k.plugin} {k.version} · {fmt(k.tokens)} ·{' '}
                        {on ? 'actif' : 'inactif'}
                      </small>
                      <small className="skills-desc" title={k.description}>
                        {k.description}
                      </small>
                    </span>
                  </label>
                  {on && (
                    <button
                      type="button"
                      className="skills-use"
                      aria-pressed={chosen?.id === k.id}
                      onClick={() => onChoose(chosen?.id === k.id ? null : k)}
                    >
                      {chosen?.id === k.id ? 'Choisi' : 'Utiliser'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <label className="skills-repo">
            <input
              type="checkbox"
              role="switch"
              checked={s.repoRead}
              onChange={() => void save({ ...s, repoRead: !s.repoRead })}
            />
            <span>
              <b>Lecture du projet</b>{' '}
              <small>
                Read, Grep, Glob sur ce dépôt seulement ; .env, .ds-studio, .git
                et node_modules exclus ; aucune écriture, aucun shell.
              </small>
            </span>
          </label>
          <small className="carte-stamp">
            Installés dans skills/ (Markdown seul, versions figées, sans hooks).
            Chargés par Claude Code pour un message, après votre accord. Sources
            : obra/superpowers (MIT), JuliusBrussee/caveman (Apache-2.0),
            DietrichGebert/ponytail (MIT).
          </small>
        </div>
      )}
    </div>
  );
}

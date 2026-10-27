import { useEffect, useRef, useState } from 'react';
import { request } from '../api.js';
import type { Composition } from '../../shared/composition.js';
import type { CompositionState } from './useComposition.js';

const examples = [
  'Place une grande card à gauche, trois petites à droite.',
  'Mets le planning au-dessus des tâches.',
  'Ajoute un bouton secondaire « Voir les ateliers » sous le titre.',
];

// Chat de composition : Claude traduit la demande en structure de page avec
// les composants réels. Il propose ; l'utilisatrice applique puis enregistre.
export default function ComposeChat({ c }: { c: CompositionState }) {
  const { turns, setTurns } = c;
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [turns, pending, c.proposal]);
  const available = c.composer?.available ?? false;
  async function send(text = draft.trim()) {
    if (!text || pending) return;
    c.setError('');
    setPending(true);
    const abort = new AbortController();
    controller.current = abort;
    setTurns((t) => [...t, { role: 'user', text }]);
    try {
      const r = await request<{
        reply: string;
        question: boolean;
        proposal: Composition | null;
        changes: string[];
      }>(
        'compose',
        {
          message: text,
          composition: { ...c.draft, updatedAt: undefined },
          history: turns.slice(-10).map(({ role, text }) => ({
            role,
            text: text.slice(0, 4000),
          })),
        },
        abort.signal,
      );
      setDraft('');
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: r.reply, question: r.question },
      ]);
      c.setProposal(
        r.proposal
          ? { composition: r.proposal, changes: r.changes, reply: r.reply }
          : undefined,
      );
    } catch (e) {
      setTurns((t) => t.slice(0, -1));
      c.setError(
        abort.signal.aborted
          ? 'Demande interrompue. Votre message reste dans la zone de saisie.'
          : (e as Error).message,
      );
    } finally {
      setPending(false);
      controller.current = null;
    }
  }
  return (
    <section className="compose-chat card" aria-labelledby="compose-title">
      <div className="editor-head">
        <h2 id="compose-title">Claude</h2>
        <small className="compose-model">
          {c.composer
            ? available
              ? c.model.replace('claude-', '').replaceAll('-', ' ') || 'Claude'
              : 'Clé API absente'
            : '…'}
        </small>
      </div>
      <div className="compose-thread" ref={log} aria-live="polite">
        {!turns.length && (
          <div className="chat-empty">
            <p>
              Décrivez la page : composants, position, ordre, relations. Claude
              n’utilise que les composants existants et ne touche pas aux
              tokens.
            </p>
            <ul className="compose-examples">
              {examples.map((x) => (
                <li key={x}>
                  <button
                    type="button"
                    disabled={!available || pending}
                    onClick={() => setDraft(x)}
                  >
                    {x}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {turns.map((t, i) => (
          <article
            key={i}
            className={`chat-bubble ${t.role}${t.question ? ' is-question' : ''}`}
          >
            <strong>{t.role === 'user' ? 'Vous' : 'Claude'}</strong>
            <p>{t.text}</p>
          </article>
        ))}
        {pending && (
          <p className="chat-loading" role="status">
            Claude compose la page…
          </p>
        )}
        {c.proposal && (
          <div
            className="compose-proposal"
            role="region"
            aria-label="Proposition de Claude"
          >
            <strong>Proposition · visible dans l’aperçu</strong>
            <ul>
              {c.proposal.changes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="inspector-row">
              <button
                type="button"
                className="studio-primary"
                onClick={c.applyProposal}
              >
                Appliquer au brouillon
              </button>
              <button type="button" onClick={() => c.setProposal(undefined)}>
                Refuser
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="compose-input">
          Décrire la page à Claude
        </label>
        <textarea
          id="compose-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          maxLength={4000}
          rows={3}
          placeholder={
            available
              ? 'Ex. : une grille de trois cartes sous le titre…'
              : (c.composer?.detail ?? 'Connexion à Claude…')
          }
          disabled={!available || pending}
        />
        <div className="chat-actions">
          <small>Proposition à valider, rien n’est enregistré.</small>
          {pending ? (
            <button type="button" onClick={() => controller.current?.abort()}>
              Arrêter
            </button>
          ) : (
            <button
              className="studio-primary"
              disabled={!available || !draft.trim()}
            >
              Composer
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

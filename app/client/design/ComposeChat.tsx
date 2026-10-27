import { Surface } from '../Card.js';
import { Button } from '@mantine/core';
import { useEffect, useRef } from 'react';
import type { CompositionState } from './useComposition.js';
import { useComposeChat } from './useComposeChat.js';

const examples = [
  'Place une grande card à gauche, trois petites à droite.',
  'Mets le planning au-dessus des tâches.',
  'Ajoute un bouton secondaire « Voir les ateliers » sous le titre.',
];

// Chat de composition : Claude traduit la demande en structure de page avec
// les composants réels. Il propose ; l'utilisatrice applique puis enregistre.
export default function ComposeChat({ c }: { c: CompositionState }) {
  const { turns } = c;
  const { draft, setDraft, pending, send, stop, available } = useComposeChat(c);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [turns, pending, c.proposal]);
  return (
    <Surface
      component="section"
      className="compose-chat"
      aria-labelledby="compose-title"
    >
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
              <Button type="button" onClick={c.applyProposal}>
                Appliquer au brouillon
              </Button>
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
            <button type="button" onClick={stop}>
              Arrêter
            </button>
          ) : (
            <Button type="submit" disabled={!available || !draft.trim()}>
              Composer
            </Button>
          )}
        </div>
      </form>
    </Surface>
  );
}

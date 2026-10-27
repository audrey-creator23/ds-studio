import { useEffect, useRef, useState } from 'react';
import { blockSpecs } from '../../shared/composition.js';
import type { CompositionState } from '../../client/design/useComposition.js';
import { useComposeChat } from '../../client/design/useComposeChat.js';
import { useAssistantChat } from '../../client/useAssistantChat.js';
import { Badge, Button } from '../ui.js';

// Chat du studio : Claude compose ou modifie l'écran avec les composants
// réels. Contexte envoyé : écran courant et, si coché, élément sélectionné.
// Chaque réponse est une proposition, visible dans l'aperçu, à valider.
const examples = [
  'Une grille de trois cartes sous le titre.',
  'Ajoute un bouton secondaire « Voir les ateliers ».',
  'Passe la section Ateliers en 2 colonnes.',
];

export default function StudioChat({ c }: { c: CompositionState }) {
  const chat = useComposeChat(c);
  const assistant = useAssistantChat();
  const [target, setTarget] = useState(true);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [c.turns, chat.pending, c.proposal]);

  const owner = c.draft.sections.find(
    (s) => s.id === c.selected || s.items.some((i) => i.id === c.selected),
  );
  const item = owner?.items.find((i) => i.id === c.selected);
  const selection = item
    ? `${blockSpecs[item.kind].label}${item.text ? ` « ${item.text.slice(0, 40)} »` : ''}`
    : owner
      ? `Section « ${owner.name} »`
      : undefined;
  const context = [
    `Écran : « ${c.draft.name} », ${c.draft.sections.length} section(s).`,
    target && selection
      ? `Modifie uniquement l’élément sélectionné (${selection}, id ${c.selected}) sauf demande contraire.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="panel chat-panel" aria-labelledby="studio-chat">
      <div className="panel-head">
        <h2 id="studio-chat">Claude</h2>
        <select
          className="input input-sm"
          aria-label="Modèle Claude"
          value={assistant.info?.model ?? ''}
          disabled={!assistant.info || chat.pending}
          onChange={(e) => void assistant.chooseModel(e.target.value)}
        >
          {assistant.info?.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="context-chips" aria-label="Contexte envoyé">
        <Badge variant="secondary">Projet PFE</Badge>
        <Badge variant="secondary">Écran : {c.draft.name}</Badge>
        {selection && (
          <label className="chip-toggle">
            <input
              type="checkbox"
              checked={target}
              onChange={(e) => setTarget(e.target.checked)}
            />
            Cibler : {selection}
          </label>
        )}
      </div>
      <div className="thread" ref={log} aria-live="polite">
        {!c.turns.length && (
          <div className="thread-empty">
            <p className="muted">
              Décrivez l’écran ou une modification. Claude n’utilise que les
              composants du DS et ne modifie jamais le DS global.
            </p>
            {examples.map((x) => (
              <Button
                key={x}
                variant="outline"
                size="sm"
                disabled={!chat.available}
                onClick={() => chat.setDraft(x)}
              >
                {x}
              </Button>
            ))}
          </div>
        )}
        {c.turns.map((t, i) => (
          <p key={i} className="msg" data-role={t.role}>
            {t.text}
          </p>
        ))}
        {chat.pending && (
          <p className="msg" data-role="assistant" role="status">
            <span className="typing" aria-hidden="true" /> Claude compose…
          </p>
        )}
        {c.proposal && (
          <div className="proposal" role="region" aria-label="Proposition">
            <strong>Proposition · visible dans l’aperçu</strong>
            <ul>
              {c.proposal.changes.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="row">
              <Button size="sm" onClick={c.applyProposal}>
                Appliquer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => c.setProposal(undefined)}
              >
                Refuser
              </Button>
            </div>
          </div>
        )}
      </div>
      {c.error && (
        <p className="alert" role="alert">
          {c.error}
        </p>
      )}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void chat.send(undefined, context);
        }}
      >
        <label className="sr-only" htmlFor="studio-input">
          Message à Claude
        </label>
        <textarea
          id="studio-input"
          className="input"
          rows={3}
          maxLength={3500}
          value={chat.draft}
          disabled={!chat.available || chat.pending}
          placeholder={
            chat.available
              ? 'Décrire l’écran… (Entrée pour envoyer)'
              : (c.composer?.detail ?? 'Connexion à Claude…')
          }
          onChange={(e) => chat.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void chat.send(undefined, context);
            }
          }}
        />
        <div className="row">
          <small className="muted">Proposition à valider</small>
          {chat.pending ? (
            <Button variant="outline" size="sm" onClick={chat.stop}>
              Arrêter
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!chat.available || !chat.draft.trim()}
            >
              Envoyer
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

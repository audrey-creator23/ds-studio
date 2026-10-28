import { useEffect, useRef, useState } from 'react';
import { Send, Square, TriangleAlert } from 'lucide-react';
import { blockSpecs } from '../../shared/composition.js';
import type { CompositionState } from '../../client/design/useComposition.js';
import { useComposeChat } from '../../client/design/useComposeChat.js';
import { Button } from '../ui.js';

// Chat du studio : conversation, proposition éventuelle et saisie, rien
// d'autre. Contexte envoyé : l'écran et, si « Cibler » est coché, l'élément
// sélectionné. Chaque réponse est une proposition à valider.
export default function StudioChat({ c }: { c: CompositionState }) {
  const chat = useComposeChat(c);
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
    ? `${item.label || blockSpecs[item.kind].label}${item.text ? ` « ${item.text.slice(0, 30)} »` : ''}`
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
  const offline = !!c.composer && !c.composer.available;

  return (
    <section className="chat-panel" aria-label="Chat avec Claude">
      {offline && (
        <p className="key-alert" role="status" title={c.composer?.detail}>
          <TriangleAlert size={13} aria-hidden="true" /> Clé API non connectée
        </p>
      )}
      <div className="thread" ref={log} aria-live="polite">
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
        <p className="alert-text" role="alert">
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
        {selection && (
          <label className="chip-toggle">
            <input
              type="checkbox"
              checked={target}
              onChange={(e) => setTarget(e.target.checked)}
            />
            <span>Cibler : {selection}</span>
          </label>
        )}
        <div className="composer-box">
          <label className="sr-only" htmlFor="studio-input">
            Message à Claude
          </label>
          <textarea
            id="studio-input"
            rows={3}
            maxLength={3500}
            value={chat.draft}
            disabled={!chat.available || chat.pending}
            placeholder="Décrivez…"
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void chat.send(undefined, context);
              }
            }}
          />
          {chat.pending ? (
            <Button
              variant="outline"
              size="icon"
              aria-label="Arrêter"
              title="Arrêter"
              onClick={chat.stop}
            >
              <Square size={14} aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label="Envoyer"
              title="Envoyer"
              disabled={!chat.available || !chat.draft.trim()}
            >
              <Send size={14} aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

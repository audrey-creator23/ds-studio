import type { ReactNode } from 'react';
import { Card, CollapsibleCard, Surface } from './Card.js';
import ChatConversation from './ChatConversation.js';
import { useAssistantChat } from './useAssistantChat.js';

export default function AssistantPage({
  codex,
  brief,
}: {
  codex: ReactNode;
  brief: ReactNode;
}) {
  const { info, messages, busy, available, chooseModel, clear } =
    useAssistantChat();
  const lastUsage = [...messages].reverse().find((m) => m.usage)?.usage;
  return (
    <section className="page assistant-page" aria-labelledby="assistant-title">
      <header className="page-head">
        <div>
          <h2 id="assistant-title" tabIndex={-1}>
            Contexte & Assistant
          </h2>
          <p>
            Claude lit votre projet, sans rien modifier. Vous validez toujours.
          </p>
        </div>
        <label className="field model-picker">
          Modèle
          <select
            value={info?.model ?? ''}
            disabled={!info || busy}
            onChange={(e) => void chooseModel(e.target.value)}
          >
            {info?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="assistant-grid">
        <Card emoji="💬" title="Conversation" className="assistant-chat">
          <ChatConversation inputId="assistant-input" />
        </Card>
        <div className="assistant-side">
          <CollapsibleCard
            emoji="📚"
            title="Contexte"
            meta={`${info?.sources.filter((x) => x.available).length ?? '…'} sources`}
          >
            <ul className="assistant-sources">
              {info?.sources.map((src) => (
                <li key={src.id} className={src.available ? '' : 'is-missing'}>
                  <span aria-hidden="true">{src.available ? '✓' : '–'}</span>{' '}
                  {src.url ? (
                    <a href={src.url} target="_blank" rel="noreferrer">
                      {src.label}
                    </a>
                  ) : (
                    src.label
                  )}
                  {!src.available && <small> · vide</small>}
                </li>
              ))}
            </ul>
            <p className="card-summary">
              Lecture seule. Envoyé à Anthropic à chaque question.
            </p>
          </CollapsibleCard>
          <CollapsibleCard
            emoji="🔐"
            title="Connexion"
            meta={info ? (available ? 'Connecté' : 'Clé absente') : '…'}
          >
            <p className="card-summary">{info?.status.detail ?? '…'}</p>
            <p className="chat-note">
              Clé conservée côté serveur, jamais envoyée au navigateur.
            </p>
          </CollapsibleCard>
          <CollapsibleCard
            emoji="📏"
            title="Limites"
            meta={`${info?.limits.maxOutputTokens ?? '…'} tokens`}
          >
            <ul className="card-list">
              <li>
                {info?.limits.maxOutputTokens ?? '…'} tokens max par réponse
              </li>
              <li>{info?.limits.historyMessages ?? '…'} messages de mémoire</li>
              {lastUsage && (
                <li>
                  Dernière réponse : {lastUsage.input} entrée ·{' '}
                  {lastUsage.output} sortie
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => void clear()}
              disabled={busy || !messages.length}
            >
              Effacer l’historique ({messages.length})
            </button>
          </CollapsibleCard>
          <Surface component="div" className="assistant-brief">
            {brief}
          </Surface>
          <CollapsibleCard
            emoji="🤖"
            title="Codex"
            meta="Propositions de tokens"
          >
            <div className="assistant-codex">{codex}</div>
          </CollapsibleCard>
        </div>
      </div>
    </section>
  );
}

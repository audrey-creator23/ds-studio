import { useEffect, useRef, useState } from 'react';
import { requestStream } from '../api.js';
import type { Composition } from '../../shared/composition.js';
import type { CompositionState } from './useComposition.js';

// Envoi d'une demande de composition à Claude, partagé par l'atelier actuel
// et le studio v3. `context` précise l'écran ou la sélection ; il est envoyé
// à Claude mais n'apparaît pas dans la conversation affichée.
export function useComposeChat(c: CompositionState) {
  const { turns, setTurns } = c;
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  // Avancement en direct : statut puis début de la réponse de Claude.
  const [live, setLive] = useState<{ status?: string; reply?: string }>({});
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  // `skill` : skill accepté pour CE message (chargé par Claude Code).
  async function send(text = draft.trim(), context = '', skill?: string) {
    if (!text || pending) return;
    c.setError('');
    setPending(true);
    const abort = new AbortController();
    controller.current = abort;
    setTurns((t) => [...t, { role: 'user', text }]);
    try {
      setLive({});
      const r = await requestStream<{
        reply: string;
        question: boolean;
        proposal: Composition | null;
        changes: string[];
        skill?: string | null;
        skillLoaded?: boolean | null;
      }>(
        'compose',
        {
          message: (context ? `${context}\n\n` : '') + text,
          ...(skill ? { skill } : {}),
          composition: { ...c.draft, updatedAt: undefined },
          history: turns.slice(-10).map(({ role, text }) => ({
            role,
            text: text.slice(0, 4000),
          })),
        },
        (l) =>
          setLive((v) => ({
            status: typeof l.status === 'string' ? l.status : v.status,
            reply: typeof l.reply === 'string' ? l.reply : v.reply,
          })),
        abort.signal,
      );
      setDraft('');
      setTurns((t) => [
        ...t,
        {
          role: 'assistant',
          // Skill : chargement confirmé ou non par Claude Code, jamais supposé.
          text: r.skill
            ? `${r.reply}\n\nSkill ${r.skill} : ${r.skillLoaded ? 'chargé par Claude Code' : 'chargement non confirmé par Claude Code'}.`
            : r.reply,
          question: r.question,
        },
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
      setLive({});
      controller.current = null;
    }
  }
  return {
    draft,
    setDraft,
    pending,
    live,
    send,
    stop: () => controller.current?.abort(),
    available: c.composer?.available ?? false,
  };
}

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { postStream, request } from './api.js';
import type { Page } from './Sidebar.js';
import type { ChatMessage, ContextSource } from '../server/assistant.js';

export interface AssistantInfo {
  status: { available: boolean; detail: string };
  model: string;
  models: { id: string; label: string }[];
  limits: {
    maxOutputTokens: number;
    historyMessages: number;
    messageChars: number;
  };
  sources: ContextSource[];
  messages: ChatMessage[];
}
type StreamEvent =
  | { type: 'start'; sources: ContextSource[] }
  | { type: 'text'; text: string }
  | {
      type: 'done';
      notice?: string;
      messages: ChatMessage[];
    }
  | { type: 'error'; error: string };

// Conversation Claude unique, partagée par la page Assistant et la bulle
// flottante : même historique (enregistré côté serveur), même saisie, même
// réponse en cours. La clé API reste sur le serveur.
function useAssistantState(page: Page) {
  const [info, setInfo] = useState<AssistantInfo>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string>();
  const [streaming, setStreaming] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    request<AssistantInfo>('assistant').then(
      (i) => {
        setInfo(i);
        setMessages(i.messages);
      },
      (e: Error) => setError(e.message),
    );
    return () => controller.current?.abort();
  }, []);
  const busy = pending !== undefined;
  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setError('');
    setPending(text);
    setStreaming('');
    const abort = new AbortController();
    controller.current = abort;
    let received = '';
    try {
      for await (const event of postStream<StreamEvent>(
        'assistant',
        { message: text, page },
        abort.signal,
      )) {
        if (event.type === 'text') {
          received += event.text;
          setStreaming(received);
        } else if (event.type === 'done') {
          setMessages(event.messages);
          setDraft('');
          if (event.notice) setError(event.notice);
        } else if (event.type === 'error') {
          setError(event.error);
          if (received)
            setMessages((m) => [
              ...m,
              { role: 'user', text, date: new Date().toISOString() },
              {
                role: 'assistant',
                text: received,
                date: new Date().toISOString(),
                error: event.error,
              },
            ]);
        }
      }
    } catch (e) {
      setError(
        abort.signal.aborted
          ? 'Réponse interrompue. Votre message reste dans la zone de saisie.'
          : (e as Error).message,
      );
    } finally {
      setPending(undefined);
      setStreaming('');
      controller.current = null;
    }
  }
  async function chooseModel(model: string) {
    try {
      const saved = await request<{ model: string }>('assistant/model', {
        model,
      });
      setInfo((i) => i && { ...i, model: saved.model });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function clear() {
    if (!window.confirm('Effacer tout l’historique de la conversation ?'))
      return;
    try {
      setMessages(
        (await request<{ messages: ChatMessage[] }>('assistant/clear', {}))
          .messages,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return {
    info,
    messages,
    draft,
    setDraft,
    pending,
    streaming,
    error,
    busy,
    available: info?.status.available ?? false,
    page,
    send,
    stop: () => controller.current?.abort(),
    chooseModel,
    clear,
  };
}
export type AssistantChat = ReturnType<typeof useAssistantState>;

const Context = createContext<AssistantChat | null>(null);
export function AssistantProvider({
  page,
  children,
}: {
  page: Page;
  children: ReactNode;
}) {
  return (
    <Context.Provider value={useAssistantState(page)}>
      {children}
    </Context.Provider>
  );
}
export function useAssistantChat() {
  const chat = useContext(Context);
  if (!chat) throw new Error('AssistantProvider manquant.');
  return chat;
}

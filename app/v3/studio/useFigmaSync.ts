import { useEffect, useRef, useState, type RefObject } from 'react';
import { figmaTarget } from '../../shared/figmaTarget.js';
import type { Composition } from '../../shared/composition.js';
import type { Tokens } from '../../shared/model.js';
import { request } from '../../client/api.js';
import { buildScene } from './figmaScene.js';

// Envoi de l'écran au plugin DS-Studio Bridge et suivi réel de l'import,
// partagés par l'export et le bouton « Actualiser Figma ». Messages :
// « Ouverture de Figma… », « Import confirmé » (seulement après le compte
// rendu du plugin) ou une erreur avec l'action à faire. Figma ne lance
// jamais un plugin depuis l'extérieur : s'il est fermé, l'activation est
// demandée. Après 2 min sans réponse, diagnostic réel et relance.
export type FigmaSyncState = 'idle' | 'busy' | 'imported' | 'error';
type Status = {
  connected: boolean;
  paired: boolean;
  last: { state: string; message?: string; at: string } | null;
};
export type FigmaMeta = {
  device: string;
  scheme: 'light' | 'dark';
  tokens?: Tokens;
};
// Action proposée après un échec.
export type FigmaAction = 'retry' | 'browser' | null;

const opening = 'Ouverture de Figma…';
const launch =
  'Action requise : dans Figma, lancez DS-Studio Bridge (⌥⌘P ou bouton « Importer depuis DS-Studio »).';

// Ouvre l'application Figma (schéma figma:// déclaré par l'app macOS).
// Si la page garde le focus au bout de 2,5 s, l'app ne s'est pas ouverte.
export function openFigmaDesktop(onFail: () => void) {
  let left = false;
  const mark = () => (left = true);
  addEventListener('blur', mark);
  document.addEventListener('visibilitychange', mark);
  location.assign(figmaTarget.desktop);
  setTimeout(() => {
    removeEventListener('blur', mark);
    document.removeEventListener('visibilitychange', mark);
    if (!left && document.hasFocus()) onFail();
  }, 2500);
}

export function useFigmaSync() {
  const [since, setSince] = useState<string>();
  const [state, setState] = useState<FigmaSyncState>('idle');
  const [text, setText] = useState('');
  const [action, setAction] = useState<FigmaAction>(null);
  // Code d'appairage : seulement si le plugin n'a jamais été configuré.
  const [pairing, setPairing] = useState<string>();
  // Figma Desktop non ouvert : message gardé tant que rien d'autre n'arrive.
  const blocked = useRef(false);
  const fail = (t: string, a: FigmaAction) => {
    blocked.current = a === 'browser';
    setState('error');
    setText(t);
    setAction(a);
  };
  useEffect(() => {
    if (!since) return;
    let stop = false;
    let seen = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const s = await request<Status>('figma/status');
        seen ||= s.connected;
        const fresh = s.last && s.last.at >= since ? s.last : undefined;
        if (fresh?.state === 'imported') {
          blocked.current = false;
          setState('imported');
          setText('Import confirmé');
          setAction(null);
          setPairing(undefined);
          setTimeout(() => !stop && setState('idle'), 6000);
          return;
        }
        if (fresh?.state === 'error')
          return fail(
            `Erreur dans Figma : ${fresh.message ?? 'import refusé'}`,
            'retry',
          );
        if (!blocked.current)
          setText(
            fresh?.state === 'waiting'
              ? 'Action requise : confirmez le remplacement de l’écran dans Figma.'
              : s.connected || Date.now() - started < 20_000
                ? opening
                : launch,
          );
      } catch {
        return fail(
          'Statut Figma indisponible : DS-Studio ne répond pas.',
          'retry',
        );
      }
      if (stop) return;
      if (Date.now() - started < 120_000) setTimeout(tick, 2000);
      // Diagnostic après 2 min : plugin jamais vu, ou vu sans import.
      else
        fail(
          seen
            ? 'Le plugin est ouvert mais n’a pas importé : ouvrez le fichier « DS-Studio — Mes maquettes » dans Figma, puis relancez.'
            : 'DS-Studio Bridge n’a pas été lancé dans Figma : lancez-le (⌥⌘P), puis relancez.',
          'retry',
        );
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [since]);

  // Plugin ouvert ? Lu à l'avance (local, léger) : Figma s'ouvre au clic
  // même, sans attente réseau qui ferait perdre le geste utilisateur.
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const read = () =>
      request<Status>('figma/status').then(
        (s) => setConnected(s.connected),
        () => setConnected(false),
      );
    void read();
    const timer = setInterval(read, 5000);
    addEventListener('focus', read);
    return () => {
      clearInterval(timer);
      removeEventListener('focus', read);
    };
  }, []);

  const last = useRef<Parameters<typeof send>>(null);
  // À appeler au clic même. `update` : mise à jour explicite de l'écran.
  async function send(
    frame: RefObject<HTMLIFrameElement | null>,
    composition: Composition,
    meta: FigmaMeta | undefined,
    update = false,
  ) {
    last.current = [frame, composition, meta, update];
    if (!connected)
      openFigmaDesktop(() =>
        fail(
          'Figma Desktop ne s’est pas ouvert : ouvrez l’application Figma, ou utilisez le navigateur.',
          'browser',
        ),
      );
    setState('busy');
    setText(opening);
    setAction(null);
    try {
      const doc = frame.current?.contentDocument;
      if (!doc) throw new Error('Aperçu indisponible.');
      const scene = buildScene(doc, composition, {
        device: meta?.device ?? 'screen',
        scheme: meta?.scheme ?? 'light',
        tokens: meta?.tokens,
      });
      if (update) scene.update = true;
      const [r, s] = await Promise.all([
        request<{ pairing: string }>('figma/scene', { scene }),
        request<Status>('figma/status').catch(() => null),
      ]);
      setPairing(s?.paired ? undefined : r.pairing);
      setSince(scene.createdAt);
    } catch (e) {
      fail((e as Error).message, 'retry');
    }
  }
  const retry = () => {
    if (last.current) void send(...last.current);
  };
  const browser = () => window.open(figmaTarget.url, '_blank', 'noopener');
  return { state, text, action, pairing, send, retry, browser };
}

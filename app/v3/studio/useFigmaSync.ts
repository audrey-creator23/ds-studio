import { useEffect, useState, type RefObject } from 'react';
import { figmaTarget } from '../../shared/figmaTarget.js';
import type { Composition } from '../../shared/composition.js';
import type { Tokens } from '../../shared/model.js';
import { request } from '../../client/api.js';
import { buildScene } from './figmaScene.js';

// Envoi de l'écran au plugin DS-Studio Bridge et suivi réel de l'import,
// partagés par l'onglet Export et le bouton « Actualiser Figma ». Le succès
// n'est annoncé qu'après le compte rendu du plugin. Figma ne lance jamais
// un plugin depuis l'extérieur : s'il est fermé, le fichier cible s'ouvre
// et l'action restante est indiquée (bouton Relaunch ou ⌥⌘P).
export type FigmaSyncState =
  'idle' | 'busy' | 'waiting' | 'closed' | 'imported' | 'error';
type Status = {
  connected: boolean;
  last: { state: string; message?: string; at: string } | null;
};
export type FigmaMeta = {
  device: string;
  scheme: 'light' | 'dark';
  tokens?: Tokens;
};

export const pluginClosed =
  'Fichier Figma ouvert : lancez DS-Studio Bridge (bouton « Importer depuis DS-Studio » du panneau de droite, ou ⌥⌘P), l’import se fait seul.';

export function useFigmaSync() {
  const [since, setSince] = useState<string>();
  const [state, setState] = useState<FigmaSyncState>('idle');
  const [text, setText] = useState('');
  useEffect(() => {
    if (!since) return;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const s = await request<Status>('figma/status');
        const fresh = s.last && s.last.at >= since ? s.last : undefined;
        if (fresh?.state === 'imported') {
          setState('imported');
          setText(`Importé dans Figma (${fresh.message ?? 'calques créés'}).`);
          // Confirmation lisible quelques secondes, puis retour au repos.
          setTimeout(() => !stop && setState('idle'), 6000);
          return;
        }
        if (fresh?.state === 'error') {
          setState('error');
          setText(`Erreur dans Figma : ${fresh.message}`);
          return;
        }
        if (fresh?.state === 'waiting') {
          setState('waiting');
          setText(
            'Dans Figma : confirmez le remplacement de l’écran existant.',
          );
        } else {
          setState(s.connected ? 'busy' : 'closed');
          setText(
            s.connected ? 'Plugin connecté : import en cours…' : pluginClosed,
          );
        }
      } catch {
        setState('error');
        setText('Statut Figma indisponible.');
        return;
      }
      if (stop) return;
      if (Date.now() - started < 120_000) setTimeout(tick, 2000);
      else {
        setState('error');
        setText('Aucune réponse du plugin Figma (2 min). Réessayez.');
      }
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [since]);

  // Plugin ouvert dans Figma ? Lu à l'avance (local, léger) pour ouvrir le
  // fichier cible au clic même, sans fenêtre bloquée ni onglet superflu.
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

  // À appeler au clic même (geste utilisateur, pour ouvrir le fichier).
  // `update` : mise à jour explicite de l'écran, sans doublon ni question.
  async function send(
    frame: RefObject<HTMLIFrameElement | null>,
    composition: Composition,
    meta: FigmaMeta | undefined,
    update = false,
  ) {
    if (!connected) window.open(figmaTarget.url, '_blank', 'noopener');
    setState('busy');
    setText('Envoi à Figma…');
    try {
      const doc = frame.current?.contentDocument;
      if (!doc) throw new Error('Aperçu indisponible.');
      const scene = buildScene(doc, composition, {
        device: meta?.device ?? 'screen',
        scheme: meta?.scheme ?? 'light',
        tokens: meta?.tokens,
      });
      if (update) scene.update = true;
      const r = await request<{
        pairing: string;
        nodes: number;
        warnings: string[];
      }>('figma/scene', { scene });
      setSince(scene.createdAt);
      return r;
    } catch (e) {
      setState('error');
      setText((e as Error).message);
      throw e;
    }
  }
  return { state, text, send };
}

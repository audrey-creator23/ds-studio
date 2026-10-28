import { useEffect, useState, type RefObject } from 'react';
import { figmaTarget } from '../../shared/figmaTarget.js';
import type { Composition } from '../../shared/composition.js';
import { Button } from '../ui.js';
import { exportReact } from './exportReact.js';
import { buildScene } from './figmaScene.js';
import { request } from '../../client/api.js';
import type { Tokens } from '../../shared/model.js';

// Export réel de l'écran, partagé par l'onglet Export et le bouton
// « Enregistrer ». Images et HTML : rendus par l'iframe d'aperçu elle-même
// (styles, polices, dimensions du cadre). Figma : l'écran mesuré est confié
// au serveur local ; c'est le plugin DS-Studio Bridge, lancé par
// l'utilisatrice dans le fichier Figma de son choix, qui crée les calques.
const formats = [
  { id: 'png', label: 'Image PNG', ext: 'png' },
  { id: 'jpeg', label: 'Image JPEG', ext: 'jpg' },
  { id: 'html', label: 'Code source HTML/CSS', ext: 'html' },
  { id: 'tsx', label: 'Composant React/TSX', ext: 'tsx' },
  { id: 'figma', label: 'Figma (plugin DS-Studio Bridge)', ext: '' },
] as const;
type Format = (typeof formats)[number]['id'];

function download(name: string, href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'ecran';

function fromPreview(
  frame: HTMLIFrameElement | null,
  format: 'png' | 'jpeg' | 'html',
) {
  return new Promise<string>((resolve, reject) => {
    if (!frame?.contentWindow) return reject(new Error('Aperçu indisponible.'));
    const id = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      removeEventListener('message', onResult);
      reject(new Error('L’aperçu n’a pas répondu.'));
    }, 20000);
    function onResult(e: MessageEvent) {
      if (e.source !== frame!.contentWindow || e.data?.id !== id) return;
      clearTimeout(timer);
      removeEventListener('message', onResult);
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.data as string);
    }
    addEventListener('message', onResult);
    frame.contentWindow.postMessage(
      { type: 'ds-export', id, format },
      location.origin,
    );
  });
}

export default function ExportPanel({
  composition,
  frameRef,
  size,
  onDone,
  onName,
  meta,
}: {
  composition: Composition;
  frameRef: RefObject<HTMLIFrameElement | null>;
  size: string;
  onDone?: () => void;
  // Nom de l'écran, demandé ici seulement (fichier exporté).
  onName: (name: string) => void;
  // Contexte de l'export Figma : appareil, thème, tokens du DS.
  meta?: { device: string; scheme: 'light' | 'dark'; tokens?: Tokens };
}) {
  const [format, setFormat] = useState<Format>('png');
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok' | 'error'; text: string }
  >({ kind: 'idle' });
  const name = slug(composition.name);
  // Suivi réel après un envoi Figma : plugin connecté, importé, erreur.
  const [figma, setFigma] = useState<{ since: string; screenId: string }>();
  // Plugin ouvert dans Figma ? Lu dès que le format Figma est choisi, pour
  // ouvrir le fichier cible au clic (sans blocage de fenêtre) s'il est fermé.
  const [pluginOpen, setPluginOpen] = useState<boolean>();
  useEffect(() => {
    if (format !== 'figma') return;
    request<{ connected: boolean }>('figma/status').then(
      (s) => setPluginOpen(s.connected),
      () => setPluginOpen(false),
    );
  }, [format]);
  const [live, setLive] = useState<string>();
  useEffect(() => {
    if (!figma) return;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const s = await request<{
          connected: boolean;
          last: {
            state: string;
            screenId?: string;
            message?: string;
            at: string;
          } | null;
        }>('figma/status');
        const fresh = s.last && s.last.at >= figma.since ? s.last : undefined;
        if (fresh?.state === 'imported') {
          setLive(`Importé dans Figma (${fresh.message ?? 'calques créés'}).`);
          return;
        }
        if (fresh?.state === 'error') {
          setLive(`Erreur dans Figma : ${fresh.message}`);
          return;
        }
        setLive(
          fresh?.state === 'waiting'
            ? 'Dans Figma : confirmez le remplacement de l’écran existant.'
            : s.connected
              ? 'Plugin connecté : import en cours…'
              : 'Fichier Figma ouvert : lancez DS-Studio Bridge (bouton « Importer depuis DS-Studio » du panneau de droite, ou ⌥⌘P), l’import se fait seul.',
        );
      } catch {
        setLive('Statut Figma indisponible.');
      }
      if (!stop && Date.now() - started < 120_000) setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [figma]);
  async function run() {
    // Au clic même (geste utilisateur) : fichier cible ouvert si le plugin
    // n'y tourne pas déjà. Figma ne lance jamais un plugin tout seul.
    if (format === 'figma' && !pluginOpen)
      window.open(figmaTarget.url, '_blank', 'noopener');
    setState({ kind: 'busy' });
    try {
      const f = formats.find((x) => x.id === format)!;
      if (format === 'figma') {
        const doc = frameRef.current?.contentDocument;
        if (!doc) throw new Error('Aperçu indisponible.');
        const scene = buildScene(doc, composition, {
          device: meta?.device ?? 'screen',
          scheme: meta?.scheme ?? 'light',
          tokens: meta?.tokens,
        });
        const r = await request<{
          pairing: string;
          nodes: number;
          warnings: string[];
        }>('figma/scene', { scene });
        setState({
          kind: 'ok',
          text: `Envoyé : ${r.nodes} calques${r.warnings.length ? `, ${r.warnings.length} point(s) signalé(s)` : ''}. Code d’appairage (une seule fois dans le plugin) : ${r.pairing}`,
        });
        setFigma({ since: scene.createdAt, screenId: scene.screenId });
        return;
      }
      if (format === 'tsx') {
        const code = exportReact(composition);
        const url = URL.createObjectURL(
          new Blob([code], { type: 'text/plain' }),
        );
        download(`${name}.tsx`, url);
        URL.revokeObjectURL(url);
      } else {
        const data = await fromPreview(frameRef.current, format);
        if (format === 'html') {
          const url = URL.createObjectURL(
            new Blob([data], { type: 'text/html' }),
          );
          download(`${name}.html`, url);
          URL.revokeObjectURL(url);
        } else download(`${name}.${f.ext}`, data);
      }
      setState({ kind: 'ok', text: `${f.label} téléchargé (${size}).` });
      onDone?.();
    } catch (e) {
      setState({ kind: 'error', text: (e as Error).message });
    }
  }
  const defaults = ['Écran 1', 'Nouvelle page'];
  return (
    <div className="export">
      <input
        className="export-name"
        aria-label="Nom de l’écran"
        placeholder="Donnez un nom à votre écran…"
        maxLength={60}
        autoFocus
        value={defaults.includes(composition.name) ? '' : composition.name}
        onChange={(e) => onName(e.target.value || 'Écran 1')}
      />
      <fieldset className="export-formats">
        <legend>Format</legend>
        {formats.map((f) => (
          <label key={f.id}>
            <input
              type="radio"
              name="export-format"
              value={f.id}
              checked={format === f.id}
              onChange={() => setFormat(f.id)}
            />
            <span>{f.label}</span>
            {f.id === 'figma' && (
              <small>
                Calques éditables et Auto Layout, créés par le plugin dans le
                fichier que vous ouvrez (jamais le kit source).
              </small>
            )}
          </label>
        ))}
      </fieldset>
      {figma && (
        <p className="figma-live" role="status">
          {live ?? 'Connexion au plugin…'}{' '}
          <a href={figmaTarget.url} target="_blank" rel="noreferrer">
            Ouvrir le fichier Figma
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </p>
      )}
      <p className="muted small">
        Rendu de l’écran « {composition.name} » tel qu’affiché ({size}).
      </p>
      <div className="row">
        <span
          className={state.kind === 'error' ? 'alert-text' : 'muted small'}
          role={state.kind === 'error' ? 'alert' : 'status'}
        >
          {state.kind === 'busy'
            ? 'Export en cours…'
            : state.kind === 'idle'
              ? ''
              : state.text}
        </span>
        <Button
          size="sm"
          disabled={state.kind === 'busy'}
          onClick={() => void run()}
        >
          Valider
        </Button>
      </div>
    </div>
  );
}

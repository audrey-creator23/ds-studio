import { useState, type RefObject } from 'react';
import { figmaTarget } from '../../shared/figmaTarget.js';
import type { Composition } from '../../shared/composition.js';
import { Button } from '../ui.js';
import { exportReact } from './exportReact.js';
import { useFigmaSync } from './useFigmaSync.js';
import type { Tokens } from '../../shared/model.js';
import { defaultConfig } from '../../client/design/componentSpecs.js';

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

// Images : rendues dans une copie invisible de l'aperçu, toujours en thème
// clair et sans sélection, aux mêmes dimensions. L'aperçu visible et le
// thème de travail ne changent pas (aucun flash).
async function fromLightCopy(
  frame: HTMLIFrameElement | null,
  composition: Composition,
  tokens: Tokens,
  format: 'png' | 'jpeg',
  transparent: boolean,
) {
  if (!frame) throw new Error('Aperçu indisponible.');
  const copy = document.createElement('iframe');
  copy.setAttribute('aria-hidden', 'true');
  copy.tabIndex = -1;
  copy.style.cssText = `position:fixed;left:-100000px;top:0;border:0;pointer-events:none;width:${frame.clientWidth}px;height:${frame.clientHeight}px`;
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('L’aperçu n’a pas répondu.')),
      20000,
    );
    const onReady = (e: MessageEvent) => {
      if (
        e.source !== copy.contentWindow ||
        e.data?.type !== 'ds-preview-ready'
      )
        return;
      clearTimeout(timer);
      removeEventListener('message', onReady);
      resolve();
    };
    addEventListener('message', onReady);
  });
  copy.src = frame.src;
  document.body.append(copy);
  try {
    await ready;
    copy.contentWindow!.postMessage(
      {
        type: 'ds-preview',
        tokens,
        screen: 'compose',
        config: defaultConfig,
        composition,
        interact: false,
        scheme: 'light',
      },
      location.origin,
    );
    return await fromPreview(copy, format, transparent);
  } finally {
    copy.remove();
  }
}

function fromPreview(
  frame: HTMLIFrameElement | null,
  format: 'png' | 'jpeg' | 'html',
  transparent = false,
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
      { type: 'ds-export', id, format, transparent },
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
  // PNG seulement ; décochée par défaut et à chaque changement de format.
  const [transparent, setTransparent] = useState(false);
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok' | 'error'; text: string }
  >({ kind: 'idle' });
  const name = slug(composition.name);
  // Envoi et suivi réel de l'import Figma (partagés avec la barre d'aperçu).
  const figma = useFigmaSync();
  const [sent, setSent] = useState(false);
  async function run() {
    setState({ kind: 'busy' });
    try {
      const f = formats.find((x) => x.id === format)!;
      if (format === 'figma') {
        const r = await figma.send(frameRef, composition, meta);
        setState({
          kind: 'ok',
          text: `Envoyé : ${r.nodes} calques${r.warnings.length ? `, ${r.warnings.length} point(s) signalé(s)` : ''}. Code d’appairage (une seule fois dans le plugin) : ${r.pairing}`,
        });
        setSent(true);
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
        const data =
          format !== 'html' && meta?.tokens
            ? await fromLightCopy(
                frameRef.current,
                composition,
                meta.tokens,
                format,
                format === 'png' && transparent,
              )
            : await fromPreview(frameRef.current, format);
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
              onChange={() => {
                setFormat(f.id);
                setTransparent(false);
              }}
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
      {format === 'png' && (
        <label className="export-check">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
          />
          Sans fond (transparent)
        </label>
      )}
      {sent && (
        <p className="figma-live" role="status">
          {figma.text || 'Connexion au plugin…'}{' '}
          <a href={figmaTarget.url} target="_blank" rel="noreferrer">
            Ouvrir le fichier Figma
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </p>
      )}
      <p className="muted small">
        {format === 'png' || format === 'jpeg'
          ? `Rendu de l’écran « ${composition.name} » en thème clair (${size}).`
          : `Rendu de l’écran « ${composition.name} » tel qu’affiché (${size}).`}
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

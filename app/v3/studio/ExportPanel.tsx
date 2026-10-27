import { useState, type RefObject } from 'react';
import type { Composition } from '../../shared/composition.js';
import { Button } from '../ui.js';
import { exportReact } from './exportReact.js';

// Export réel de l'écran, partagé par l'onglet Export et le bouton
// « Enregistrer ». Images et HTML : rendus par l'iframe d'aperçu elle-même
// (styles, polices, dimensions du cadre). Figma : pas d'intégration en
// écriture dans l'application, donc indisponible, jamais simulé.
const formats = [
  { id: 'png', label: 'Image PNG', ext: 'png' },
  { id: 'jpeg', label: 'Image JPEG', ext: 'jpg' },
  { id: 'html', label: 'Code source HTML/CSS', ext: 'html' },
  { id: 'tsx', label: 'Composant React/TSX', ext: 'tsx' },
  { id: 'figma', label: 'Figma', ext: '' },
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
}: {
  composition: Composition;
  frameRef: RefObject<HTMLIFrameElement | null>;
  size: string;
  onDone?: () => void;
}) {
  const [format, setFormat] = useState<Format>('png');
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok' | 'error'; text: string }
  >({ kind: 'idle' });
  const name = slug(composition.name);
  async function run() {
    setState({ kind: 'busy' });
    try {
      const f = formats.find((x) => x.id === format)!;
      if (format === 'figma') throw new Error('Export Figma indisponible.');
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
  return (
    <div className="export">
      <fieldset className="export-formats">
        <legend>Format</legend>
        {formats.map((f) => (
          <label key={f.id} data-disabled={f.id === 'figma' || undefined}>
            <input
              type="radio"
              name="export-format"
              value={f.id}
              checked={format === f.id}
              disabled={f.id === 'figma'}
              onChange={() => setFormat(f.id)}
            />
            <span>{f.label}</span>
            {f.id === 'figma' && (
              <small>
                Indisponible : aucune intégration Figma en écriture n’est
                autorisée dans DS-Studio.
              </small>
            )}
          </label>
        ))}
      </fieldset>
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

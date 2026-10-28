import { useEffect, useRef, useState, type RefObject } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from '../ui.js';
import {
  audit,
  hex,
  over,
  parse,
  propose,
  ratio,
  type Issue,
} from './contrast.js';

// Audit actif : contours temporaires dans l'aperçu (outline, sans toucher
// au style ni à la mise en page), recalculé à chaque rendu de l'écran.
// Clic sur un élément signalé : popover (la sélection normale est suspendue
// pour cet élément seulement).
const STYLE_ID = 'ds-contrast-audit';
const CSS = `[data-contrast='fail']{outline:2px solid #e11d48 !important;outline-offset:1px;cursor:help}
[data-contrast='unknown']{outline:2px dashed #d97706 !important;outline-offset:1px;cursor:help}`;

export type Picked = { issue: Issue; x: number; y: number };

export function useContrastAudit(
  frame: RefObject<HTMLIFrameElement | null>,
  on: boolean,
  // Change quand l'iframe peut être recréée (appareil) : on se rebranche.
  host?: string,
) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [picked, setPicked] = useState<Picked>();
  const list = useRef<Issue[]>([]);
  useEffect(() => {
    if (!on) {
      setIssues([]);
      setPicked(undefined);
      return;
    }
    const iframe = frame.current;
    if (!iframe) return;
    let doc: Document | null = null;
    let observer: MutationObserver | undefined;
    let timer = 0;
    const clear = (d: Document) => {
      d.querySelectorAll('[data-contrast]').forEach((e) =>
        e.removeAttribute('data-contrast'),
      );
    };
    const run = () => {
      if (!doc) return;
      observer?.disconnect();
      clear(doc);
      const found = audit(doc);
      for (const i of found)
        i.el.setAttribute(
          'data-contrast',
          i.ratio === undefined ? 'unknown' : 'fail',
        );
      list.current = found;
      setIssues(found);
      setPicked((p) =>
        p && found.some((i) => i.el === p.issue.el) ? p : undefined,
      );
      observer?.observe(doc.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest?.('[data-contrast]');
      const issue = el && list.current.find((i) => i.el === el);
      if (!issue) return;
      e.preventDefault();
      e.stopPropagation();
      const box = iframe.getBoundingClientRect();
      const scale = box.width / (iframe.offsetWidth || box.width);
      const r = issue.el.getBoundingClientRect();
      setPicked({
        issue,
        x: Math.min(innerWidth - 300, Math.max(8, box.left + r.left * scale)),
        y: Math.min(innerHeight - 260, box.top + r.bottom * scale + 6),
      });
    };
    const attach = () => {
      doc = iframe.contentDocument;
      if (!doc?.body) return;
      if (!doc.getElementById(STYLE_ID)) {
        const s = doc.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        doc.head.append(s);
      }
      observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = window.setTimeout(run, 150);
      });
      doc.addEventListener('click', onClick, true);
      run();
    };
    attach();
    iframe.addEventListener('load', attach);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      iframe.removeEventListener('load', attach);
      if (doc) {
        doc.removeEventListener('click', onClick, true);
        clear(doc);
        doc.getElementById(STYLE_ID)?.remove();
      }
    };
  }, [on, frame, host]);
  return { issues, picked, setPicked };
}

const fmt = (r: number) => `${r.toFixed(2).replace('.', ',')}:1`;

export function ContrastPopover({
  picked,
  onClose,
  onApply,
}: {
  picked: Picked;
  onClose: () => void;
  // Correction validée : fond de l'élément propriétaire (id) ou de l'écran ('').
  onApply: (owner: string, color: string) => void;
}) {
  const { issue } = picked;
  const [fix, setFix] = useState<string>();
  const after = fix ? parse(fix) : undefined;
  const ink = (bg: [number, number, number, number]) =>
    issue.kind === 'text' && issue.fg ? over(issue.fg, bg) : issue.fg!;
  return (
    <div
      className="contrast-pop"
      role="dialog"
      aria-label="Contraste insuffisant"
      style={{ left: picked.x, top: picked.y }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="panel-head">
        <strong>
          <TriangleAlert size={14} aria-hidden="true" />{' '}
          {issue.kind === 'text' ? 'Texte' : 'Composant'} non conforme
        </strong>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fermer"
          autoFocus
          onClick={onClose}
        >
          <X size={14} aria-hidden="true" />
        </Button>
      </div>
      {issue.ratio === undefined ? (
        <p className="muted small">
          Non calculable : {issue.reason}. Vérifiez à l’œil ou avec un outil
          dédié.
        </p>
      ) : (
        <>
          <p className="small">
            Ratio actuel <strong>{fmt(issue.ratio)}</strong> · requis{' '}
            <strong>{fmt(issue.required)}</strong>
            {issue.kind === 'text' && issue.required === 3
              ? ' (grand texte)'
              : ''}
          </p>
          {fix && after ? (
            <>
              <div className="contrast-compare">
                {(
                  [
                    ['Avant', issue.bg!],
                    ['Après', after],
                  ] as const
                ).map(([label, bg]) => (
                  <figure key={label}>
                    <span style={{ background: hex(bg), color: hex(ink(bg)) }}>
                      Aa
                    </span>
                    <figcaption>
                      {label} · {hex(bg)} · {fmt(ratio(ink(bg), bg))}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFix(undefined)}
                >
                  Annuler
                </Button>
                <Button size="sm" onClick={() => onApply(issue.owner!, fix)}>
                  Appliquer
                </Button>
              </div>
            </>
          ) : issue.owner === undefined ? (
            <p className="muted small">
              Couleurs issues du DS : à corriger dans les tokens, jamais
              modifiés depuis l’atelier.
            </p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                const p = propose(issue);
                if (p) setFix(hex(p));
              }}
              disabled={!propose(issue)}
            >
              Corriger
            </Button>
          )}
        </>
      )}
    </div>
  );
}

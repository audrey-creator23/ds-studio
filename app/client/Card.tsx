import { useId, useState, type ReactNode } from 'react';

// Carte unique des pages Brief, Volcan et Assistant : mêmes marges, bordures,
// rayon, titres et emoji à taille de titre. La taille suit le contenu.
export function Card({
  emoji,
  title,
  className = '',
  children,
}: {
  emoji?: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={`card ${className}`}>
      <h3 className="card-title">
        {emoji && (
          <span className="card-emoji" aria-hidden="true">
            {emoji}
          </span>
        )}
        {title}
      </h3>
      {children}
    </article>
  );
}

export function Toggle({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="card-toggle">
      <summary>{label}</summary>
      <div className="card-toggle-body">{children}</div>
    </details>
  );
}

// Détail repliable dont le bouton partage une ligne avec un autre contenu
// (légende, résumé) ; le contenu s'ouvre en dessous, sur toute la largeur.
export function Expandable({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div className="card-foot">
        {aside}
        <button
          type="button"
          className="toggle-button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {label}
        </button>
      </div>
      {open && (
        <div id={id} className="card-toggle-body">
          {children}
        </div>
      )}
    </>
  );
}

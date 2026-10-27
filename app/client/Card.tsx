import type { ReactNode } from 'react';

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

import { useLayoutEffect, useRef, type ReactNode } from 'react';

// Grille Bento compacte, commune à toutes les pages : 12 colonnes, largeur
// fixée par la classe de taille de chaque carte (size-s/m/l/q/full), hauteur
// libre. Chaque carte occupe autant de rangées de 4 px que son contenu : ouvrir
// un détail n'étire jamais ses voisines et la grille se recompacte seule.
const ROW = 4;

export default function Masonry({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const grid = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = grid.current;
    if (!element) return;
    const place = (card: Element) => {
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      const height = card.getBoundingClientRect().height;
      (card as HTMLElement).style.gridRowEnd =
        `span ${Math.max(1, Math.ceil((height + gap) / ROW))}`;
    };
    const resize = new ResizeObserver((entries) =>
      entries.forEach((e) => place(e.target)),
    );
    const watch = () =>
      Array.from(element.children).forEach((c) => resize.observe(c));
    watch();
    const added = new MutationObserver(watch);
    added.observe(element, { childList: true });
    return () => {
      resize.disconnect();
      added.disconnect();
    };
  }, []);
  return (
    <div ref={grid} className={`masonry ${className}`}>
      {children}
    </div>
  );
}

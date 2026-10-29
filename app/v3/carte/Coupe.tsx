import { useEffect, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '../ui.js';

// Coupe ouest → est sous la Martinique : la plaque Amérique (Atlantique)
// plonge sous la plaque Caraïbe (≈ 2 cm/an). Animation en 4 étapes :
// subduction, blocage, rupture (ondes), soulèvement du fond = tsunami.
// Schéma explicatif : échelles et distances approximatives.
const steps = [
  'La plaque Atlantique plonge sous la plaque Caraïbe, d’environ 2 cm par an.',
  'Au contact, les plaques se bloquent : les contraintes s’accumulent pendant des années.',
  'Rupture brutale : c’est le séisme. Les ondes se propagent dans la roche, puis des répliques suivent.',
  'Si la rupture soulève le fond de la mer, toute la colonne d’eau monte : un tsunami part vers les côtes.',
];

export default function Coupe({
  reduced,
  onClose,
}: {
  reduced: boolean;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(!reduced);
  const [step, setStep] = useState(reduced ? 3 : 0);
  // Lecture : une étape toutes les 3,5 s, en boucle.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep((s) => (s + 1) % steps.length), 3500);
    return () => clearInterval(t);
  }, [playing]);
  return (
    <section
      className="carte-coupe"
      role="dialog"
      aria-label="Coupe : subduction, séismes et tsunamis"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <header>
        <h2>Sous la Martinique : coupe ouest → est</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fermer la coupe"
          title="Fermer"
          autoFocus
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </header>
      <svg
        viewBox="0 0 600 260"
        role="img"
        aria-label="Schéma de la subduction de la plaque Atlantique sous la plaque Caraïbe"
        data-playing={playing || undefined}
        data-step={step}
      >
        <rect x="0" y="0" width="600" height="60" className="c-sky" />
        <rect x="0" y="60" width="600" height="22" className="c-sea" />
        {/* Plaque Caraïbe (chevauchante) et île volcanique. */}
        <path d="M0 82 H470 L430 120 L0 120 Z" className="c-plate-up" />
        <path
          d="M210 82 L232 52 L246 44 L262 58 L290 82 Z"
          className="c-island"
        />
        <path d="M246 46 Q246 30 252 20" className="c-plume" />
        {/* Remontée de magma depuis la plaque plongeante (~100 km). */}
        <path d="M246 120 C250 160 262 190 270 205" className="c-magma" />
        {/* Plaque Atlantique qui plonge vers l'ouest. */}
        <path
          d="M600 82 H500 L470 82 L250 250 L300 250 L520 104 H600 Z"
          className="c-plate-down"
        />
        <path d="M560 94 h-30 M520 94 h-30" className="c-motion" />
        <text x="18" y="104" className="c-label">
          Plaque Caraïbe
        </text>
        <text x="470" y="128" className="c-label">
          Plaque Atlantique
        </text>
        <text x="476" y="76" className="c-small">
          Fosse (loin à l’est)
        </text>
        <text x="218" y="40" className="c-small">
          Montagne Pelée
        </text>
        <text x="300" y="160" className="c-small">
          ≈ 2 cm/an
        </text>
        {/* Étape 3 : foyer et ondes ; étape 4 : bombement de l'eau. */}
        <g className="c-rupture">
          <circle cx="462" cy="96" r="5" />
          <circle cx="462" cy="96" r="16" className="c-ring" />
          <circle cx="462" cy="96" r="30" className="c-ring" />
        </g>
        <path d="M400 60 Q440 46 480 60" className="c-wave" />
        <g className="c-focus">
          <circle cx="285" cy="226" r="4" />
          <text x="292" y="222" className="c-small">
            Foyer 2007, ~156 km
          </text>
        </g>
      </svg>
      <ol className="carte-steps">
        {steps.map((t, i) => (
          <li key={i} aria-current={step === i || undefined}>
            <button type="button" onClick={() => setStep(i)}>
              <b>{i + 1}</b> {t}
            </button>
          </li>
        ))}
      </ol>
      <footer>
        {!reduced && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}{' '}
            {playing ? 'Pause' : 'Animer'}
          </Button>
        )}
        <small className="muted">
          Schéma explicatif, échelles approximatives (source : OVSM-IPGP).
        </small>
      </footer>
    </section>
  );
}

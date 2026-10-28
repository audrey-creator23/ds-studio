import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui.js';

// Fond : sélecteur, HEX (#RRGGBB ou #RRGGBBAA) et transparence. Chaque
// changement est montré en direct dans l'aperçu (onLive) ; seul « Valider »
// l'enregistre (une étape d'annulation), « Annuler » rétablit l'aperçu.
const valid = (v: string) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v);
const rgbOf = (hex: string) => hex.slice(0, 7).toLowerCase();
const alphaOf = (hex: string) =>
  hex.length === 9 ? Math.round((parseInt(hex.slice(7), 16) / 255) * 100) : 100;
const withAlpha = (rgb: string, a: number) =>
  a >= 100
    ? rgb
    : `${rgb}${Math.round((a / 100) * 255)
        .toString(16)
        .padStart(2, '0')}`;

export default function ColorDialog({
  target,
  initial,
  onLive,
  onConfirm,
  onCancel,
}: {
  target: string;
  initial?: string;
  onLive: (color?: string) => void;
  onConfirm: (color?: string) => void;
  onCancel: () => void;
}) {
  const [rgb, setRgb] = useState(rgbOf(initial ?? '#ffffff'));
  const [alpha, setAlpha] = useState(initial ? alphaOf(initial) : 100);
  const [hex, setHex] = useState(initial ?? '#ffffff');
  const [touched, setTouched] = useState(!!initial);
  const color = touched ? withAlpha(rgb, alpha) : undefined;
  function set(nextRgb: string, nextAlpha: number) {
    setRgb(nextRgb);
    setAlpha(nextAlpha);
    setTouched(true);
    const c = withAlpha(nextRgb, nextAlpha);
    setHex(c);
    onLive(c);
  }
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog color-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      >
        <div className="panel-head">
          <h2 id="color-title">Couleur de fond · {target}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fermer"
            onClick={onCancel}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="color-row">
          <span
            className="color-preview"
            role="img"
            aria-label={color ? `Aperçu ${color}` : 'Fond du DS'}
          >
            <span style={{ background: color ?? 'transparent' }} />
          </span>
          <div className="color-fields">
            <label className="prop">
              <span>Couleur</span>
              <input
                type="color"
                className="color-input"
                value={rgb}
                autoFocus
                onChange={(e) => set(e.target.value, alpha)}
              />
            </label>
            <label className="prop">
              <span>HEX</span>
              <input
                className="input input-sm"
                value={hex}
                maxLength={9}
                spellCheck={false}
                aria-invalid={!valid(hex)}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setHex(v);
                  if (valid(v)) set(rgbOf(v), alphaOf(v));
                }}
              />
            </label>
          </div>
        </div>
        <label className="prop">
          <span>Opacité · {alpha} %</span>
          <input
            type="range"
            min={0}
            max={100}
            value={alpha}
            onChange={(e) => set(rgb, Number(e.target.value))}
          />
        </label>
        {!valid(hex) && (
          <p className="alert-text" role="alert">
            HEX attendu : #RRGGBB ou #RRGGBBAA.
          </p>
        )}
        <div className="row">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTouched(false);
              onLive(undefined);
            }}
          >
            Fond du DS
          </Button>
          <span className="row">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={touched && !valid(hex)}
              onClick={() => onConfirm(color)}
            >
              Valider
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

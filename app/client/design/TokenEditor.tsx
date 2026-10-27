import { Surface } from '../Card.js';
import { Button } from '@mantine/core';
import { useState } from 'react';
import {
  contrast,
  tokensSchema,
  type TokenKey,
  type Tokens,
} from '../../shared/model.js';
import type { DesignDraft } from './useDesignDraft.js';
import {
  componentSpecs,
  type ComponentConfig,
  type ComponentId,
} from './componentSpecs.js';

// Logique « tokens → composants → états → écrans » : les catégories suivent
// le schéma de tokens v1, sans token inventé.
const labels: Record<TokenKey, string> = {
  'color.brand': 'Marque',
  'color.brandHover': 'Marque au survol',
  'color.onBrand': 'Texte sur la marque',
  'color.surface': 'Surface',
  'color.canvas': 'Fond',
  'color.text': 'Texte',
  'color.muted': 'Texte secondaire',
  'color.border': 'Bordure',
  'color.danger': 'Danger',
  'color.success': 'Succès',
  'color.focus': 'Anneau de focus',
  'font.family': 'Police',
  'font.body': 'Texte courant',
  'font.heading': 'Titres',
  'space.sm': 'Petit',
  'space.md': 'Moyen',
  'space.lg': 'Grand',
  'radius.control': 'Contrôles',
};
const ranges: Partial<Record<TokenKey, [number, number]>> = {
  'font.body': [10, 32],
  'font.heading': [14, 64],
  'space.sm': [0, 32],
  'space.md': [0, 48],
  'space.lg': [0, 64],
  'radius.control': [0, 32],
};
const categories: {
  id: string;
  title: string;
  keys: TokenKey[];
  note?: string;
}[] = [
  {
    id: 'colors',
    title: 'Couleurs',
    keys: [
      'color.brand',
      'color.brandHover',
      'color.onBrand',
      'color.text',
      'color.muted',
      'color.surface',
      'color.canvas',
      'color.border',
      'color.danger',
      'color.success',
    ],
  },
  {
    id: 'type',
    title: 'Typographie',
    keys: ['font.family', 'font.body', 'font.heading'],
  },
  {
    id: 'space',
    title: 'Espacements',
    keys: ['space.sm', 'space.md', 'space.lg'],
  },
  { id: 'radius', title: 'Rayons', keys: ['radius.control'] },
  {
    id: 'effects',
    title: 'Effets et états',
    keys: ['color.focus'],
    note: 'Le schéma v1 n’a pas de token d’ombre : seul l’anneau de focus est réglable.',
  },
];
const fonts = tokensSchema.shape['font.family'].shape.$value.options;

function TokenControl({ name, draft }: { name: TokenKey; draft: DesignDraft }) {
  const type = tokensSchema.shape[name].shape.$type.value;
  const raw = draft.raw(name);
  const error = draft.errors[name];
  const [min, max] = ranges[name] ?? [0, 128];
  return (
    <div className={`token-row${draft.modified(name) ? ' is-modified' : ''}`}>
      <span className="token-name">
        {labels[name]}
        <small>{name}</small>
      </span>
      <span className="token-control">
        {type === 'color' && (
          <input
            type="color"
            aria-label={`Sélecteur ${name}`}
            value={/^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#000000'}
            onChange={(e) => draft.set(name, e.target.value.toUpperCase())}
          />
        )}
        {type === 'dimension' && (
          <input
            type="range"
            aria-label={`Curseur ${name}`}
            min={min}
            max={max}
            value={Number(raw) || 0}
            onChange={(e) => draft.set(name, e.target.value)}
          />
        )}
        {type === 'fontFamily' ? (
          <select
            aria-label={name}
            value={raw}
            onChange={(e) => draft.set(name, e.target.value)}
          >
            {fonts.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        ) : (
          <input
            aria-label={name}
            aria-invalid={!!error || undefined}
            className="token-value"
            inputMode={type === 'dimension' ? 'numeric' : undefined}
            value={raw}
            maxLength={20}
            onChange={(e) => draft.set(name, e.target.value)}
          />
        )}
        {draft.modified(name) && (
          <button
            type="button"
            className="token-reset"
            aria-label={`Rétablir ${name}`}
            title="Rétablir la valeur enregistrée"
            onClick={() => draft.resetKey(name)}
          >
            ↺
          </button>
        )}
      </span>
      {error && (
        <small className="token-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

function Inspector({
  config,
  onChange,
}: {
  config: ComponentConfig;
  onChange: (c: ComponentConfig) => void;
}) {
  const spec = componentSpecs[config.component];
  return (
    <div className="inspector">
      <label className="field">
        Composant
        <select
          value={config.component}
          onChange={(e) => {
            const id = e.target.value as ComponentId;
            onChange({
              component: id,
              variant: componentSpecs[id].variants[0][0],
              size: 'md',
              text: componentSpecs[id].text ?? '',
            });
          }}
        >
          {Object.entries(componentSpecs).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Variante
        <select
          value={config.variant}
          onChange={(e) => onChange({ ...config, variant: e.target.value })}
        >
          {spec.variants.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {spec.sizes && (
        <fieldset className="segmented">
          <legend>Taille</legend>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <label key={size}>
              <input
                type="radio"
                name="component-size"
                checked={config.size === size}
                onChange={() => onChange({ ...config, size })}
              />
              {size.toUpperCase()}
            </label>
          ))}
        </fieldset>
      )}
      {spec.text !== undefined && (
        <label className="field">
          Texte
          <input
            value={config.text}
            maxLength={60}
            onChange={(e) => onChange({ ...config, text: e.target.value })}
          />
        </label>
      )}
      <p className="inspector-note">
        États affichés dans l’aperçu :{' '}
        {spec.states.map(([, label]) => label).join(', ')}.
      </p>
    </div>
  );
}

export default function TokenEditor({
  draft,
  saved,
  config,
  onConfig,
  onSave,
  saving,
}: {
  draft: DesignDraft;
  saved: Tokens;
  config: ComponentConfig;
  onConfig: (c: ComponentConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const match = (k: TokenKey) =>
    !query || k.includes(query) || labels[k].toLowerCase().includes(query);
  const count = Object.keys(draft.values).length;
  const invalid = Object.keys(draft.errors).length;
  const preview = draft.preview ?? saved;
  const ratio = contrast(
    preview['color.brand'].$value,
    preview['color.onBrand'].$value,
  );
  return (
    <Surface
      component="section"
      className="design-editor"
      aria-labelledby="ds-title"
    >
      <div className="editor-head">
        <h2 id="ds-title" tabIndex={-1}>
          Tokens
        </h2>
        <div className="editor-actions" role="toolbar" aria-label="Brouillon">
          <button type="button" onClick={draft.undo} disabled={!draft.canUndo}>
            Annuler
          </button>
          <button type="button" onClick={draft.redo} disabled={!draft.canRedo}>
            Rétablir
          </button>
          <button
            type="button"
            disabled={!count}
            onClick={() => {
              if (
                window.confirm(
                  'Effacer toutes les modifications non enregistrées ?',
                )
              )
                draft.resetAll();
            }}
          >
            Réinitialiser
          </button>
          <Button
            type="button"
            disabled={!draft.changes.length || invalid > 0 || saving}
            onClick={onSave}
          >
            Enregistrer{count ? ` (${count})` : ''}
          </Button>
        </div>
      </div>
      <p className="editor-status" role="status">
        {count
          ? `${count} modification(s) non enregistrée(s), visibles dans l’aperçu.${draft.recovered ? ' Brouillon récupéré.' : ''}`
          : 'Modifiez un token : l’aperçu se met à jour, rien n’est écrit avant validation.'}
        {invalid > 0 && ` ${invalid} valeur(s) à corriger.`}
      </p>
      <label className="field token-search">
        Rechercher un token
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="marque, space, police…"
        />
      </label>
      <div className="editor-sections">
        {categories.map((c) => {
          const keys = c.keys.filter(match);
          if (!keys.length) return null;
          const changed = keys.filter(draft.modified).length;
          return (
            <details key={c.id} className="editor-section" open>
              <summary>
                {c.title}
                {changed > 0 && <span className="pill">{changed}</span>}
              </summary>
              {keys.map((k) => (
                <TokenControl key={k} name={k} draft={draft} />
              ))}
              {c.id === 'colors' && (
                <p className="editor-hint">
                  Contraste marque / texte :{' '}
                  <strong>{ratio.toFixed(2)}:1</strong> ·{' '}
                  {ratio >= 4.5 ? 'AA texte courant' : 'Contraste à améliorer'}
                </p>
              )}
              {c.note && <p className="editor-hint">{c.note}</p>}
            </details>
          );
        })}
        {(!query || 'composants'.includes(query)) && (
          <details className="editor-section" open>
            <summary>Composants</summary>
            <Inspector config={config} onChange={onConfig} />
          </details>
        )}
      </div>
    </Surface>
  );
}

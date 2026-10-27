import type { Tokens } from '../../shared/model.js';
import { blockSpecs } from '../../shared/composition.js';
import type { ComponentConfig } from './componentSpecs.js';
import type { CompositionState } from './useComposition.js';
import Library from './Library.js';
import Structure from './Structure.js';
import ComposeChat from './ComposeChat.js';
import Simulator from './Simulator.js';

// Atelier de composition : bibliothèque → composition → aperçu → validation.
// Les tokens enregistrés sont utilisés tels quels : composer une page ne
// modifie jamais le Design System global.
export default function ComposeWorkspace({
  c,
  tokens,
  panel,
  onPanel,
  onSelect,
  config,
}: {
  c: CompositionState;
  tokens: Tokens;
  panel: 'library' | 'structure';
  onPanel: (p: 'library' | 'structure') => void;
  onSelect: (id: string) => void;
  config: ComponentConfig;
}) {
  const sectionOf = (id?: string) =>
    c.draft.sections.find(
      (s) => s.id === id || s.items.some((i) => i.id === id),
    );
  const target = sectionOf(c.selected) ?? c.draft.sections.at(-1);
  const count = c.draft.sections.reduce((n, s) => n + s.items.length, 0);
  return (
    <>
      <div
        className="compose-bar card"
        role="toolbar"
        aria-label="Page composée"
      >
        <label className="field">
          Page
          <select
            value={c.savedVersion ? c.draft.id : ''}
            onChange={(e) => {
              if (
                !c.dirty ||
                window.confirm(
                  'Abandonner les modifications non enregistrées ?',
                )
              )
                c.open(e.target.value);
            }}
          >
            {!c.savedVersion && (
              <option value="">Brouillon non enregistré</option>
            )}
            {c.saved.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="new">+ Nouvelle page</option>
          </select>
        </label>
        <label className="field">
          Nom
          <input
            value={c.draft.name}
            maxLength={60}
            onChange={(e) => c.rename(e.target.value)}
          />
        </label>
        <p className="compose-status" role="status">
          {c.draft.sections.length} section(s) · {count} élément(s) ·{' '}
          {c.dirty ? 'modifications non enregistrées' : 'enregistrée'}
        </p>
        <div className="editor-actions">
          <button type="button" onClick={c.undo} disabled={!c.canUndo}>
            Annuler
          </button>
          <button type="button" onClick={c.redo} disabled={!c.canRedo}>
            Rétablir
          </button>
          {c.savedVersion && (
            <button
              type="button"
              disabled={!c.dirty}
              onClick={() => {
                if (window.confirm('Revenir à la version enregistrée ?'))
                  c.revert();
              }}
            >
              Revenir à l’enregistré
            </button>
          )}
          {c.savedVersion && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Supprimer la page « ${c.draft.name} » ?`))
                  void c.deletePage();
              }}
            >
              Supprimer
            </button>
          )}
          <button
            type="button"
            className="studio-primary"
            disabled={!c.dirty || c.busy || !!c.proposal}
            title={
              c.proposal
                ? 'Appliquez ou refusez la proposition d’abord.'
                : undefined
            }
            onClick={() => void c.save()}
          >
            {c.busy ? 'Enregistrement…' : 'Enregistrer la page'}
          </button>
        </div>
      </div>
      <div className="feedback" aria-live="polite">
        {c.error && (
          <p className="error" role="alert">
            {c.error}
          </p>
        )}
        {c.notice && (
          <p className="notice" role="status">
            {c.notice}
          </p>
        )}
      </div>
      <div className="compose-layout">
        <section
          className="compose-panel card"
          aria-label="Bibliothèque et structure"
        >
          <div
            className="sim-version compose-tabs"
            role="group"
            aria-label="Panneau"
          >
            <button
              type="button"
              aria-pressed={panel === 'library'}
              onClick={() => onPanel('library')}
            >
              Bibliothèque
            </button>
            <button
              type="button"
              aria-pressed={panel === 'structure'}
              onClick={() => onPanel('structure')}
            >
              Structure
            </button>
          </div>
          {panel === 'library' ? (
            <Library
              tokens={tokens}
              target={target?.name}
              onAdd={(kind, variant) => c.addItem(kind, variant)}
              onAddSection={(layout, columns) => c.addSection(layout, columns)}
            />
          ) : (
            <Structure c={c} tokens={tokens} />
          )}
        </section>
        <ComposeChat c={c} />
        <Simulator
          draftTokens={tokens}
          savedTokens={tokens}
          draftCount={0}
          config={config}
          screen="cards"
          onScreen={() => {}}
          compose={{
            draft: c.proposal?.composition ?? c.draft,
            saved: c.savedVersion,
            proposal: !!c.proposal,
            dirty: c.dirty,
            selected: c.proposal ? undefined : c.selected,
            onSelect: (id) => {
              if (!c.proposal) onSelect(id);
            },
          }}
        />
      </div>
      <p className="page-source">
        {Object.keys(blockSpecs).length} composants existants · tokens
        enregistrés en lecture seule ici (onglet Tokens du DS pour les modifier,
        avec validation).
      </p>
    </>
  );
}

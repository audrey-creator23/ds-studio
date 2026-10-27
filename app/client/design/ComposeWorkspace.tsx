import { Surface } from '../Card.js';
import { Button, Tabs } from '@mantine/core';
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
      <Surface
        component="div"
        className="compose-bar"
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
          <Button
            type="button"
            disabled={!c.dirty || c.busy || !!c.proposal}
            title={
              c.proposal
                ? 'Appliquez ou refusez la proposition d’abord.'
                : undefined
            }
            onClick={() => void c.save()}
          >
            {c.busy ? 'Enregistrement…' : 'Enregistrer la page'}
          </Button>
        </div>
      </Surface>
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
        <Surface
          component="section"
          className="compose-panel"
          aria-label="Bibliothèque et structure"
        >
          <Tabs
            className="compose-tabs"
            value={panel}
            onChange={(v) => v && onPanel(v as 'library' | 'structure')}
            keepMounted={false}
          >
            <Tabs.List grow aria-label="Panneau">
              <Tabs.Tab value="library">Bibliothèque</Tabs.Tab>
              <Tabs.Tab value="structure">Structure</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="library" pt="sm">
              <Library
                tokens={tokens}
                target={target?.name}
                onAdd={(kind, variant) => c.addItem(kind, variant)}
                onAddSection={(layout, columns) =>
                  c.addSection(layout, columns)
                }
              />
            </Tabs.Panel>
            <Tabs.Panel value="structure" pt="sm">
              <Structure c={c} tokens={tokens} />
            </Tabs.Panel>
          </Tabs>
        </Surface>
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

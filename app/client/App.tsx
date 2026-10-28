import { Button } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { ComponentSheet, Scenario } from './DesignSystem.js';
import { CompositionView } from './design/CompositionView.js';
import { useComposition } from './design/useComposition.js';
import ComposeWorkspace from './design/ComposeWorkspace.js';
import {
  normalizeComposition,
  type Composition,
} from '../shared/composition.js';
import ProjectBrief from './ProjectBrief.js';
import Sidebar, {
  pageHeadings,
  pageSlugs,
  pageTitles,
  type Page,
} from './Sidebar.js';
import HomePage from './HomePage.js';
import VolcanoDashboard from './VolcanoDashboard.js';
import AssistantPage from './AssistantPage.js';
import ChatBubble from './ChatBubble.js';
import { AssistantProvider } from './useAssistantChat.js';
import Logo from './Logo.js';
import ProjectContent from './ProjectContent.js';
import { useDesignDraft } from './design/useDesignDraft.js';
import TokenEditor from './design/TokenEditor.js';
import Simulator, { type Screen } from './design/Simulator.js';
import {
  defaultConfig,
  normalizeConfig,
  type ComponentConfig,
} from './design/componentSpecs.js';
import {
  bootstrap,
  commit,
  exportTokens,
  getState,
  request,
  type Bootstrap,
} from './api.js';
import {
  tokensSchema,
  type Proposal,
  type State,
  type Tokens,
} from '../shared/model.js';

const configKey = 'ds-studio-component-config-v1';
function loadConfig(): ComponentConfig {
  try {
    return normalizeConfig(
      JSON.parse(localStorage.getItem(configKey) || 'null'),
    );
  } catch {
    return defaultConfig;
  }
}
function useDesignState() {
  const [state, setState] = useState<State>();
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || !live) return;
      inFlight = true;
      try {
        const s = await getState();
        if (live) {
          setState((current) =>
            !current || s.revision >= current.revision ? s : current,
          );
          setError('');
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1200);
    const channel = new BroadcastChannel('ds-studio');
    channel.onmessage = refresh;
    return () => {
      live = false;
      clearInterval(timer);
      channel.close();
    };
  }, []);
  return { state, setState, error };
}
function announceChange() {
  const c = new BroadcastChannel('ds-studio');
  c.postMessage('updated');
  c.close();
}
export function Preview() {
  const { state, error } = useDesignState();
  const [live, setLive] = useState<{
    tokens: Tokens;
    screen: string;
    config: ComponentConfig;
    composition?: Composition;
    selected?: string | string[];
    interact: boolean;
    palette: boolean;
  }>();
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== parent ||
        e.data?.type !== 'ds-preview'
      )
        return;
      // Thème de l'aperçu (studio v3) : fond et composants Mantine.
      const dark = e.data.scheme === 'dark';
      document.documentElement.setAttribute(
        'data-mantine-color-scheme',
        dark ? 'dark' : 'light',
      );
      document.body.classList.toggle('preview-dark', dark);
      const tokens = tokensSchema.safeParse(e.data.tokens);
      if (tokens.success)
        setLive({
          tokens: tokens.data,
          screen: String(e.data.screen),
          config: normalizeConfig(e.data.config),
          composition: e.data.composition
            ? normalizeComposition(e.data.composition)
            : undefined,
          selected:
            typeof e.data.selected === 'string'
              ? e.data.selected
              : Array.isArray(e.data.selected)
                ? e.data.selected.filter((x: unknown) => typeof x === 'string')
                : undefined,
          interact: e.data.interact === true,
          palette: e.data.palette === true,
        });
    };
    addEventListener('message', onMessage);
    // Export demandé par le studio v3 : rendu réel de cette page (styles,
    // polices, dimensions), en image ou en HTML autonome.
    const onExport = async (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== parent ||
        e.data?.type !== 'ds-export'
      )
        return;
      const reply = (result: Record<string, unknown>) =>
        parent.postMessage(
          { type: 'ds-export-result', id: e.data.id, ...result },
          location.origin,
        );
      try {
        const page = document.querySelector<HTMLElement>('.cmp-page');
        if (!page) throw new Error('Aucun écran à exporter.');
        if (e.data.format === 'html') {
          const css = [...document.styleSheets]
            .flatMap((sheet) => [...sheet.cssRules].map((r) => r.cssText))
            .join('\n');
          const html = `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${document.title}</title>\n<style>\n${css}\n</style>\n</head>\n<body class="${document.body.className}">\n${document.getElementById('root')!.innerHTML}\n</body>\n</html>\n`;
          return reply({ data: html });
        }
        const { toJpeg, toPng } = await import('html-to-image');
        const options = {
          pixelRatio: 2,
          width: page.scrollWidth,
          height: page.scrollHeight,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
        };
        reply({
          data:
            e.data.format === 'jpeg'
              ? await toJpeg(page, { ...options, quality: 0.92 })
              : await toPng(page, options),
        });
      } catch (err) {
        reply({ error: (err as Error).message || 'Export impossible.' });
      }
    };
    addEventListener('message', onExport);
    // ⌘Z / ⇧⌘Z (ou Ctrl+Y) dans l'aperçu : relayés au studio.
    const onKey = (e: KeyboardEvent) => {
      if (parent === window || !(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      const key =
        k === 'z' ? (e.shiftKey ? 'redo' : 'undo') : k === 'y' ? 'redo' : '';
      if (!key) return;
      e.preventDefault();
      parent.postMessage({ type: 'ds-key', key }, location.origin);
    };
    addEventListener('keydown', onKey);
    if (parent !== window)
      parent.postMessage({ type: 'ds-preview-ready' }, location.origin);
    return () => {
      removeEventListener('message', onMessage);
      removeEventListener('message', onExport);
      removeEventListener('keydown', onKey);
    };
  }, []);
  const scenario =
    live?.screen ??
    new URLSearchParams(location.search).get('scenario') ??
    'cards';
  const tokens = live?.tokens ?? state?.tokens;
  if (!tokens) return <p role="alert">{error || 'Chargement du scénario…'}</p>;
  if (live?.composition)
    return (
      <CompositionView
        tokens={tokens}
        composition={live.composition}
        selected={live.selected}
        interact={live.interact}
        onSelect={(id, additive) =>
          parent.postMessage(
            { type: 'ds-select', id, additive },
            location.origin,
          )
        }
        onDrop={(drop) =>
          parent.postMessage({ type: 'ds-drop', ...drop }, location.origin)
        }
        onPick={
          live.palette
            ? (block) =>
                parent.postMessage(
                  { type: 'ds-pick', ...block },
                  location.origin,
                )
            : undefined
        }
      />
    );
  if (scenario === 'compose')
    return <p role="status">Chargement de la composition…</p>;
  return scenario === 'components' ? (
    <ComponentSheet tokens={tokens} config={live?.config ?? defaultConfig} />
  ) : (
    <Scenario tokens={tokens} scenario={scenario} />
  );
}
export default function App() {
  const { state, setState, error: stateError } = useDesignState();
  const [boot, setBoot] = useState<Bootstrap>();
  const design = useDesignDraft(state?.tokens);
  const [config, setConfigState] = useState<ComponentConfig>(loadConfig);
  const [screen, setScreen] = useState<Screen>('cards');
  const composition = useComposition();
  // Composer une page (par défaut) ou modifier les tokens du DS global.
  const [mode, setMode] = useState<'compose' | 'tokens'>(() =>
    new URLSearchParams(location.search).get('mode') === 'tokens'
      ? 'tokens'
      : 'compose',
  );
  const [panel, setPanel] = useState<'library' | 'structure'>('library');
  const selectFromPreview = useCallback(
    (id: string) => {
      composition.select(id);
      setPanel('structure');
    },
    [composition.select],
  );
  function setConfig(next: ComponentConfig) {
    setConfigState(next);
    setScreen('components');
    try {
      localStorage.setItem(configKey, JSON.stringify(next));
    } catch {
      /* Préférence facultative. */
    }
  }
  const [agents, setAgents] = useState<Bootstrap['agents']>([]);
  const [proposal, setProposal] = useState<Proposal>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [agent, setAgent] = useState('manual');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage({
    key: 'ds-studio-sidebar-collapsed',
    defaultValue: false,
    getInitialValueInEffect: false,
  });
  // Accueil par défaut ; ?vue=… garde la page affichée au rechargement.
  const [page, setPage] = useState<Page>(() => {
    const raw = new URLSearchParams(location.search).get('vue');
    // Ancienne adresse de la page Design conservée.
    const slug = raw === 'atelier' ? 'design' : raw;
    return (
      (Object.keys(pageSlugs) as Page[]).find((p) => pageSlugs[p] === slug) ??
      'home'
    );
  });
  const firstPage = useRef(true);
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('vue', pageSlugs[page]);
    if (page === 'workshop' && mode === 'tokens')
      url.searchParams.set('mode', 'tokens');
    else url.searchParams.delete('mode');
    history.replaceState(null, '', url);
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    if (page !== 'workshop')
      document.getElementById(pageHeadings[page])?.focus();
  }, [page, mode]);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    bootstrap()
      .then(setBoot)
      .catch((e) => setError(e.message));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (agent !== 'manual')
      request<Bootstrap['agents']>('agents')
        .then(setAgents)
        .catch((e) => setError(e.message));
  }, [agent]);

  useEffect(() => {
    if (proposal) {
      dialog.current?.showModal();
      cancelButton.current?.focus();
    } else dialog.current?.close();
  }, [proposal]);
  const clearError = () => {
    setError('');
    setNotice('');
  };
  async function perform(action: () => Promise<void>) {
    clearError();
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveDesign() {
    if (!state || !design.changes.length) return;
    await perform(async () =>
      setProposal(
        await request<Proposal>('proposals', {
          revision: state.revision,
          changes: design.changes,
        }),
      ),
    );
  }
  async function accept() {
    if (!proposal) return;
    setSaving(true);
    await perform(async () => {
      const next = await commit(proposal);
      setState(next);
      setProposal(undefined);
      announceChange();
      setNotice(`Révision ${next.revision} enregistrée sur disque.`);
    });
    setSaving(false);
  }
  async function sendMessage() {
    if (!state || !message.trim() || thinking) return;
    const text = message;
    setMessage('');
    setThinking(true);
    clearError();
    const previous = chat.slice(-10);
    setChat([...chat, { role: 'user', text }]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await request<{
        message: string;
        proposal: Proposal | null;
      }>(
        'agent',
        { agent, message: text, revision: state.revision, history: previous },
        abort.signal,
      );
      setChat((c) => [...c, { role: 'assistant', text: result.message }]);
      if (result.proposal) setProposal(result.proposal);
    } catch (e) {
      setError(
        abort.signal.aborted
          ? 'Demande interrompue. Aucun changement accepté.'
          : (e as Error).message,
      );
    } finally {
      setThinking(false);
      controller.current = null;
    }
  }
  if (!state)
    return (
      <main className="loading">
        <Logo size="lg" />
        <h1>DS-Studio</h1>
        <p role="alert">{stateError || 'Ouverture du Design System…'}</p>
        <p>Lancez le serveur local puis rechargez cette page.</p>
      </main>
    );
  const selectedAgent = agents.find((a) => a.id === agent);
  const staleProposal = !!proposal && proposal.revision !== state.revision;
  const codexPanel = (
    <>
      <label className="field">
        Mode de travail
        <select value={agent} onChange={(e) => setAgent(e.target.value)}>
          <option value="manual">Manuel · sans compte IA</option>
          <option value="codex">Codex · expérimental qualifié</option>
          <option value="claude" disabled>
            Claude Code · non implémenté
          </option>
          <option value="gemini" disabled>
            Gemini CLI · non implémenté
          </option>
        </select>
      </label>
      {agent === 'manual' ? (
        <div className="agent-empty">
          <div className="line-icon">✳</div>
          <h3>Le Design System vous appartient.</h3>
          <p>
            Aucun compte nécessaire. Sélectionnez un token dans le panneau
            central, modifiez sa valeur et examinez le diff avant de
            l’appliquer.
          </p>
          <ol>
            <li>Choisissez une couleur.</li>
            <li>Proposez un changement.</li>
            <li>Validez et observez les deux vues.</li>
          </ol>
          <p className="privacy-note">
            Les changements restent sur votre machine. Figma et l’IA sont
            facultatifs.
          </p>
        </div>
      ) : (
        <>
          <p className="privacy-note">
            {selectedAgent?.detail ?? 'Détection du CLI…'}
          </p>
          <p className="privacy-note">
            Envoi à Codex : tokens, workspace/PFE.md, brief privé,
            DESIGN_RULES.md et 10 messages récents. Aucun outil ni commande ;
            propositions seulement.
          </p>
          <div
            className="chat-log"
            aria-label="Conversation"
            aria-live="polite"
          >
            {chat.map((c, i) => (
              <article className={`chat-message ${c.role}`} key={i}>
                <strong>{c.role === 'user' ? 'Vous' : 'Codex'}</strong>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <label className="field">
              Votre demande
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={8000}
                placeholder="Propose une couleur de marque plus chaleureuse."
                disabled={thinking}
              />
            </label>
            <Button
              type="submit"
              disabled={
                thinking || !message.trim() || !selectedAgent?.available
              }
            >
              {thinking ? 'Réflexion en cours…' : 'Envoyer à Codex'}
            </Button>
            {thinking && (
              <button type="button" onClick={() => controller.current?.abort()}>
                Arrêter
              </button>
            )}
          </form>
        </>
      )}
    </>
  );
  return (
    <AssistantProvider page={page}>
      <a
        className="skip-link"
        href="#ds-title"
        onClick={(e) => {
          if (page === 'workshop' && mode === 'tokens') return;
          e.preventDefault();
          setPage('workshop');
          setMode('tokens');
          requestAnimationFrame(() =>
            document.getElementById('ds-title')?.focus(),
          );
        }}
      >
        Aller aux tokens
      </a>
      <div className="shell">
        <Sidebar
          revision={state.revision}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen(!historyOpen)}
          current={page}
          onPage={setPage}
          figmaLabel={boot?.figma.label ?? 'Figma non connecté'}
          collapsed={collapsed}
          onCollapse={setCollapsed}
        />
        <div className="shell-main">
          <header className="topbar">
            <span>DS-Studio</span>
            <span aria-hidden="true">/</span>
            <strong>{pageTitles[page]}</strong>
          </header>
          {page === 'home' && <HomePage onPage={setPage} />}
          {page === 'assistant' && (
            <AssistantPage codex={codexPanel} brief={<ProjectBrief />} />
          )}
          {page === 'brief' && <ProjectContent />}
          {page === 'volcano' && (
            <VolcanoDashboard tokens={state.tokens} onPage={setPage} />
          )}
          <div className="workshop" hidden={page !== 'workshop'}>
            <div className="page-head design-head" id="accueil" tabIndex={-1}>
              <div>
                <p className="page-eyebrow">Lisière · Design System</p>
                <h1>Design</h1>
              </div>
              <div
                className="design-modes"
                role="group"
                aria-label="Mode de la page Design"
              >
                <button
                  type="button"
                  aria-pressed={mode === 'compose'}
                  onClick={() => setMode('compose')}
                >
                  Composer une page
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'tokens'}
                  onClick={() => setMode('tokens')}
                >
                  Tokens du DS
                </button>
              </div>
              <div className="design-io" hidden={mode !== 'tokens'}>
                <button onClick={() => void perform(exportTokens)}>
                  Exporter les tokens
                </button>
                <label className="file-button">
                  Importer un JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file)
                        void perform(async () => {
                          if (file.size > 128000)
                            throw new Error(
                              'Fichier trop volumineux (128 Ko maximum).',
                            );
                          const tokens = JSON.parse(await file.text());
                          setProposal(
                            await request('import', {
                              revision: state.revision,
                              tokens,
                            }),
                          );
                        });
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="feedback" aria-live="polite">
              {(error || stateError) && (
                <p className="error" role="alert">
                  {error || stateError}
                </p>
              )}
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
            </div>
            {historyOpen && (
              <section
                className="history"
                aria-label="Historique des changements"
              >
                <h2>Un historique, pas un écrasement.</h2>
                <p>
                  Annulez un changement précis. Les autres tokens restent
                  intacts. Une annulation s’enregistre elle aussi.
                </p>
                {!state.history.length && <p>Aucun changement enregistré.</p>}
                <ol>
                  {[...state.history].reverse().map((event) => (
                    <li key={event.id}>
                      <div>
                        <strong>Révision {event.revision}</strong> ·{' '}
                        {event.source} ·{' '}
                        <time>
                          {new Date(event.date).toLocaleString('fr-FR')}
                        </time>
                        <p>{event.patches.map((p) => p.key).join(', ')}</p>
                      </div>
                      <button
                        onClick={() =>
                          void perform(async () =>
                            setProposal(
                              await request('undo', {
                                revision: state.revision,
                                id: event.id,
                              }),
                            ),
                          )
                        }
                      >
                        Annuler la révision {event.revision}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {page === 'workshop' && mode === 'compose' && (
              <ComposeWorkspace
                c={composition}
                tokens={state.tokens}
                panel={panel}
                onPanel={setPanel}
                onSelect={selectFromPreview}
                config={config}
              />
            )}
            {mode === 'tokens' && (
              <div className="design-layout">
                <TokenEditor
                  draft={design}
                  saved={state.tokens}
                  config={config}
                  onConfig={setConfig}
                  onSave={() => void saveDesign()}
                  saving={saving}
                />
                <Simulator
                  draftTokens={design.preview ?? state.tokens}
                  savedTokens={state.tokens}
                  draftCount={Object.keys(design.values).length}
                  config={config}
                  screen={screen}
                  onScreen={setScreen}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (saving) e.preventDefault();
          else setProposal(undefined);
        }}
        aria-labelledby="diff-title"
      >
        <h2 id="diff-title">Valider le changement</h2>
        <p>
          Proposition {proposal?.source} · basée sur la révision{' '}
          {proposal?.revision}. Ces valeurs seront enregistrées sur votre
          machine.
        </p>
        {staleProposal && (
          <p role="alert" className="error">
            Une autre validation a modifié le DS. Fermez ce diff et refaites
            votre proposition ; aucun écrasement n’est permis.
          </p>
        )}
        <div className="diff-scroll">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Avant</th>
                <th>Après</th>
              </tr>
            </thead>
            <tbody>
              {proposal?.patches.map((p) => (
                <tr key={p.key}>
                  <th>{p.key}</th>
                  <td>
                    <del>{p.before}</del>
                  </td>
                  <td>
                    <ins>{p.after}</ins>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            ref={cancelButton}
            onClick={() => setProposal(undefined)}
            disabled={saving}
          >
            Ne pas appliquer
          </button>
          <Button
            type="submit"
            onClick={() => void accept()}
            disabled={saving || staleProposal}
          >
            {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
          </Button>
        </div>
      </dialog>
      <ChatBubble page={page} onPage={setPage} />
    </AssistantProvider>
  );
}

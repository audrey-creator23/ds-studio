import type { Composer } from './claude.js';
import type {
  ComposeOutput,
  Composition,
} from '../../app/shared/composition.js';

// Compositeur simulé pour les tests de bout en bout : aucune clé, aucun appel
// réseau. Activé seulement par DS_STUDIO_FAKE_COMPOSER=1 (serveur e2e).
export const fakeComposer: Composer = {
  async status() {
    return { available: true, detail: 'Compositeur simulé (tests).' };
  },
  async compose(_system, turns) {
    const last = turns.at(-1)!.text;
    const current = JSON.parse(
      last.match(/<composition>\n([\s\S]*)\n<\/composition>/)![1],
    ) as Composition;
    const ask = last.split('Demande : ')[1].toLowerCase();
    const sections = structuredClone(
      current.sections,
    ) as ComposeOutput['sections'];
    const usage = { input: 100, output: 50 };
    const item = (kind: string, id: string, extra = {}) =>
      ({
        id,
        kind,
        variant: '',
        size: 'md',
        text: '',
        span: 1,
        rows: 1,
        width: 'fill',
        ...extra,
      }) as ComposeOutput['sections'][number]['items'][number];
    if (ask.includes('une page')) {
      return {
        output: {
          reply: 'Quel est l’objectif principal de cette page ?',
          needsInput: true,
          sections,
        },
        stopReason: 'end_turn',
        usage,
      };
    }
    if (ask.includes('grande card') || ask.includes('grande carte'))
      sections.push({
        id: 'cartes',
        name: 'Cartes',
        layout: 'grid',
        columns: 2,
        gap: 'md',
        align: 'stretch',
        items: [
          item('card', 'grande', { variant: 'accent', rows: 3 }),
          item('panel', 'petite-1', { text: 'Première idée' }),
          item('panel', 'petite-2', { text: 'Deuxième idée' }),
          item('panel', 'petite-3', { text: 'Troisième idée' }),
        ],
      });
    else if (ask.includes('planning')) {
      const all = sections.flatMap((s) => s.items);
      const planning =
        all.find((i) => i.kind === 'planning') ??
        item('planning', 'planning', { span: 4 });
      const tasks =
        all.find((i) => i.kind === 'checklist') ??
        item('checklist', 'taches', { span: 4 });
      for (const s of sections)
        s.items = s.items.filter((i) => i !== planning && i !== tasks);
      sections.unshift({
        id: 'suivi',
        name: 'Suivi',
        layout: 'stack',
        columns: 1,
        gap: 'md',
        align: 'stretch',
        items: [planning, tasks],
      });
    } else
      sections[0]?.items.push(
        item('button', 'bouton-claude', {
          variant: 'primary',
          text: 'Réserver',
        }),
      );
    return {
      output: {
        reply: 'Voici une proposition avec les composants existants.',
        needsInput: false,
        sections,
      },
      stopReason: 'end_turn',
      usage,
    };
  },
};

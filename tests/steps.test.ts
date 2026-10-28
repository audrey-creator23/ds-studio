import assert from 'node:assert/strict';
import test from 'node:test';
import { daysBetween, rendus, today } from '../app/shared/brief.js';
import {
  renduAcquired,
  stepDone,
  stepStatus,
  userDataSchema,
} from '../app/shared/steps.js';

test('date du jour locale, J-X exact', () => {
  // 28 oct. 2026 à 0 h 30, heure locale : jamais la veille (UTC).
  assert.equal(today(new Date(2026, 9, 28, 0, 30)), '2026-10-28');
  assert.equal(daysBetween('2026-10-28', '2026-11-13'), 16);
});

test('rendu fait seulement si l’étape est déclarée faite ou validée', () => {
  const data = userDataSchema.parse({});
  const tasks = { statuses: { intention: 'done' } } as never;
  // Une ancienne tâche faite indique un avancement, pas un rendu effectué.
  assert.equal(stepStatus(data, tasks, 'presentation'), 'doing');
  assert.equal(stepDone(stepStatus(data, tasks, 'presentation')), false);
  const next = rendus.find(
    (r) => !stepDone(stepStatus(data, tasks, r.step as 'presentation')),
  );
  assert.equal(next?.title, 'Note de cadrage');
  data.steps.presentation = 'validated';
  assert.equal(stepDone(stepStatus(data, tasks, 'presentation')), true);
  data.steps.presentation = 'rework';
  assert.equal(stepDone(stepStatus(data, tasks, 'presentation')), false);
});

test('prochain rendu : premier rendu non validé par le prof', () => {
  const data = userDataSchema.parse({});
  const next = () =>
    rendus.find(
      (r) => !renduAcquired(stepStatus(data, undefined, r.step as never)),
    )?.title;
  assert.equal(next(), 'Note de cadrage');
  // Remis (« Fait ») ou à retravailler : toujours le prochain rendu.
  data.steps.presentation = 'done';
  assert.equal(next(), 'Note de cadrage');
  data.steps.presentation = 'rework';
  assert.equal(next(), 'Note de cadrage');
  data.steps.presentation = 'validated';
  assert.equal(next(), 'Document de cadrage');
});

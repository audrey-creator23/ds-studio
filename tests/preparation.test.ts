import assert from 'node:assert/strict';
import test from 'node:test';
import {
  complete,
  emptyGuide,
  emptyKit,
  guideSteps,
  kitItems,
  ready,
  signature,
  type Guide,
  type Preparation,
} from '../app/v3/carte/preparationModel.js';

const full = (): Preparation => {
  const kit = { ...emptyKit, needs: ['bebe'], done: [] as string[] };
  kit.done = kitItems(kit).map((k) => k.id);
  return {
    kit,
    home: { label: 'Adresse de test, Martinique', lat: 14.6, lon: -61.07 },
    cached: ['relief', 'consignes', 'contacts', 'trousse'],
    plan: {
      contactNom: 'Contact test',
      contactTel: '+596 696 00 00 00',
      ralliement: 'Rendez-vous convenu',
      evacuation: 'Notes personnelles du DICRIM',
      rassemblement: 'À confirmer sur place auprès de la mairie',
      evacuationSource: 'https://www.martinique.gouv.fr/',
      radio: 'Fréquence notée depuis ma source',
      infoSource: 'https://www.martinique.gouv.fr/',
    },
  };
};
test('préparation : données anciennes conservées, aucune validation inventée', () => {
  const d = full();
  for (const s of guideSteps) {
    assert.equal(ready(s.id, d), true);
    assert.equal(complete(s.id, emptyGuide, d), false);
  }
  assert.equal(d.plan.contactTel, '+596 696 00 00 00');
});
test('préparation : 0 → 100 %, modification du foyer invalide trousse et récapitulatif', () => {
  const d = full();
  const guide: Guide = {
    ...emptyGuide,
    validated: Object.fromEntries(
      guideSteps.map((s) => [s.id, signature(s.id, d)]),
    ),
  };
  assert.equal(guideSteps.filter((s) => complete(s.id, guide, d)).length, 7);
  d.kit.adults = 3;
  assert.equal(complete('foyer', guide, d), false);
  assert.equal(complete('trousse', guide, d), false);
  assert.equal(complete('resume', guide, d), false);
  assert.equal(complete('proches', guide, d), true);
  assert.ok(kitItems(d.kit).some((k) => k.label.includes('18 L')));
});
test('préparation : métadonnées sans cache, source non officielle et téléphone invalide ne valident rien', () => {
  const d = full();
  d.cached = ['contacts'];
  d.plan.infoSource = 'https://gouv.fr.exemple.com/';
  d.plan.contactTel = 'inconnu';
  d.plan.evacuationSource = 'http://www.martinique.gouv.fr/';
  for (const id of [
    'offline',
    'information',
    'proches',
    'exposition',
    'resume',
  ] as const)
    assert.equal(ready(id, d), false);
});
test('préparation : retrait du cache, changement d’adresse ou de contact invalident les seules étapes concernées', () => {
  const d = full();
  const guide: Guide = {
    ...emptyGuide,
    validated: Object.fromEntries(
      guideSteps.map((s) => [s.id, signature(s.id, d)]),
    ),
  };
  d.cached.pop();
  d.home!.label = 'Autre adresse';
  d.plan.contactNom = 'Autre contact';
  for (const id of ['offline', 'exposition', 'proches', 'resume'] as const)
    assert.equal(complete(id, guide, d), false);
  assert.equal(complete('foyer', guide, d), true);
});

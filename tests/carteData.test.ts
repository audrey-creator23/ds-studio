import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CarteData } from '../app/server/carteData.js';

const reply = (value: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 503,
  json: async () => value,
});

test('séismes USGS : champs utiles, source et horodatage', async () => {
  const data = new CarteData(async () =>
    reply({
      features: [
        {
          id: 'us1',
          properties: {
            mag: 4.5,
            place: 'ENE of Sainte-Marie',
            time: 0,
            url: 'u',
          },
          geometry: { coordinates: [-60.5, 14.9, 40] },
        },
      ],
    }),
  );
  const r = await data.seismes();
  assert.equal(r.events[0].depth, 40);
  assert.equal(r.events[0].lat, 14.9);
  assert.match(String(r.source), /USGS/);
  assert.equal(r.stale, false);
  assert.ok(r.fetchedAt);
});

test('cache : réponse précédente servie marquée périmée si la source tombe', async () => {
  let up = true;
  const data = new CarteData(async () =>
    up ? reply({ features: [] }) : reply({}, false),
  );
  await data.seismes();
  up = false;
  // Expiration forcée du cache.
  (data as unknown as { cache: Map<string, { at: number }> }).cache.get(
    'seismes',
  )!.at = 0;
  const r = (await data.seismes()) as { stale: boolean };
  assert.equal(r.stale, true);
});

test('source indisponible sans cache : erreur, jamais de valeur inventée', async () => {
  const data = new CarteData(async () => reply({}, false));
  await assert.rejects(data.seismes(), /indisponible/);
});

test('géocodage : Martinique seulement, longueur bornée', async () => {
  const feature = (context: string, label: string) => ({
    geometry: { coordinates: [-61.07, 14.6] },
    properties: {
      label,
      context,
      citycode: '97209',
      city: 'Fort-de-France',
      score: 0.81,
      type: 'street',
    },
  });
  const data = new CarteData(async () =>
    reply({
      features: [
        feature('972, Martinique', 'Rue A'),
        feature('59, Nord', 'Rue B'),
      ],
    }),
  );
  const r = await data.geocode('rue Victor Hugo');
  assert.deepEqual(
    r.results.map((x) => x.label),
    ['Rue A'],
  );
  await assert.rejects(data.geocode('ab'), /3 à 200/);
});

test('commune : code INSEE de Martinique exigé', async () => {
  const data = new CarteData(async () => reply({ data: [] }));
  assert.throws(() => data.commune('75056'), /Martinique/);
  const r = await data.commune('97209');
  assert.equal(r.zoneSismique, null);
  assert.deepEqual(r.risques, []);
});

test('cyclones NHC : Atlantique seulement, distance calculée', async () => {
  const data = new CarteData(async () =>
    reply({
      activeStorms: [
        {
          id: 'al052026',
          name: 'Test',
          classification: 'HU',
          intensity: '90',
          latitudeNumeric: 14.64,
          longitudeNumeric: -55,
          lastUpdate: 't',
          publicAdvisory: { url: 'u' },
        },
        {
          id: 'ep222026',
          name: 'Vance',
          classification: 'TS',
          intensity: '35',
          latitudeNumeric: 21,
          longitudeNumeric: -108,
          lastUpdate: 't',
        },
      ],
    }),
  );
  const r = await data.cyclones();
  assert.deepEqual(
    r.storms.map((s) => s.name),
    ['Test'],
  );
  assert.ok(Math.abs(r.storms[0].distanceKm - 649) < 5);
});

test('tsunami NOAA : messages de la Caraïbe seulement ; appels non doublés', async () => {
  let calls = 0;
  const entry = (lat: number, lon: number, t: string) =>
    `<entry><title>${t}</title><updated>2026-10-25T02:26:53Z</updated><geo:lat>${lat}</geo:lat><geo:long>${lon}</geo:long><strong>Category:</strong> Information<br/><link rel="alternate" href="https://x/b.txt"/></entry>`;
  const data = new CarteData(async () => {
    calls++;
    const body = `<feed>${entry(28, 139.9, 'Japon')}${entry(15.2, -61.3, 'Caraïbe')}</feed>`;
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => body,
    };
  });
  const [a, b] = await Promise.all([data.tsunami(), data.tsunami()]);
  assert.equal(calls, 2); // deux flux (PTWC, NTWC), une seule fois chacun
  assert.equal(a.messages.length, 2);
  assert.ok(
    a.messages.every(
      (m) => m.title === 'Caraïbe' && m.category === 'Information',
    ),
  );
});

test('situation : erreur d’une source isolée, les autres conservées', async () => {
  const data = new CarteData(async (url) =>
    url.includes('nhc') ? reply({}, false) : reply({ features: [] }),
  );
  const r = await data.situation();
  assert.equal(r.cyclones.ok, false);
  assert.equal(r.seismes.ok, true);
});

test('vigilance : jamais de niveau sans flux autorisé, clé côté serveur', async () => {
  const { vigilanceStatus } = await import('../app/server/vigilance.js');
  assert.equal(vigilanceStatus({}).configured, false);
  assert.match(vigilanceStatus({}).error, /clé du portail API/);
  assert.equal(vigilanceStatus({ METEOFRANCE_API_KEY: 'x' }).ok, false);
  const data = new CarteData(async () => reply({ features: [] }));
  const r = await data.situation();
  assert.equal(r.vigilance.ok, false);
  assert.ok(!('level' in r.vigilance));
});

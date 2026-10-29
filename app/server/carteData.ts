// Données officielles ou scientifiques pour la Carte interactive, lues par
// le serveur local (la page reste en connect-src 'self') et mises en cache.
// - Séismes observés : USGS FDSN (catalogue public, magnitudes ≳ 2,5).
// - Risques recensés par commune, zone sismique, arrêtés CatNat :
//   API Géorisques (ministère de la Transition écologique).
// - Géocodage d'adresse : Base Adresse Nationale (api-adresse.data.gouv.fr),
//   appelé seulement à la demande explicite de l'utilisatrice, jamais stocké
//   côté serveur.
// Aucune valeur n'est complétée ou estimée ici : une source indisponible
// renvoie une erreur, ou la dernière réponse en cache marquée périmée.

import https from 'node:https';
import { vigilanceStatus } from './vigilance.js';

type Fetch = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  text?: () => Promise<string>;
}>; // eslint-disable-line @typescript-eslint/no-explicit-any

// GET HTTPS natif : certains serveurs publics (Géorisques) coupent la
// connexion du fetch intégré de Node, pas celle du module https.
const httpsGet: Fetch = (url, init) =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: init.headers, timeout: 12_000 },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({
            ok: (res.statusCode ?? 500) < 400,
            status: res.statusCode ?? 500,
            json: async () => JSON.parse(body),
            text: async () => body,
          }),
        );
      },
    );
    req.on('timeout', () =>
      req.destroy(new Error('Source injoignable (délai dépassé).')),
    );
    req.on('error', reject);
  });
type Cached = { at: number; value: unknown };

export class CarteData {
  private cache = new Map<string, Cached>();
  // Requêtes en cours : un seul appel par source même si plusieurs
  // demandes arrivent en même temps (anti-doublons, quotas respectés).
  private pending = new Map<string, Promise<unknown>>();
  // Actualisation manuelle : la source n'est réinterrogée que si sa
  // dernière réponse a plus de 2 min.
  private force = false;
  constructor(private get: Fetch = httpsGet) {}

  private async cached<T extends object>(
    key: string,
    ttl: number,
    load: () => Promise<T>,
  ): Promise<T & { fetchedAt: string; stale: boolean }> {
    const hit = this.cache.get(key);
    const out = (at: number, value: unknown, stale: boolean) => ({
      ...(value as T),
      fetchedAt: new Date(at).toISOString(),
      stale,
    });
    const age = hit ? Date.now() - hit.at : Infinity;
    if (hit && age < (this.force ? Math.min(ttl, 120_000) : ttl))
      return out(hit.at, hit.value, false);
    try {
      let job = this.pending.get(key) as Promise<T> | undefined;
      if (!job) {
        job = load().finally(() => this.pending.delete(key));
        this.pending.set(key, job);
      }
      const value = await job;
      const at = Date.now();
      this.cache.set(key, { at, value });
      return out(at, value, false);
    } catch (e) {
      if (hit) return out(hit.at, hit.value, true);
      throw e;
    }
  }

  private async text(url: string) {
    const r = await this.get(url, {
      headers: {
        'User-Agent': 'DS-Studio (usage local)',
        Accept: 'application/xml',
      },
    });
    if (!r.ok || !r.text)
      throw new Error(`Source indisponible (HTTP ${r.status}).`);
    return r.text();
  }

  // Situation actuelle : chaque source avec son horodatage ou son erreur,
  // jamais de valeur complétée.
  async situation(force = false) {
    this.force = force;
    const settle = <T>(p: Promise<T>) =>
      p.then(
        (data) => ({ ok: true as const, data }),
        (e: Error) => ({ ok: false as const, error: e.message }),
      );
    try {
      const [seismes, cyclones, tsunami] = await Promise.all([
        settle(this.seismes()),
        settle(this.cyclones()),
        settle(this.tsunami()),
      ]);
      return {
        checkedAt: new Date().toISOString(),
        vigilance: vigilanceStatus(),
        seismes,
        cyclones,
        tsunami,
      };
    } finally {
      this.force = false;
    }
  }

  // Systèmes tropicaux actifs dans l'Atlantique (NHC, centre météorologique
  // régional spécialisé de l'OMM pour l'Atlantique). Distance calculée.
  cyclones() {
    return this.cached('cyclones', 30 * 60_000, async () => {
      const data = await this.json(
        'https://www.nhc.noaa.gov/CurrentStorms.json',
      );
      const km = (lat: number, lon: number) => {
        const r = Math.PI / 180;
        const a =
          Math.sin(((lat - 14.64) * r) / 2) ** 2 +
          Math.cos(14.64 * r) *
            Math.cos(lat * r) *
            Math.sin(((lon + 61.02) * r) / 2) ** 2;
        return Math.round(12742 * Math.asin(Math.sqrt(a)));
      };
      return {
        source: 'NHC / NOAA (CMRS de Miami)',
        url: 'https://www.nhc.noaa.gov/',
        storms: (
          data.activeStorms as {
            id: string;
            name: string;
            classification: string;
            intensity: string;
            latitudeNumeric: number;
            longitudeNumeric: number;
            lastUpdate: string;
            publicAdvisory?: { url: string };
          }[]
        )
          .filter((s) => s.id.startsWith('al'))
          .map((s) => ({
            name: s.name,
            classification: s.classification,
            windKt: Number(s.intensity),
            lat: s.latitudeNumeric,
            lon: s.longitudeNumeric,
            distanceKm: km(s.latitudeNumeric, s.longitudeNumeric),
            updated: s.lastUpdate,
            url: s.publicAdvisory?.url ?? 'https://www.nhc.noaa.gov/',
          })),
      };
    });
  }

  // Derniers messages tsunami des centres d'alerte NOAA (PTWC, qui couvre
  // la Caraïbe, et NTWC) ; seuls les messages localisés dans la région
  // Caraïbe / Atlantique ouest sont retenus.
  tsunami() {
    return this.cached('tsunami', 15 * 60_000, async () => {
      const feeds = ['PHEB', 'PAAQ'];
      const messages = [];
      for (const f of feeds) {
        const xml = await this.text(
          `https://www.tsunami.gov/events/xml/${f}Atom.xml`,
        );
        for (const e of xml.split('<entry>').slice(1)) {
          const pick = (re: RegExp) => re.exec(e)?.[1]?.trim();
          const lat = Number(pick(/<geo:lat>([^<]+)</));
          const lon = Number(pick(/<geo:long>([^<]+)</));
          if (!(lat > 5 && lat < 32 && lon > -98 && lon < -50)) continue;
          messages.push({
            center: f === 'PHEB' ? 'PTWC' : 'NTWC',
            title: pick(/<title>([^<]+)</) ?? '',
            category: pick(/Category:<\/strong>\s*([^<]+)</) ?? '',
            updated: pick(/<updated>([^<]+)</) ?? '',
            url:
              pick(/rel="alternate"[^>]*href="([^"]+)"/) ??
              'https://www.tsunami.gov/',
            lat,
            lon,
          });
        }
      }
      return {
        source: 'NOAA : PTWC (Caraïbe) et NTWC',
        url: 'https://www.tsunami.gov/',
        messages: messages.sort((a, b) => b.updated.localeCompare(a.updated)),
      };
    });
  }

  private async json(url: string) {
    const r = await this.get(url, {
      headers: {
        'User-Agent': 'DS-Studio (usage local)',
        Accept: 'application/json',
      },
    });
    if (!r.ok) throw new Error(`Source indisponible (HTTP ${r.status}).`);
    return r.json();
  }

  // Séismes de la région Martinique (10 ans), du plus récent au plus ancien.
  seismes() {
    return this.cached('seismes', 15 * 60_000, async () => {
      const start = new Date(Date.now() - 10 * 365.25 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const data = await this.json(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=13.5&maxlatitude=16&minlongitude=-62.5&maxlongitude=-59.5&starttime=${start}&orderby=time&limit=1000`,
      );
      return {
        source: 'USGS Earthquake Hazards Program (catalogue FDSN)',
        url: 'https://earthquake.usgs.gov/earthquakes/map/',
        events: (
          data.features as {
            id: string;
            properties: {
              mag: number;
              place: string;
              time: number;
              url: string;
            };
            geometry: { coordinates: [number, number, number] };
          }[]
        ).map((f) => ({
          id: f.id,
          time: new Date(f.properties.time).toISOString(),
          mag: f.properties.mag,
          place: f.properties.place,
          url: f.properties.url,
          lon: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
          depth: f.geometry.coordinates[2],
        })),
      };
    });
  }

  // Risques officiellement recensés pour une commune de Martinique.
  commune(insee: string) {
    if (!/^972\d{2}$/.test(insee))
      throw Object.assign(new Error('Commune de Martinique attendue.'), {
        status: 400,
      });
    return this.cached(`commune:${insee}`, 24 * 3_600_000, async () => {
      const base = 'https://georisques.gouv.fr/api/v1';
      // Appels successifs (pas en parallèle) : charge minimale pour le service.
      const risques = await this.json(
        `${base}/gaspar/risques?code_insee=${insee}`,
      );
      const zonage = await this.json(
        `${base}/zonage_sismique?code_insee=${insee}`,
      );
      const catnat = await this.json(
        `${base}/gaspar/catnat?code_insee=${insee}&page_size=50`,
      );
      return {
        source:
          'Géorisques (API publique, ministère de la Transition écologique)',
        url: 'https://www.georisques.gouv.fr/',
        commune: risques.data?.[0]?.libelle_commune ?? null,
        risques: (risques.data?.[0]?.risques_detail ?? []).map(
          (r: { libelle_risque_long: string }) => r.libelle_risque_long,
        ),
        zoneSismique: zonage.data?.[0]?.zone_sismicite ?? null,
        catnat: (catnat.data ?? []).map(
          (c: { date_debut_evt: string; libelle_risque_jo: string }) => ({
            date: c.date_debut_evt,
            risque: c.libelle_risque_jo,
          }),
        ),
      };
    });
  }

  // Adresse la plus proche d'une position (géolocalisation consentie).
  async reverse(lat: number, lon: number) {
    if (!(lat > 14.3 && lat < 15 && lon > -61.3 && lon < -60.75))
      throw Object.assign(new Error('Position hors de Martinique.'), {
        status: 400,
      });
    const data = await this.json(
      `https://api-adresse.data.gouv.fr/reverse/?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&limit=1`,
    );
    const f = (
      data.features as {
        geometry: { coordinates: [number, number] };
        properties: {
          label: string;
          context: string;
          citycode: string;
          city: string;
          distance?: number;
        };
      }[]
    ).find((x) => x.properties.context?.startsWith('972'));
    if (!f)
      throw Object.assign(
        new Error('Aucune adresse trouvée près de cette position.'),
        { status: 404 },
      );
    return {
      source: 'Base Adresse Nationale (api-adresse.data.gouv.fr)',
      label: f.properties.label,
      city: f.properties.city,
      citycode: f.properties.citycode,
      distanceM: f.properties.distance ?? null,
    };
  }

  // Adresses en Martinique seulement (contexte BAN « 972 »).
  async geocode(q: string) {
    const query = q.trim();
    if (query.length < 3 || query.length > 200)
      throw Object.assign(new Error('Adresse de 3 à 200 caractères.'), {
        status: 400,
      });
    const data = await this.json(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=10&autocomplete=0`,
    );
    return {
      source: 'Base Adresse Nationale (api-adresse.data.gouv.fr)',
      results: (
        data.features as {
          geometry: { coordinates: [number, number] };
          properties: {
            label: string;
            context: string;
            citycode: string;
            city: string;
            score: number;
            type: string;
          };
        }[]
      )
        .filter((f) => f.properties.context?.startsWith('972'))
        .slice(0, 5)
        .map((f) => ({
          label: f.properties.label,
          city: f.properties.city,
          citycode: f.properties.citycode,
          lon: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
          score: Math.round(f.properties.score * 100) / 100,
          precision: f.properties.type,
        })),
    };
  }
}

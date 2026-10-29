import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { atomicWrite, readPrivate } from './files.js';
import { sceneSchema, type Scene } from '../shared/figmaScene.js';

// Passerelle vers le plugin Figma « DS-Studio Bridge » : la dernière scène
// envoyée depuis l'export, et un code d'appairage privé (fichier hors Git)
// que le plugin présente à chaque lecture. Lecture seule côté Figma.
// Compte rendu du plugin : statut réel du dernier import.
const reportSchema = z
  .object({
    state: z.enum(['imported', 'error', 'waiting']),
    screenId: z.string().max(40).optional(),
    message: z.string().max(400).optional(),
  })
  .strict();
export type FigmaStatus = z.infer<typeof reportSchema> & { at: string };

export class FigmaBridge {
  private scene?: Scene;
  private code?: string;
  private lastSeen = 0;
  private last?: FigmaStatus;
  // Appairage déjà réussi au moins une fois (marqueur privé persistant) :
  // le code n'a plus à être montré à l'utilisatrice.
  private paired?: boolean;
  seen() {
    this.lastSeen = Date.now();
    if (!this.paired) {
      this.paired = true;
      void atomicWrite(
        this.file('figma-paired'),
        new Date().toISOString() + '\n',
      );
    }
  }
  private async isPaired() {
    if (this.paired === undefined)
      this.paired = await readPrivate(this.file('figma-paired'), 100).then(
        () => true,
        () => false,
      );
    return this.paired;
  }
  report(value: unknown) {
    this.last = { ...reportSchema.parse(value), at: new Date().toISOString() };
    return this.last;
  }
  // Connecté = plugin ouvert qui a interrogé DS-Studio il y a moins de 10 s.
  async status() {
    const s = await this.get();
    return {
      connected: Date.now() - this.lastSeen < 10_000,
      paired: await this.isPaired(),
      sent: s
        ? { screenId: s.screenId, name: s.name, createdAt: s.createdAt }
        : null,
      last: this.last ?? null,
    };
  }
  constructor(private directory: string) {}
  private file = (name: string) => path.join(this.directory, name);
  async pairing() {
    if (this.code) return this.code;
    try {
      this.code = (
        await readPrivate(this.file('figma-bridge.key'), 100)
      ).trim();
    } catch {
      const raw = randomBytes(6).toString('hex').toUpperCase();
      this.code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
      await atomicWrite(this.file('figma-bridge.key'), this.code + '\n');
    }
    return this.code;
  }
  async accept(code: unknown) {
    const a = Buffer.from(String(code ?? ''));
    const b = Buffer.from(await this.pairing());
    return a.length === b.length && timingSafeEqual(a, b);
  }
  async put(scene: unknown) {
    this.scene = sceneSchema.parse(scene);
    await atomicWrite(
      this.file('figma-scene.json'),
      JSON.stringify(this.scene),
    );
    return this.scene;
  }
  async get() {
    if (this.scene) return this.scene;
    try {
      this.scene = sceneSchema.parse(
        JSON.parse(await readPrivate(this.file('figma-scene.json'), 4_000_000)),
      );
    } catch {
      return undefined;
    }
    return this.scene;
  }
}

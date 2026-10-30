import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { atomicWrite, readPrivate } from './files.js';

// Skills Claude Code installés dans skills/<plugin>/ (Markdown seul, voir
// scripts/vendor-skills.mjs). Désactivés par défaut ; l'état (actifs,
// lecture du projet) est gardé dans .ds-studio/skills.json. Un skill actif
// n'est chargé dans la session Claude que pour le message où
// l'utilisatrice l'accepte : jamais injecté automatiquement.
export type SkillInfo = {
  id: string; // plugin:skill
  plugin: string;
  skill: string;
  description: string;
  version: string;
  repository: string;
  license: string;
  tokens: number; // estimation : octets / 4
};
const stateSchema = z
  .object({
    active: z.array(z.string().regex(/^[a-z0-9-]+:[a-z0-9-]+$/)).max(20),
    repoRead: z.boolean(),
  })
  .strict();
export type SkillState = z.infer<typeof stateSchema>;
const empty: SkillState = { active: [], repoRead: false };

export function skillStore(root: string, dataDir: string) {
  const dir = path.join(root, 'skills');
  const file = path.join(dataDir, 'skills.json');
  async function list(): Promise<SkillInfo[]> {
    const out: SkillInfo[] = [];
    let plugins: string[] = [];
    try {
      plugins = await readdir(dir);
    } catch {
      return out;
    }
    for (const plugin of plugins.sort()) {
      let meta: Record<string, string>;
      try {
        meta = JSON.parse(
          await readFile(
            path.join(dir, plugin, '.claude-plugin', 'plugin.json'),
            'utf8',
          ),
        );
      } catch {
        continue;
      }
      let names: string[] = [];
      try {
        names = await readdir(path.join(dir, plugin, 'skills'));
      } catch {
        continue;
      }
      for (const skill of names.sort()) {
        let text: string;
        try {
          text = await readFile(
            path.join(dir, plugin, 'skills', skill, 'SKILL.md'),
            'utf8',
          );
        } catch {
          continue;
        }
        const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
        const desc = /description:\s*(?:>\s*\n)?([\s\S]*?)(?:\n[a-z-]+:|$)/
          .exec(front)?.[1]
          .replace(/\s+/g, ' ')
          .replace(/^"|"$/g, '')
          .trim();
        out.push({
          id: `${plugin}:${skill}`,
          plugin,
          skill,
          description: desc ?? '',
          version: meta.version,
          repository: meta.repository,
          license: meta.license,
          tokens: Math.ceil(Buffer.byteLength(text) / 4),
        });
      }
    }
    return out;
  }
  async function state(): Promise<SkillState> {
    const known = new Set((await list()).map((s) => s.id));
    const v = stateSchema.safeParse(
      await readPrivate(file)
        .then((t) => JSON.parse(t))
        .catch(() => null),
    );
    const s = v.success ? v.data : empty;
    return { ...s, active: s.active.filter((id) => known.has(id)) };
  }
  return {
    list,
    state,
    async save(next: unknown) {
      const s = stateSchema.parse(next);
      const known = new Set((await list()).map((k) => k.id));
      const bad = s.active.find((id) => !known.has(id));
      if (bad) throw new Error(`Skill inconnu : ${bad}`);
      await atomicWrite(file, JSON.stringify(s, null, 2));
      return s;
    },
    // Skill demandé pour un message : doit être installé ET actif.
    async resolve(id: string) {
      const s = await state();
      if (!s.active.includes(id)) throw new Error('Skill inactif.');
      const info = (await list()).find((k) => k.id === id)!;
      return { ...info, dir: path.join(dir, info.plugin) };
    },
  };
}

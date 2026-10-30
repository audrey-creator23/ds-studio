// Skills Claude Code tiers, copiés en Markdown SEUL (aucun hook, aucun
// script, aucun code exécuté) à des versions figées, vérifiés par SHA-256
// (contenus audités le 30/10/2026). Chaque dossier skills/<plugin>/ est un
// plugin Claude Code minimal, chargé par DS-Studio avec `--plugin-dir`
// uniquement quand l'utilisatrice active le skill et accepte son chargement.
// Usage : node scripts/vendor-skills.mjs (réseau requis, une fois).
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const sources = [
  {
    plugin: 'superpowers',
    repo: 'obra/superpowers',
    tag: 'v7.0.1',
    author: 'Jesse Vincent',
    license: [
      'MIT',
      'a37e0e9697144819e1d965176ac4ae5bc3fa02d11e7812036bbcadf6dafe2400',
    ],
    skills: {
      'using-superpowers':
        '82c5c8866ad7f5dd4440ce66bd7806ba48a2f13771beae5cf112e53f08fe36ba',
      brainstorming:
        '61a7ef918652108c76a3fd01e02dd92d39996c6b46d4cb2819cbd03f6c45e46a',
      'writing-plans':
        'a6c67c1900064347c2a329990dd3c555657c51c3ec53b259a08aa01a2c26139a',
      'systematic-debugging':
        '51c6435d98c83c42c96ba7c35725a0b2c376cd487fb1a4e6bd0ddbe7e33ef202',
      'verification-before-completion':
        '2befe7fc55bcadaa3d97dd9e8efeb633d2561c0ebe74c5a8b17c4d9e7e4520b3',
    },
  },
  {
    plugin: 'caveman',
    repo: 'JuliusBrussee/caveman',
    tag: 'v4.0.1',
    author: 'Julius Brussee',
    license: [
      'Apache-2.0',
      'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30',
    ],
    skills: {
      caveman:
        '415d43518f2b1a9498c15a445d4657117b129ee5e81b19454ce348439cc6672b',
    },
  },
  {
    plugin: 'ponytail',
    repo: 'DietrichGebert/ponytail',
    tag: 'v5.3.3',
    author: 'Dietrich Gebert',
    license: [
      'MIT',
      'fb1bc6909ac3ef82d5c22106e32ef682b0cff66788fa915fb9b53b15c9d2f3ab',
    ],
    skills: {
      ponytail:
        '9badd22a32e19cb884e46dfa8d3aae82bb81dfa5484105b8b4f0262df823a509',
    },
  },
];

async function fetchChecked(url, sha) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  const text = await res.text();
  const got = createHash('sha256').update(text).digest('hex');
  if (got !== sha) throw new Error(`${url} : empreinte inattendue ${got}`);
  return text;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const s of sources) {
    const raw = (p) =>
      `https://raw.githubusercontent.com/${s.repo}/${s.tag}/${p}`;
    const root = path.join('skills', s.plugin);
    for (const [name, sha] of Object.entries(s.skills)) {
      const text = await fetchChecked(raw(`skills/${name}/SKILL.md`), sha);
      await mkdir(path.join(root, 'skills', name), { recursive: true });
      await writeFile(path.join(root, 'skills', name, 'SKILL.md'), text);
    }
    await writeFile(
      path.join(root, 'LICENSE'),
      await fetchChecked(raw('LICENSE'), s.license[1]),
    );
    await mkdir(path.join(root, '.claude-plugin'), { recursive: true });
    await writeFile(
      path.join(root, '.claude-plugin', 'plugin.json'),
      JSON.stringify(
        {
          name: s.plugin,
          version: s.tag.replace(/^v/, ''),
          description: `Skills ${s.plugin} (Markdown seul, sans hooks) copiés depuis https://github.com/${s.repo} @ ${s.tag}.`,
          author: { name: s.author },
          repository: `https://github.com/${s.repo}`,
          license: s.license[0],
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `${s.plugin} ${s.tag} : ${Object.keys(s.skills).length} skill(s) vérifié(s).`,
    );
  }
}

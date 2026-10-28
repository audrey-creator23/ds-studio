#!/usr/bin/env node
// Serveur DS-Studio autonome (macOS) : agent launchd de l'utilisatrice,
// indépendant du terminal et de Claude Code. Démarre à l'ouverture de
// session, redémarre après un arrêt anormal, journaux dans
// ~/Library/Logs/DS-Studio. Écoute 127.0.0.1 uniquement (app/server).
//   npm run service -- install | start | stop | restart | status | logs | uninstall
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const label = 'com.ds-studio.server';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4310;
const plist = path.join(os.homedir(), 'Library/LaunchAgents', `${label}.plist`);
const logs = path.join(os.homedir(), 'Library/Logs/DS-Studio');
const domain = `gui/${process.getuid()}`;
const url = `http://127.0.0.1:${port}/`;

const xml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function definition() {
  const args = [process.execPath, '--import', 'tsx', 'app/server/index.ts'];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>${args.map((a) => `<string>${xml(a)}</string>`).join('')}</array>
  <key>WorkingDirectory</key><string>${xml(root)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key><string>${port}</string>
    <key>PATH</key><string>${xml(`${path.dirname(process.execPath)}:/usr/bin:/bin`)}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>${xml(path.join(logs, 'server.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(logs, 'server.err.log'))}</string>
</dict>
</plist>
`;
}

const launchctl = (...args) =>
  spawnSync('launchctl', args, { encoding: 'utf8' });
const loaded = () => launchctl('print', `${domain}/${label}`).status === 0;
function info() {
  const out = launchctl('print', `${domain}/${label}`).stdout || '';
  return {
    state: /\n\s*state = (\S+)/.exec(out)?.[1],
    pid: /\n\s*pid = (\d+)/.exec(out)?.[1],
    lastExit: /last exit code = ([^\n]+)/.exec(out)?.[1],
  };
}
const probe = () =>
  new Promise((resolve) => {
    const req = http.get(url, { timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => {
      req.destroy();
      resolve(0);
    });
  });
const wait = async (ok, ms = 15000) => {
  for (let t = 0; t < ms; t += 500) {
    if (await ok()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};
// Qui écoute déjà le port (autre que l'agent) : jamais deux serveurs.
function listener() {
  try {
    const out = execFileSync(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp'],
      {
        encoding: 'utf8',
      },
    );
    return /p(\d+)/.exec(out)?.[1];
  } catch {
    return undefined;
  }
}
function busyByOther() {
  const pid = listener();
  return pid && pid !== info().pid ? pid : undefined;
}

async function start() {
  const other = busyByOther();
  if (other) {
    console.error(
      `Port ${port} déjà utilisé par un autre processus (pid ${other}). Arrêtez-le (serveur lancé depuis un terminal ou l’aperçu de Claude Code), puis relancez.`,
    );
    process.exit(1);
  }
  if (!existsSync(path.join(root, 'dist/v3.html')))
    console.warn('dist/ absent : lancez « npm run build » pour l’interface.');
  if (!loaded()) {
    const r = launchctl('bootstrap', domain, plist);
    if (r.status !== 0) throw new Error(r.stderr.trim() || 'bootstrap refusé');
  } else launchctl('kickstart', `${domain}/${label}`);
  if (await wait(async () => (await probe()) === 200))
    console.log(`DS-Studio actif · ${url} (pid ${info().pid})`);
  else {
    console.error(`Le serveur ne répond pas. Journaux : ${logs}`);
    process.exit(1);
  }
}
function stop() {
  if (loaded()) launchctl('bootout', `${domain}/${label}`);
  console.log(
    'DS-Studio arrêté (redémarrera à la prochaine ouverture de session).',
  );
}
async function status() {
  const code = await probe();
  const i = loaded() ? info() : undefined;
  console.log(
    [
      `Agent : ${existsSync(plist) ? (i ? `chargé · ${i.state}${i.pid ? ` · pid ${i.pid}` : ''}` : 'installé, arrêté') : 'non installé'}`,
      `HTTP  : ${code ? `${code} sur ${url}` : 'aucune réponse'}`,
      busyByOther()
        ? `Port  : occupé par un autre processus (pid ${busyByOther()})`
        : '',
      i?.lastExit ? `Dernière sortie : ${i.lastExit}` : '',
      `Logs  : ${logs}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exitCode = code === 200 ? 0 : 3;
}

const command = process.argv[2] ?? 'status';
if (process.platform !== 'darwin') {
  console.error('Service réservé à macOS (launchd). Ailleurs : npm start.');
  process.exit(1);
}
switch (command) {
  case 'install':
    mkdirSync(logs, { recursive: true });
    mkdirSync(path.dirname(plist), { recursive: true });
    if (loaded()) launchctl('bootout', `${domain}/${label}`);
    writeFileSync(plist, definition());
    console.log(`Agent installé : ${plist}`);
    await start();
    break;
  case 'start':
    if (!existsSync(plist)) {
      console.error('Agent non installé : npm run service -- install');
      process.exit(1);
    }
    await start();
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    stop();
    await wait(async () => !listener(), 5000);
    await start();
    break;
  case 'status':
    await status();
    break;
  case 'logs':
    for (const f of ['server.log', 'server.err.log']) {
      const file = path.join(logs, f);
      console.log(`── ${file}`);
      if (existsSync(file))
        console.log(
          readFileSync(file, 'utf8').split('\n').slice(-30).join('\n'),
        );
    }
    break;
  case 'uninstall':
    stop();
    rmSync(plist, { force: true });
    console.log('Agent désinstallé (journaux conservés).');
    break;
  default:
    console.error(
      'Usage : npm run service -- install | start | stop | restart | status | logs | uninstall',
    );
    process.exit(2);
}

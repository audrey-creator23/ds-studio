// Fil principal du plugin : indique à l'interface si le fichier ouvert est
// le fichier cible, construit les calques (tout ou rien) et mémorise le
// code d'appairage et le dernier export importé (clientStorage, local).
import { importScene, isTargetFile } from './importer.js';
import { figmaTarget } from '../app/shared/figmaTarget.js';
import type { Scene } from '../app/shared/figmaScene.js';

declare const figma: any; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const __html__: string;

figma.showUI(__html__, { width: 360, height: 520, themeColors: true });
// Bouton « Importer depuis DS-Studio » dans le panneau de droite du
// fichier cible (API Relaunch) : relance le plugin en un clic, qui importe
// alors le dernier envoi sans autre action.
if (isTargetFile(figma))
  figma.root.setRelaunchData({ import: 'Dernier écran envoyé par DS-Studio' });
Promise.all([
  figma.clientStorage.getAsync('pairing'),
  figma.clientStorage.getAsync('last'),
  figma.clientStorage.getAsync('auto'),
]).then(
  ([code, last, auto]: [
    string | undefined,
    string | undefined,
    string[] | undefined,
  ]) =>
    figma.ui.postMessage({
      type: 'init',
      version: '2.34',
      code: code ?? '',
      last: last ?? '',
      auto: auto ?? [],
      target: isTargetFile(figma),
      fileName: figma.root.name,
      targetName: figmaTarget.fileName,
    }),
);
figma.ui.onmessage = async (msg: {
  type: string;
  scene?: Scene;
  replace?: boolean;
  code?: string;
  last?: string;
  auto?: string[];
}) => {
  if (msg.type === 'save-pairing')
    return figma.clientStorage.setAsync('pairing', msg.code);
  if (msg.type === 'save-last')
    return figma.clientStorage.setAsync('last', msg.last);
  if (msg.type === 'save-auto')
    return figma.clientStorage.setAsync('auto', msg.auto);
  if (msg.type === 'open-target') return figma.openExternal(figmaTarget.url);
  if (msg.type !== 'import' || !msg.scene) return;
  if (!isTargetFile(figma))
    return figma.ui.postMessage({
      type: 'error',
      error: `Fichier ouvert « ${figma.root.name} » : l’import se fait seulement dans « ${figmaTarget.fileName} ».`,
    });
  try {
    const report = await importScene(figma, msg.scene, {
      replace: msg.replace,
    });
    figma.ui.postMessage({ type: 'report', report, scene: msg.scene });
    if (!report.needsConfirm)
      figma.notify(`DS-Studio : « ${msg.scene.name} » importé.`);
  } catch (e) {
    figma.ui.postMessage({ type: 'error', error: (e as Error).message });
  }
};

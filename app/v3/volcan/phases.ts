// Six phases du volcan = avancement RÉEL du PFE (étapes faites ou
// validées) : 0–20 % → 1 … 80–99 % → 5 ; 100 % → 6. Aperçu : le jalon i
// de la frise (Lancement → Fin du DS) montre la phase i + 1, sans rien
// modifier. Métaphore, jamais l'activité de la montagne Pelée.
export const phases = [
  'Endormi',
  'Fumerolles',
  'Fumée dense',
  'Cratère incandescent',
  'Pré-éruption',
  'Éruption',
];
export const phaseOf = (pct: number) =>
  pct >= 100 ? 6 : Math.min(5, 1 + Math.floor(Math.max(0, pct) / 20));

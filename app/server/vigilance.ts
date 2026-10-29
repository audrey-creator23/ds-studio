// Connecteur de vigilance Météo-France pour la Martinique, par moyen
// autorisé uniquement. Constats (29/10/2026) :
// - meteofrance.mq : les « Droits de reproduction » de Météo-France
//   interdisent l'extraction répétée et systématique et l'usage en réseau
//   sans disposition expresse → aucune lecture automatisée du site ;
// - flux officiel vigilance outre-mer (Licence Ouverte 2.0) accessible en
//   direct seulement par le portail API de Météo-France, avec une clé.
// La clé reste côté serveur (variable METEOFRANCE_API_KEY, fichier .env),
// jamais transmise au navigateur. Sans clé, ou tant que le point d'accès
// outre-mer n'est pas confirmé dans la documentation du portail, le
// connecteur répond « non disponible » avec la raison : aucun niveau,
// aucun « vert » par défaut.
export type Vigilance = {
  level: 'vert' | 'jaune' | 'orange' | 'rouge' | 'violet' | 'gris';
  phenomena: string[];
  zone: string;
  source: string;
  published: string;
  validUntil: string | null;
};
export const officialUrl = 'https://meteofrance.mq/fr/vigilance';

export function vigilanceStatus(env: NodeJS.ProcessEnv = process.env): {
  ok: false;
  error: string;
  configured: boolean;
} {
  return env.METEOFRANCE_API_KEY
    ? {
        ok: false,
        configured: true,
        error:
          'Clé API présente : le point d’accès vigilance outre-mer doit être confirmé dans la documentation du portail API Météo-France avant connexion.',
      }
    : {
        ok: false,
        configured: false,
        error:
          'Flux officiel non connecté : il demande une clé du portail API Météo-France (à placer dans .env). Le site n’est pas lu automatiquement.',
      };
}

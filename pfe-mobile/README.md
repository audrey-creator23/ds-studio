# Application mobile du PFE (prototype)

Application React autonome, servie par DS-Studio sur `/pfe/` et affichée
dans la page « Prévention & ressources » > « Prototype de l’application »
(cadre iPhone 15 Pro : 393 × 852 pt, Dynamic Island, zones sûres 59 / 34 pt,
zoom « Ajuster »).

- Ouvrir seule : `http://127.0.0.1:4310/pfe/`.
- Modifications en direct (HMR) : `npm run dev`, puis `/pfe/` ou la page
  Prévention (le serveur de dev sert `pfe-mobile/` via Vite).
- Build : entrée `pfe-mobile/index.html` de `vite.config.ts` →
  `dist/pfe-mobile/`.

## Architecture

- `src/App.tsx` : parcours lancement (2,4 s, 0,6 s si mouvement réduit) →
  accueil (« Je suis en danger » / « Explorer les risques ») → urgence,
  carte ; menu : ressources hors ligne, plan d’urgence, comprendre.
- Aucune copie de données ni de composants : carte 3D (`MapView`),
  vigilance (`Proches`), risques, téléchargements (`Downloads`), plan
  (`Plan`) viennent de `app/v3/carte/`, partagés avec DS-Studio.
- `src/theme/current/` : DA actuelle (importe les tokens et styles de
  DS-Studio v3). `src/theme/future/` : réservé à la future DA, vide tant
  qu’elle n’est pas validée.
- Données : API du serveur local (`/api/carte/situation`, géocodage) ;
  stockage sur l’appareil (logement, plan, ressources) ; rien n’est envoyé
  ailleurs sans action explicite.

## Simulateur : audit

`react-device-mockup` n’existe pas sur npm. Alternatives écartées :
`iphone-react-viewer` (aucune licence), `react-device-display` (santé
Snyk 36/100), `react-mockframe` (pas d’iPhone 15 Pro), composant 21st.dev
(clé d’API). Choix : le cadre iPhone déjà présent dans DS-Studio
(`app/v3/studio/Device.tsx`), aucune dépendance ajoutée. C’est une
maquette dans le navigateur, pas le simulateur iOS d’Xcode.

## Limites (jamais simulées)

- Appels : liens `tel:` (le téléphone appelle) ; « Je suis en vie » :
  lien `sms:` pré-rempli, envoyé par la personne elle-même.
- Position des proches : seulement via un service réel choisi avec eux ;
  l’application ne localise personne.
- Points de rassemblement, abris, PC sécurité, fréquences radio : non
  publiés en données ouvertes → « Non disponible » et renvoi vers la
  préfecture / le DICRIM ; champs à remplir depuis les sources
  officielles.
- Hors ligne : ressources mises dans le Cache Storage du navigateur
  (plafond 1 Go, tailles réelles, persistance demandée mais non
  garantie). Sans service worker, l’app elle-même doit rester servie par
  DS-Studio (serveur local) : seules les sources internet manquent.
- Vigilance : flux officiel Météo-France outre-mer non connecté (clé du
  portail API requise, voir `docs/SOURCES_RISQUES.md`) → « Vigilance non
  disponible », jamais assimilé au vert.
- « Je suis en danger » : situation choisie automatiquement d’après le
  dernier événement observé (cyclone < 800 km, message tsunami < 24 h,
  séisme < 48 h), présenté comme incertain, jamais comme une alerte ;
  aucun ordre d’évacuation déduit ; contact d’urgence (`tel:`) fixe en
  bas ; partage de position par SMS ou feuille de partage, jamais annoncé
  comme envoyé ; choix gardés en cas d’interruption.
- Position : « Où êtes-vous ? » avant la carte (géolocalisation ≤ 300 m,
  adresse BAN limitée à la Martinique, ou dernière adresse), chaque fois
  avec consentement ; demandée une seule fois, modifiable ou supprimable
  depuis « Ma position ».
- Carte plein écran : vigilance flottante (« Non disponible » sans flux),
  tiroir réduit / intermédiaire / déployé (glisser, clic, flèches ↑ ↓) ;
  une seule couche de risque à la fois, signalée comme illustration.
- Notifications : permission demandée par un geste explicite ; pas de
  service push (aucun serveur) : rien ne s’affiche app fermée, seule une
  notification de test est envoyée. Ne remplace jamais FR-Alert. Proches :
  non disponible sans service réel consenti.
- Raccourcis : liens `/pfe/#danger|explore|offline|plan` à placer sur
  l’écran d’accueil, dans Raccourcis iOS (Siri, Toucher le dos, bouton
  Action) ou un widget Android. Le double appui sur le bouton
  d’alimentation n’est pas accessible à une page web ; le SOS natif reste
  intact.
- Mise en page : un seul code responsive (barre latérale ≥ 900 px,
  burger en dessous).

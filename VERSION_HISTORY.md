# Historique des versions

Une entrée par modification de code validée, la plus récente en premier.
Numérotation [SemVer](https://semver.org/lang/fr/) : **patch** pour un correctif,
**minor** pour une fonctionnalité compatible, **major** pour un changement incompatible
(schéma de tokens, API, format de données). La version suit `package.json`.

## 2.44.0 — 2026-10-29

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `pfe-mobile/src/Explore.tsx` et `pfe-mobile/src/Settings.tsx`
  (nouveaux), `pfe-mobile/src/App.tsx`, `pfe-mobile/src/app.css`,
  `app/v3/carte/Locate.tsx` (extrait de `app/v3/Carte.tsx`),
  `app/server/vigilance.ts` (nouveau), `app/server/carteData.ts`,
  `app/v3/carte/Proches.tsx`, `tests/carteData.test.ts`,
  `tests/e2e/studio.spec.ts`, `docs/SOURCES_RISQUES.md`, `pfe-mobile/README.md`.
- **Changement** : app PFE — écran « Où êtes-vous ? » avant la carte
  (géolocalisation, adresse, dernière adresse ; consentement, Martinique
  seulement, demandé une fois, modifiable via « Ma position ») ; carte 3D
  plein écran avec burger flottant, puce « Vigilance actuelle » et tiroir
  à trois états (7 risques, une couche à la fois) ; menu avec
  Notifications (permission explicite, test, préférences, sans push ni
  remplacement de FR-Alert) et Widgets & raccourcis (liens `#danger`,
  `#explore`, `#offline`, `#plan`, guides iPhone/Android, limite du bouton
  d’alimentation). Connecteur vigilance Météo-France par moyen autorisé
  seulement : clé du portail API requise, sinon « Non disponible » avec la
  raison, jamais un vert ; aucune lecture du site (droits de reproduction).
- **Vérification** : `npm run check`, `npm test` (71), `npm run build`,
  `npx playwright test` (44), `npm run scan` (0 alerte).

## 2.43.0 — 2026-10-29

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `pfe-mobile/src/App.tsx`, `pfe-mobile/src/Danger.tsx` et
  `pfe-mobile/src/crisis.ts` (nouveaux), `pfe-mobile/src/app.css`,
  `pfe-mobile/README.md`, `app/v3/carte/Proches.tsx`, `app/v3/Carte.tsx`,
  `docs/SOURCES_RISQUES.md`, `tests/e2e/studio.spec.ts`
- **Résumé** : Application PFE. Un seul code responsive : sur grand
  écran, navigation latérale permanente et contenu centré (880 px max),
  typographie et marges agrandies ; burger sous 900 px. Menu à icônes
  (Accueil, Ressources hors ligne, Mon plan d’urgence, Comprendre les
  alertes), état actif, fermeture Échap / clic extérieur ; texte
  « Accueil » retiré à côté du burger. Lancement : illustration, titre,
  progression et bouton d’urgence empilés sans chevauchement (urgence
  accessible sans attendre). Marges communes `--m-pad` avec zones sûres.
  « Je suis en danger » refondu pour la crise : situation déduite du
  dernier événement observé (cyclone NHC < 800 km, message tsunami NOAA
  < 24 h, séisme USGS < 48 h) présentée comme incertaine, changeable
  d’un clic ; gros bouton « Appeler les secours » (112) distinct des
  autres numéros (15, 18, 17, SMS 114) ; questions en accordéon (Que
  faire maintenant ? Dois-je évacuer ? Où me mettre à l’abri ? Où
  retrouver mes proches ? Comment signaler que je vais bien ?) avec
  action prioritaire, étapes, détails et sources, sans aucun ordre
  d’évacuation déduit ; « Prévenir mes proches » (position actuelle ou
  enregistrée datée, SMS ou partage, jamais annoncé comme envoyé, hors
  ligne « non envoyé ») ; situations particulières (blessé, enfants,
  sans parole, immobilisé, sans GPS, sans réseau, batterie faible,
  consignes contradictoires) ; barre fixe « Appeler mon contact
  d’urgence » ou ajout rapide ; choix gardés en cas d’interruption.
  Vigilance : flux officiel Météo-France outre-mer identifié (Licence
  Ouverte 2.0) mais accessible en direct seulement avec une clé du
  portail API : non connecté, documenté, « Vigilance non disponible »
  conservé. « Comprendre les alertes » remplace le libellé long.
  Tests e2e : parcours PFE mis à jour, scénarios de crise.

## 2.42.0 — 2026-10-29

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Studio.tsx`, `app/v3/studio/Device.tsx`,
  `app/v3/v3.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Mon espace Design. Onglets gauche (Bibliothèque → Calques
  → Claude) : onglet actif entièrement rempli de sa couleur
  (`#FF773D`, `#F55536`, `#FABC3C`) avec texte et pictogramme noirs
  (contraste ≥ 6:1), liseré supprimé ; inactifs neutres (aucun
  pictogramme coloré) ; teinte atténuée de la card gauche conservée.
  Appareils : « Mobile » renommé « iPhone » (identifiant `mobile` et
  données inchangés) ; info-bulles avec la résolution logique
  (iPhone 15 Pro 393 × 852 pt, iPad Air 11" 820 × 1180, MacBook Pro 14"
  1512 × 982) et la mention « simulation web, pas un émulateur natif ».
  Nouveau bouton « Tester l’écran » : composants réellement utilisables
  dans l’appareil (clic, saisie, défilement), sélection d’édition
  suspendue puis reprise ; changement d’appareil sans perte ; état
  activé noir et blanc. Tests e2e : couleurs des onglets (2 thèmes),
  4 appareils, saisie réelle en mode test.

## 2.41.0 — 2026-10-29

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Carte.tsx`, `app/v3/carte/Proches.tsx`,
  `app/v3/Prevention.tsx`, `app/v3/carte/Downloads.tsx` et
  `app/v3/carte/Plan.tsx` (nouveaux), `app/v3/studio/Device.tsx`,
  `app/server/http.ts`, `vite.config.ts`, `tsconfig.json`,
  `app/v3/v3.css`, `pfe-mobile/` (nouveau : `index.html`, `src/`,
  `theme/current/`, `theme/future/`, `README.md`),
  `tests/e2e/studio.spec.ts`
- **Résumé** : Carte interactive, card droite compacte : « Vous êtes
  ici » en sous-card grise ; grand titre « Niveau de vigilance actuel »
  avec niveau global (« Vigilance non disponible », jamais assimilé au
  vert, aucun niveau officiel n’étant publié en données ouvertes) ; 7
  tags de risques (pictogramme animé, repère de couleur propre, gris
  « Non disponible ») ; clic → sélection noir et blanc, animation
  immersive du phénomène et couche sur la carte (mention « illustration,
  pas la situation actuelle »), un seul risque, retour « Vue
  d’ensemble » ; « En savoir plus » → fiche (vigilance, zone, proximité,
  observations récentes, évolution 10 ans, conséquences, consignes,
  sources, horodatage). Anciennes cards supprimées après migration ;
  refresh 60 min / manuel, horloge de Martinique et décompte conservés.
  Prévention & ressources devient l’atelier PFE : onglets Prototype de
  l’application (vraie app React `pfe-mobile/` servie sur `/pfe/`, HMR
  en mode dev, dans le cadre iPhone 15 Pro existant ; audit des paquets
  de maquettes : aucun retenu, aucune dépendance ajoutée), Me préparer
  (« Télécharger mes ressources d’urgence » : contenus réels en Cache
  Storage, tailles, progression, plafond 1 Go, mise à jour /
  suppression, persistance demandée sans garantie, ressources sans
  source officielle marquées indisponibles ; « Mon plan d’urgence » :
  7 étapes courtes, SMS « Je suis en vie » préparé dans la messagerie,
  aucun suivi de position, informations officielles à noter ; trousse
  existante conservée), Comprendre les risques, Mon logement. App
  mobile : lancement animé, accueil 2 actions, urgence (appels `tel:`,
  consignes, position, abris non inventés), exploration (carte 3D +
  même logique de vigilance), menu (ressources hors ligne, plan,
  comprendre). Tests e2e : carte refondue, parcours PFE complet.

## 2.40.0 — 2026-10-29

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Carte.tsx`, `app/v3/carte/Proches.tsx` (nouveau),
  `app/v3/carte/Logement.tsx`, `app/v3/carte/Situation.tsx`,
  `app/v3/carte/MapView.tsx`, `app/v3/carte/scene.ts`,
  `app/v3/Prevention.tsx`, `app/server/carteData.ts`,
  `app/server/http.ts`, `app/v3/v3.css`, `docs/SOURCES_RISQUES.md`
  (nouveau), `tests/carteData.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** : Carte interactive centrée sur la personne. Card droite :
  onboarding « Où êtes-vous en Martinique ? » (« Me géolocaliser » avec
  permission du navigateur, précision ≤ 300 m exigée, adresse retrouvée
  par la BAN puis enregistrement consenti ; refus ou imprécision →
  saisie manuelle) ou « Saisir une adresse » (autocomplétion BAN après
  consentement). Puis « Vous êtes ici » (adresse, modifier, supprimer,
  recentrer) et « Les risques près de chez vous » : 7 lignes
  (pictogramme animé discrètement selon le phénomène, vigilance
  officielle grise « Non disponible », observation datée, zone, source,
  date de publication, proximité calculée du logement) et détail en
  accordéon (vigilance, zone, proximité, observations, évolution sur
  10 ans pour les séismes, conséquences, gestes, sources). Carte : couche
  du risque choisi seule (zones calculées sans effet animé, légende
  dédiée), séismes observés, balise du logement (sur cette page
  seulement), « Vue d’ensemble ». Nouveaux flux publics : cyclones
  actifs NHC/NOAA (distance calculée), messages tsunami NOAA PTWC/NTWC
  filtrés Caraïbe ; route `situation` (cache par source, anti-doublons,
  actualisation forcée limitée, réponse périmée datée) ; vérification
  toutes les 60 min, au retour en ligne et via « Actualiser les
  données » ; heure de Martinique en direct, dernière vérification et
  décompte. Légende de vigilance retirée de la carte, déplacée
  intégralement dans Prévention > Comprendre les risques > « Comprendre
  les niveaux de vigilance ». Sources documentées par risque
  (`docs/SOURCES_RISQUES.md`). Tests : 3 unitaires, e2e carte réécrits
  (onboarding, géolocalisation autorisée / refusée / imprécise, adresse
  invalide, 7 risques, détail, couche, refresh manuel et 60 min, hors
  ligne, source en panne, légende déplacée, mobile).

## 2.39.0 — 2026-10-29

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Studio.tsx`, `app/v3/studio/LibraryPanel.tsx`,
  `app/v3/studio/ExportPanel.tsx`, `app/v3/studio/useFigmaSync.ts`,
  `app/server/figmaBridge.ts`, `app/shared/figmaTarget.ts`,
  `app/v3/v3.css`, `figma-plugin/README.md`, `tests/e2e/studio.spec.ts`
- **Résumé** : Design. Bibliothèque : après un ajout réussi (clic dans la
  galerie ou glisser-déposer), filtres de catégorie remis au neutre,
  recherche gardée. Onglets gauche dans l’ordre Bibliothèque → Calques →
  Claude, couleurs de catégorie en tokens (`--tab-*`) : actif noir et
  blanc avec liseré coloré, pictogrammes teintés, card gauche nuancée
  (7 % clair, 9 % sombre), transition douce. Export : bouton
  « Exporter », modale « Exporter un écran » avec champ « Nom de
  l’écran » ; formats affichés seulement après un nom valide (option PNG
  transparent conservée) ; CTA « Exporter » désactivé sinon. Figma :
  ouverture de Figma Desktop par le schéma `figma://` déclaré par l’app
  macOS, repli explicite « Ouvrir dans le navigateur » si elle ne s’ouvre
  pas ; statuts réduits à « Ouverture de Figma… », « Import confirmé »
  (après compte rendu du plugin) ou erreur avec action ; diagnostic
  après 2 min (plugin jamais lancé / ouvert sans import) et « Relancer » ;
  code d’appairage montré seulement tant que le plugin n’a jamais été
  appairé (marqueur privé `.ds-studio/figma-paired`), plus de nombre de
  calques ni de détails techniques. Tests e2e adaptés + nouveau test.

## 2.38.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Carte.tsx`, `app/v3/Prevention.tsx` (nouveau),
  `app/v3/carte/MapView.tsx` (nouveau), `app/v3/carte/scene.ts`,
  `app/v3/carte/risks.ts`, `app/v3/carte/Situation.tsx`,
  `app/v3/carte/Logement.tsx`, `app/v3/App.tsx`, `app/v3/v3.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Animations perdues en 2.37 : l’océan était dessiné après
  les effets et les masquait (vagues du tsunami, ondes en mer,
  sargasses, panache) ; ordre de rendu corrigé. Océan uniforme : bleu
  continu selon la profondeur, turquoise limité à la frange côtière peu
  profonde, fond visible seulement près des côtes (plus de taches ni de
  démarcations). Carte interactive recentrée sur « Niveaux de risque
  actuels » : 7 balises géolocalisées (ajout « Brume de sable »),
  échelle vert → jaune → orange → rouge → violet en légende repliable,
  gris « Non disponible » quand aucune vigilance officielle n’est
  publiée en données ouvertes (aucune couleur ni animation de danger
  inventée) ; séismes observés USGS en 3D avec ondulations discrètes
  (observation, pas alerte) ; fiche niveau / zone / source /
  horodatage / consignes. Nouvelle page « Prévention & ressources »
  (`shield-check`) : onglets Comprendre les risques (7 simulations, dont
  brume de sable : voile et particules poussées par les alizés,
  densité réglable, seuils PM10), Me préparer, Mon logement (déplacés
  sans perte). Carte 3D partagée (`MapView`), logement synchronisé entre
  pages, navigation croisée avec onglet ciblé. Tests e2e réécrits
  (niveaux, sources, océan, 7 simulations, logement, trousse, repli).

## 2.37.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Carte.tsx`, `app/v3/carte/scene.ts`,
  `app/v3/carte/risks.ts`, `app/v3/carte/Situation.tsx`,
  `app/v3/carte/Logement.tsx`, `app/v3/carte/Preparer.tsx`,
  `app/v3/carte/Coupe.tsx` (nouveaux), `app/server/carteData.ts`
  (nouveau), `app/server/http.ts`, `app/v3/v3.css`,
  `tests/carteData.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** : Carte interactive en observatoire + simulateur. Onglets
  « Situation actuelle », « Comprendre les risques », « Me préparer »,
  carte prioritaire et panneau sobre. Trois natures d’information
  jamais mélangées : officiel / exposition géographique / simulation.
  Données réelles via le serveur local (cache, horodatage, « périmées »
  si source injoignable) : séismes USGS (10 ans, graphique annuel,
  « Activité observée en hausse » = constat chiffré), risques par
  commune Géorisques, géocodage Base Adresse Nationale. Sans API
  publique (vigilance Météo-France outre-mer, statut OVSM, sargasses,
  refuges) : « Données indisponibles » + lien officiel, rien d’inventé.
  Mon logement : consentement explicite, adresse envoyée seulement à la
  BAN (corps de requête, jamais dans une URL), gardée sur l’appareil,
  modifiable et supprimable ; faits calculés sur le MNT (altitude,
  distances mer / cours d’eau / Pelée) et niveau simulé séparé. 3D :
  océan plein cadre (houle, reflets, transparence côtière, écume, aucun
  bord de dalle), 6e risque « Fortes pluies » (écoulements D8 après
  comblement des dépressions, pluie, éclairs), volcan paramétrable
  (panache selon le vent, nuée suivant la pente réelle, projections),
  sargasses organiques, séismes observés en 3D, balise du logement.
  Coupe animée subduction → séisme → tsunami. Me préparer : trousse
  72 h selon le foyer (eau 6 L/pers.), besoins, compléments par risque,
  progression gardée, contacts d’urgence, autorités.
  Tests : 5 unitaires (données serveur), 3 e2e (situation, logement et
  confidentialité, océan plein cadre, 6 simulations, scénario, coupe,
  trousse, source indisponible, repli sans WebGL, mobile).

## 2.36.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; dépendances `three` 0.186.1
  et `@types/three` 0.186.0)
- **Fichiers** : `app/v3/Carte.tsx`, `app/v3/carte/scene.ts`,
  `app/v3/carte/risks.ts`, `app/v3/carte/assets.d.ts`,
  `app/v3/carte/martinique-dem.png` + `.json` (données),
  `scripts/fetch-martinique-dem.mjs`, `app/v3/App.tsx`, `app/v3/v3.css`,
  `app/server/http.ts` (type `.png`), `tests/e2e/studio.spec.ts`,
  `package.json`, `package-lock.json`
- **Résumé** : Page « Carte interactive » (Lucide `map`) : en-tête et
  grande card plein écran, sans défilement. Martinique en vraie 3D
  (Three.js, chargé à l’ouverture de la page) à partir d’un MNT réel
  géoréférencé : AWS Terrain Tiles, terre SRTM (zoom 11, ~74 m), mer
  ETOPO1 / GEBCO (zoom 10, lissée) ; script de récupération
  reproductible. Relief ×2, fonds ×0,5 (annoncé). Couleurs selon
  altitude et pente (sable, cultures, forêt, sommets, roche), fonds par
  profondeur, mer translucide, soleil et ombres portées, socle en coupe
  (strates). Vue quasi zénithale inclinée, nord en haut, cadrage auto,
  parallaxe légère, rotation et zoom bornés, recentrage, clavier
  (flèches, + / −, 0), `prefers-reduced-motion` (rendu à la demande).
  Cinq risques, une couche à la fois, légende faible / modéré / élevé :
  tsunami (vagues venant de l’est, littoral ≤ 10 m), séisme (épicentre
  réel du 29/11/2007, USGS, ondes, vibration, foyer hors échelle),
  volcanisme (Pelée, panache illustratif, distances), cyclone
  (trajectoire fictive animée et pilotable, vortex anti-horaire, vents),
  sargasses (andains dérivant vers l’ouest, échouements atlantiques).
  Zones calculées sur le relief réel, hypothèses écrites ; survol :
  surbrillance et micro-label ; clic : fiche Quoi / Où / Risque /
  Conséquences / Prévention / Source. Mention « Simulation pédagogique :
  ni prévision ni alerte », sources. Sans WebGL : fiches consultables.
  Tests e2e : altitudes réelles, 5 couches, fiches, survol / clic de
  zone, trajectoire, clavier, page sans défilement, repli sans WebGL.

## 2.35.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/studio/RotateIcon.tsx` (nouveau), `app/v3/Bubble.tsx`,
  `app/v3/Studio.tsx`, `app/v3/v3.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Pivoter : icône dessinée au trait Lucide, silhouette de
  l’appareil actif (Mobile, iPad, MacBook, Screen) dans son orientation
  courante + flèche courbe ; bouton carré, info-bulle et `aria-label`
  « Pivoter ». Chat : retiré de la card (annule le logement de la
  2.34.3), bouton flottant au-dessus, déplaçable dans toute la fenêtre
  (glisser souris/tactile, Alt + flèches), position mémorisée et
  ramenée dans la fenêtre au redimensionnement, bas droite par défaut ;
  glisser n’ouvre pas, clic ou Entrée ouvre ; fenêtre du chat ancrée au
  bouton. Card Preview : padding (12 px, 4 côtés) et gaps (10 px)
  identiques à la card gauche, barre en haut, onglets en bas sans marge
  négative. Test e2e : 5 tailles, 4 appareils et rotation, glisser,
  persistance, clavier.

## 2.34.3 — 2026-10-28

- **Type** : patch (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Bubble.tsx`, `app/v3/Studio.tsx`, `app/v3/v3.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Card Preview (seule modifiée) : padding irrégulier
  (8 px, onglets collés au bas par marge négative) et bouton Chat coincé
  dans le coin. Remplace l’encoche de la 2.34.2. Padding uniforme
  `--gap` (12 px) sur les 4 côtés, mêmes gaps entre barre, statut,
  aperçu et pied. Pied de card : onglets + emplacement `ChatDock` où le
  bouton Chat global est rendu dans le flux (portail), 24 px libres de
  chaque côté (bordure, aperçu, onglets), à toutes les tailles ; ailleurs
  le bouton reste fixe en bas à droite. Fenêtre du chat ouverte au-dessus
  du bouton. Test e2e : 5 tailles (375 → 1920 px), padding identique,
  24 px mesurés, aucun débordement, chat ouvrable.

## 2.34.2 — 2026-10-28

- **Type** : patch (branche `v3-dashboard`)
- **Fichiers** : `app/v3/v3.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Card Preview (seule modifiée) : le bouton Chat recouvrait
  son coin bas droit et l’aperçu. Encoche circulaire réelle (masque CSS,
  6 px autour du bouton) bordée d’un liseré comme la card ; bande
  d’onglets de 62 px réservée sous l’aperçu, dont la zone défilante
  s’arrête avant l’encoche (marge, pas padding) ; espacements internes
  réguliers (8 px). Bureau seulement (≥ 1101 px, card ancrée au bas de la
  fenêtre) ; mobile et tablette inchangés. Dimensions de la card
  conservées. Test e2e : 3 tailles d’écran, aucun recouvrement de
  l’aperçu ni des onglets visibles, bouton dans le coin, mobile sans
  débordement.

## 2.34.1 — 2026-10-28

- **Type** : patch (branche `v3-dashboard`)
- **Fichiers** : `app/v3/studio/Device.tsx`, `app/v3/v3.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Aperçu « Ajuster » coupé ou défilant. Causes : décalage du
  socle MacBook (40 px) non mis à l’échelle → débordement horizontal ;
  hauteur de la scène dictée par le contenu (ligne de grille auto, et
  `flex: 1` annulant les 70vh en mise en page empilée) → échelle calculée
  sur une hauteur fausse, appareil coupé. Corrections : décalage ×
  échelle, ligne de grille `minmax(0, 1fr)`, hauteur fixe en empilé,
  centrage par marges automatiques (zoom manuel : défilement jusqu’à
  tous les bords). Échelle `min(largeur, hauteur)` inchangée, recalculée
  au redimensionnement, à l’appareil, à la rotation et aux dimensions.
  Test e2e : 4 appareils × rotation × 3 tailles de fenêtre, redimension,
  zoom 100 %.

## 2.34.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; champ facultatif `update` de
  la scène Figma, compatible)
- **Fichiers** : `app/v3/Studio.tsx`, `app/v3/studio/useFigmaSync.ts`
  (nouveau), `app/v3/studio/ExportPanel.tsx`, `app/v3/v3.css`,
  `app/shared/figmaScene.ts`, `figma-plugin/code.ts`, `figma-plugin/ui.html`,
  `figma-plugin/README.md`, `tests/e2e/studio.spec.ts`
- **Résumé** : Barre de l’aperçu : bouton carré « Actualiser Figma »
  (`refresh-cw`) qui envoie l’écran en mise à jour explicite (remplacé à
  sa place par le plugin, sans doublon ni confirmation) ; plugin fermé →
  fichier cible ouvert au clic et action restante indiquée (Figma ne
  lance aucun plugin depuis l’extérieur), import dès l’ouverture du
  plugin. États : envoi, synchronisation (icône qui tourne, `aria-busy`),
  confirmation attendue, erreur ; « Figma synchronisé » seulement après
  le compte rendu du plugin. Envoi et suivi factorisés (`useFigmaSync`),
  partagés avec l’onglet Export. Pivoter et Versions en boutons carrés
  icônes seules (`rotate-cw`, `history`) avec info-bulle et
  `aria-label` ; Enregistrer déplacé tout à droite après Versions, même
  ligne. Plugin v2.34 (à relancer dans Figma).

## 2.33.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `app/v3/studio/ExportPanel.tsx`, `app/client/App.tsx`,
  `app/v3/v3.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Export PNG/JPEG à fond noir et textes illisibles : la
  capture reprenait l’aperçu en thème sombre. Les images sont désormais
  rendues dans une copie invisible de l’aperçu, toujours en thème clair,
  sans sélection, aux mêmes dimensions (×2), fond opaque de l’écran DS ;
  l’aperçu visible et le thème de travail ne changent pas (aucun flash).
  Format PNG : case « Sans fond (transparent) », décochée par défaut,
  qui retire seulement le fond de l’écran (fonds des composants, textes
  et ombres conservés) ; masquée et réinitialisée pour les autres
  formats. Rendu attendu après chargement des polices. HTML, TSX et
  Figma inchangés. Test e2e : décodage réel des PNG opaque et
  transparent et du JPEG depuis un aperçu sombre.

## 2.32.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard`)
- **Fichiers** : `figma-plugin/manifest.json`, `figma-plugin/code.ts`,
  `figma-plugin/ui.html`, `figma-plugin/README.md`,
  `app/v3/studio/ExportPanel.tsx`, `tests/e2e/studio.spec.ts`
- **Résumé** : Export Figma sans import automatique, causes : Figma ne
  lance jamais un plugin à l’ouverture d’un fichier (limite de l’API) ;
  chaque réexport d’un écran déjà importé attendait une confirmation.
  Corrections conformes à l’API : bouton « Importer depuis DS-Studio »
  dans le panneau de droite du fichier cible (Relaunch), import immédiat
  au lancement sans code ni clic, option mémorisée « mettre à jour cet
  écran automatiquement » (seul son cadre est remplacé), version affichée
  dans le plugin ; côté DS-Studio, l’export ouvre le fichier cible au clic
  quand le plugin est fermé et indique l’action restante.

## 2.31.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; `move`, `remove` et
  `duplicate` acceptent un ou plusieurs éléments, compatibles avec
  l’existant)
- **Fichiers** : `app/client/design/useComposition.ts`, `app/v3/Studio.tsx`,
  `app/v3/studio/LayersPanel.tsx`, `app/v3/studio/PropsBar.tsx`,
  `app/v3/v3.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Calques : vraies cases de sélection multiple
  (`role="checkbox"`, `aria-checked`, Espace / Entrée, focus visible ;
  cochée en noir/blanc) à la place des carrés décoratifs ; clic sur la
  case = ajout ou retrait sans sélection simple. Clic sur le nom =
  sélection simple, ⌘/Ctrl + clic = ajout/retrait, Maj + clic = plage
  entre éléments frères ; jamais un parent avec son enfant, sans doublon ;
  Échap désélectionne. Sélection synchronisée avec l’aperçu et la barre
  d’outils : aligner, grouper, monter, descendre, dupliquer, supprimer
  (confirmation), chacun en une seule étape ⌘Z / ⇧⌘Z.

## 2.30.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; nouvelles routes
  `/api/figma/scene/meta` et `/api/figma/status` (plugin : origine null +
  code d’appairage ; DS-Studio : lecture du statut) ; fichier cible
  `app/shared/figmaTarget.ts`)
- **Fichiers** : `figma-plugin/importer.ts`, `figma-plugin/code.ts`,
  `figma-plugin/ui.html`, `figma-plugin/README.md`,
  `app/v3/studio/figmaScene.ts`, `app/v3/studio/ExportPanel.tsx`,
  `app/server/http.ts`, `app/server/figmaBridge.ts`,
  `app/shared/figmaTarget.ts` (nouveau), `app/v3/v3.css`, `package.json`,
  `tests/figmaPlugin.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** :
  - Erreur `set_layoutSizingHorizontal` corrigée : Hug/Fill/Fixed appliqués
    seulement aux enfants d’Auto Layout ou aux frames Auto Layout ;
    validation de la scène avant tout ajout, import tout ou rien (cadre
    partiel retiré), calque fautif nommé. Export réel « Test 1 » rejoué :
    38 calques construits sans erreur (24 frames, 14 textes).
  - Rendu complet : l’import s’arrêtait au premier nœud fautif (écran
    presque vide). Sérialisation complétée : blocs à un seul enfant en
    Auto Layout, cases à cocher et boutons radio vectoriels (plus de texte
    « on »), éléments de taille nulle ignorés, contrôle de fidélité (si
    l’Auto Layout déplaçait un enfant de plus de 1,5 px, positions exactes
    conservées).
  - Flux automatique vers « DS-Studio — Mes maquettes » (page 1) : code
    mémorisé dans Figma, plugin ouvert qui détecte chaque envoi et importe
    seul, confirmation avant remplacement, statuts réels dans DS-Studio,
    lien vers le fichier ; refus d’importer dans un autre fichier. Plugin
    minifié.

## 2.29.1 — 2026-10-28

- **Type** : patch (branche `v3-dashboard`)
- **Fichiers** : `figma-plugin/manifest.json`, `figma-plugin/ui.html`,
  `figma-plugin/README.md`, `app/server/http.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** : Plugin DS-Studio Bridge installable : Figma refusait
  `devAllowedDomains: http://127.0.0.1:4310` (adresses IP non admises, seul
  `localhost` est documenté) ; manifeste et interface passent à
  `http://localhost:4310`. Le serveur (toujours lié à 127.0.0.1) admet
  l’hôte `localhost` uniquement pour la lecture du plugin
  (`/api/figma/scene`, origine null, code d’appairage) ; toute autre route
  reste refusée. Plugin reconstruit (`dist/code.js` à jour).

## 2.29.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; données inchangées ; couleurs
  de repère des écrans en stockage local `ds-v3-screen-colors`)
- **Fichiers** : `app/client/design/useComposition.ts` (`deleteScreen`),
  `app/v3/Studio.tsx`, `app/v3/Notes.tsx`, `app/v3/v3.css`,
  `connectors/agents/claudeCli.ts`, `CLAUDE.md`,
  `docs/COMPONENT_GUIDELINES.md` (nouveau), `docs/CREATIVE_PROCESS.md`
  (nouveau), `tests/claudeCli.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** :
  - Chat Claude : échange réel validé via Claude Code (session claude.ai).
    Deux causes d’échec corrigées : CLI 2.1.201 trop ancien pour le modèle
    (mis à jour en 2.1.312 avec `claude update`, message dédié ajouté) et
    schéma JSON refusé par le CLI (référence `$schema` retirée).
  - Design · écrans : croix au survol ou au focus (espace réservé, sans
    décalage), touche Suppr, confirmation, écran voisin ouvert, dernier
    écran protégé, historique et repère nettoyés ; point de couleur cyclique
    (#FABC3C → #F55536) par écran, conservé après rechargement ; onglet
    actif toujours noir/blanc.
  - Design · accents : tokens `--deco-*` (palette atténuée) sur séparateurs
    de la barre d’outils, guides des calques, poignée, survol des chips,
    repère du statut, liseré des onglets ; composants de l’aperçu,
    couleurs sémantiques et états actifs inchangés.
  - Mes notes : style Post-it (papier teinté, encre, ruban si épinglée, coin
    corné, ombre) ; lecture par défaut sans bouton, actions au survol ou au
    focus superposées sans décalage ; édition au crayon (couleur, texte,
    rappel), « Valider » en bas à droite.
  - Guides : `CLAUDE.md` (règles d’économie de contexte et d’accord avant
    skills) et deux guides lus selon la tâche.

## 2.28.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; modèle de composition étendu
  de façon rétrocompatible : `background` facultatif (#RRGGBB ou
  #RRGGBBAA) sur l’écran, les sections et les blocs ; contrat `Composer`
  avec avancement facultatif ; nouvelles routes `/api/figma/scene` ;
  agent launchd facultatif)
- **Fichiers** : `app/shared/composition.ts`, `app/shared/figmaScene.ts`
  (nouveau), `app/client/api.ts`, `app/client/design/CompositionView.tsx`,
  `app/client/design/useComposition.ts`, `app/client/design/useComposeChat.ts`,
  `app/server/http.ts`, `app/server/figmaBridge.ts` (nouveau),
  `connectors/agents/claude.ts`, `connectors/agents/claudeCli.ts` (nouveau),
  `app/v3/Dashboard.tsx`, `app/v3/Studio.tsx`, `app/v3/v3.css`,
  `app/v3/studio/*` (ColorDialog, ContrastAudit, contrast, figmaScene :
  nouveaux ; ExportPanel, LayersPanel, PropsBar, StudioChat, exportReact),
  `figma-plugin/*` (nouveau), `scripts/service.mjs` (nouveau),
  `package.json`, `.claude/launch.json`, `tests/*` (contrast, claudeCli,
  figmaPlugin : nouveaux ; studio.spec)
- **Résumé** :
  - Design · Couleur : sélecteur, HEX et opacité, aperçu en direct,
    Valider / Annuler ; sans sélection le fond de l’écran (Échap
    désélectionne), sinon celui des éléments sélectionnés ; une étape
    d’annulation, pastille dans les Calques, repris dans les exports.
  - Design · Contraste : audit WCAG 2.2 AA à la demande sur le rendu réel
    (fonds imbriqués, transparence, opacité, clair/sombre) ; texte 4,5:1,
    grand texte et composants 3:1 ; contour rouge temporaire, pointillé
    orange si non calculable ; popover ratio actuel / requis, « Corriger »
    propose le fond le plus proche conforme (avant / après), appliqué
    seulement sur demande ; couleurs du DS signalées, jamais modifiées.
  - Dashboard : carte « Accès rapide » (2 × 2 : Design, Étapes du PFE, Mes
    schémas, Mes notes ; teintes de la palette, tuile entière cliquable) à
    la place de la liste des rendus, toujours suivis par les KPI et les
    Étapes du PFE.
  - Serveur autonome : `npm run service -- install | start | stop | restart
    | status | logs | uninstall` (agent launchd utilisateur, 127.0.0.1
    seulement, redémarrage après arrêt anormal, journaux dans
    ~/Library/Logs/DS-Studio, pas de doublon) ; l’aperçu de Claude Code
    s’y rattache sans lancer de second serveur.
  - Chat Claude : sans clé API, passerelle vers Claude Code installé
    (`claude -p`, session ouverte par l’utilisatrice avec `claude auth
    login`) ; réponse en direct, statuts, erreurs lisibles ; aucun outil,
    aucune clé ni cookie manipulés. Clé API inchangée si présente.
  - Figma : export « Figma » réel depuis Enregistrer + plugin DS-Studio
    Bridge (`figma-plugin/`, guide dans son README) : calques éditables,
    Auto Layout imbriqué, instances des maîtres du fichier, variables des
    tokens, remplacement confirmé sans doublon, écarts listés.

## 2.27.1 — 2026-10-28

- **Type** : patch (branche `v3-dashboard` ; règle des rendus : acquis
  seulement si l’étape liée est « Validé » ; données inchangées)
- **Fichiers** : `app/shared/steps.ts` (`renduAcquired`),
  `app/v3/Dashboard.tsx`, `tests/steps.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** : Prochain rendu = premier rendu non validé par le prof : avec
  l’étape Présentation marquée « Fait », le KPI affiche bien « Note de
  cadrage · 13/11/2026 », J-16 au 28/10/2026 (et non plus le Document de
  cadrage). J-X calculé chaque jour sur la date locale. Échéance passée :
  « en retard » si rien n’est remis, « remis, en attente de validation »
  sinon. Carte Rendus : badges « À réaliser », « Remis », « Validé » ;
  compteurs « validé(s) ».

## 2.27.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; nouveaux tokens
  `--selected`, `--selected-foreground`, `--selected-ring`)
- **Fichiers** : `app/v3/v3.css`, `app/v3/App.tsx`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : États actifs et sélectionnés centralisés (une seule règle,
  trois tokens) : fond #000, texte et icônes blancs (21:1), liseré clair
  en sombre pour les détacher des surfaces foncées, focus clavier conservé.
  Couvre navigation, onglets (studio, schémas, écrans), bascules
  (appareils, thème), chips, outils de la barre de propriétés, calques,
  frise, formats d’export. Remplace les états actifs jaunes ou en dégradé
  (onglets de Mes schémas, appareils, alignements) des versions 2.24.3 à
  2.25.1. Hors champ, inchangés : couleurs sémantiques, pastilles de
  couleur, notes validées. Étapes du PFE : l’accès par le menu ouvre
  toujours la page en haut (défilement du document remis à 0, ancre
  retirée, pas de restauration du navigateur) ; un rendu cliqué depuis le
  Dashboard fait toujours défiler jusqu’à son étape.

## 2.26.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; aucune donnée nouvelle : texte
  et couleur s’enregistrent désormais au clic sur « Valider », plus à la
  sortie du champ)
- **Fichiers** : `app/v3/Notes.tsx`, `app/v3/v3.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Mes notes : mode édition (couleurs, texte) avec « Valider »
  en bas à droite ; une fois validée, la note est enregistrée, en lecture
  seule, sur fond plein de sa teinte (palette officielle), texte et icônes
  encre #0A0A0A (≥ 6:1), et le bouton devient un crayon pour rééditer
  (nouveau « Valider » pour enregistrer). Épinglage, suppression et rappels
  inchangés et lisibles sur le fond coloré ; nouvelle note vide ouverte en
  édition.

## 2.25.1 — 2026-10-28

- **Type** : patch (branche `v3-dashboard` ; CSS seulement)
- **Fichiers** : `app/v3/v3.css`
- **Résumé** : Mes schémas : onglet de catégorie actif en jaune primaire
  #FABC3C, texte encre #0A0A0A en gras (contraste 11,6:1, clair et
  sombre) ; inactifs neutres, survol en couleur de texte principale, focus
  clavier souligné d’un contour jaune. Dimensions et navigation inchangées.

## 2.25.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; modèle de composition étendu
  de façon rétrocompatible : `alignX` / `alignY` facultatifs par bloc,
  valeurs `start`, `center`, `end`, conservés par la normalisation et le
  schéma de sortie de Claude)
- **Fichiers** : `app/shared/composition.ts`,
  `app/client/design/useComposition.ts` (`patchItems`),
  `app/client/design/CompositionView.tsx`, `app/client/styles.css`,
  `app/v3/studio/PropsBar.tsx`, `app/v3/studio/exportReact.ts`,
  `app/v3/v3.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Design : 6 outils d’alignement en tête de la barre de
  propriétés (gauche, centre horizontal, droite, haut, centre vertical,
  bas ; icônes Lucide, info-bulles, état actif sur le dégradé officiel,
  texte encre). Sélection simple ou multiple, une seule étape
  d’annulation (⌘Z / ⇧⌘Z), re-clic sur l’option active pour la retirer.
  Alignement dans le conteneur parent : pile verticale (horizontal, le
  vertical y est désactivé avec explication), rangée et grille (les deux
  axes). Repris dans l’aperçu, les exports et le TSX.

## 2.24.3 — 2026-10-28

- **Type** : patch (branche `v3-dashboard`)
- **Fichiers** : `app/v3/Studio.tsx`, `app/v3/v3.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Design : écart entre le panneau gauche et la
  prévisualisation porté à 35 px (`gap` 11,5 px de part et d’autre du
  séparateur de 12 px). Sélecteur d’appareils : noms seuls, centrés, sans
  retour à la ligne (dimensions retirées, toujours en info-bulle) ;
  appareil actif sur le dégradé officiel #FABC3C → #F55536, texte encre
  #0A0A0A en gras (contraste ≥ 6:1), inactifs discrets. Test e2e : rotation
  vérifiée par le format de l’aperçu.

## 2.24.2 — 2026-10-28

- **Type** : patch (branche `v3-dashboard` ; CSS seulement)
- **Fichiers** : `app/v3/v3.css`
- **Résumé** : Design : `gap` de 4 px sur `.studio-body`, de part et
  d’autre du séparateur (12 px) ; l’écart entre le panneau gauche et la
  prévisualisation passe de 12 à 20 px. Proportions, séparateur
  redimensionnable et affichage mobile (empilé) inchangés.

## 2.24.1 — 2026-10-28

- **Type** : patch (branche `v3-dashboard` ; CSS seulement)
- **Fichiers** : `app/v3/v3.css`
- **Résumé** : Dashboard : cartes Activité et Rendus légèrement descendues
  (écart de 20 px avec « Échéances à venir », au lieu de 12 px) ; carte
  Rendus : 22 px entre la barre de progression et la première ligne (au
  lieu de 10 px), les 5 lignes restent réparties. Toujours sans défilement
  à 1440 × 900.

## 2.24.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; règle de statut : une ancienne
  tâche cochée donne au plus « En cours », « Fait » / « Validé » se
  déclarent dans les Étapes du PFE ; date du jour en heure locale)
- **Fichiers** : `app/shared/brief.ts`, `app/shared/steps.ts`,
  `app/v3/Dashboard.tsx`, `app/v3/Brief.tsx`, `app/v3/v3.css`,
  `tests/steps.test.ts` (nouveau), `tests/e2e/studio.spec.ts`
- **Résumé** : Prochain rendu corrigé : Note de cadrage · 13/11/2026, J-16
  au 28/10/2026 (la tâche « intention » cochée ne vaut plus rendu effectué ;
  J-X calculé sur la date locale, plus d’écart d’un jour après minuit ;
  échéance dépassée affichée J+X · en retard). Carte Rendus : 5 lignes
  réparties sur la hauteur, colonnes numéro / titre / date / badge
  alignées, titres sur plusieurs lignes gérés. KPI : pied de carte aligné
  en bas. Étapes du PFE : nouveau sous-titre, toutes les étapes fermées au
  chargement (depuis le Dashboard : défilement vers l’étape, sans
  l’ouvrir), bouton « Actualiser ma progression ».

## 2.23.0 — 2026-10-28

- **Type** : minor (branche `v3-dashboard` ; nouvelle source unique
  `/api/v3/data` → `.ds-studio/v3-data.json` (statuts d’étapes, pistes,
  notes), fichier privé hors Git ; statut « À retravailler » ; libellé de
  calque `label` facultatif dans le modèle de composition, rétrocompatible ;
  `workspace/figma.config.json` ignoré par Git)
- **Fichiers** : `app/shared/steps.ts` (nouveau), `app/server/userData.ts`
  (nouveau), `app/server/http.ts`, `app/shared/composition.ts`,
  `app/client/App.tsx`, `app/client/design/CompositionView.tsx`,
  `app/client/design/useComposition.ts`, `app/v3/useUserData.ts` (nouveau),
  `app/v3/Notes.tsx` (nouveau), `app/v3/App.tsx`, `app/v3/Brief.tsx`,
  `app/v3/Dashboard.tsx`, `app/v3/Schemas.tsx`, `app/v3/Studio.tsx`,
  `app/v3/studio/*` (StudioChat, LibraryPanel, LayersPanel, PropsBar,
  Device, ExportPanel), `app/v3/v3.css`, `.gitignore`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Étapes du PFE : toutes fermées à l’arrivée, un seul statut
  par étape (À faire, En cours, À retravailler en rouge, Fait, Validé en
  vert), « Sauvegarder et masquer » si le statut change sinon « Masquer »,
  « Attendus du brief » et « Mes pistes » éditables et persistantes,
  checklist recalculée (fait ou validé) et synchronisée ; écritures
  rapides sans perte. Dashboard : les 5 rendus toujours visibles, compacts,
  sans bascule ; volcan qui remplit la carte. Mes schémas : Benchmark en
  premier, crayon avec menu (textes, éléments, couleurs), « Exporter »
  réel (fichier, raccourci de lien, PNG), « Ajouter un schéma » (type puis
  Importer ou Partir de zéro). Nouvelle page « Mes notes » : notes
  épinglées, couleurs, rappels datés (notification système ou alerte
  intégrée, tant que DS-Studio est ouvert), annulation, suppression.
  Design : panneau Claude réduit (fil, proposition, saisie « Décrivez… »,
  « Cibler » au-dessus de la bulle, alerte discrète « Clé API non
  connectée ») ; bibliothèque en état vide sans filtre, chips principales
  à tags retirables, composants de niche par la recherche ; calques
  hiérarchisés avec guides et renommage au crayon ; nom d’écran demandé
  dans la modale d’export ; dimensions sous chaque appareil, « Pivoter »,
  ⌘Z / ⇧⌘Z sans boutons, Versions (10 dernières modifications,
  restauration), onglets d’écrans en bas et « Nouvel écran », Grouper /
  Dégrouper une sélection multiple (Maj ou ⌘ + clic).

## 2.22.0 — 2026-10-27

- **Type** : minor (branche `v3-dashboard` ; liste partagée des 5 rendus
  officiels dans `app/shared/brief.ts` ; CSP : `blob:` pour les aperçus
  d’images et de PDF importés ; données existantes conservées, anciens
  liens FigJam repris)
- **Fichiers** : `app/shared/brief.ts`, `app/server/http.ts`,
  `app/client/App.tsx`, `app/client/design/CompositionView.tsx`,
  `app/client/theme.ts`, `app/client/ui.tsx`, `app/client/ChatBubble.tsx`,
  `app/client/design/MantineBlocks.tsx`, `app/client/styles.css`,
  `app/v3/*` (App, Dashboard, Timeline, Brief, Studio, Schemas,
  SchemaExamples, fileStore, ui, v3.css), `app/v3/studio/LibraryPanel.tsx`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : en-têtes à 10 px puis 20 px ; bascule de thème soleil/lune ;
  palette officielle des accents (#FABC3C → #F55536, 9 nuances, dégradé)
  centralisée dans les tokens v3 et le thème Mantine, sans bleu ni violet.
  Dashboard : « Rendus restants » sur les 5 rendus officiels (statuts réels),
  « Prochain rendu » (nom et date du planning), frise jaune → rouge selon la
  proximité, volcan sans légende avec nouveau sous-titre, carte Rendus
  dépliable dont chaque rendu ouvre son étape (ancre stable, même après
  rechargement). Design : barre d’outils dans la carte d’aperçu, nom
  d’écran en champ discret, onglets Claude / Bibliothèque / Calques à
  icônes, Versions dans la barre, bibliothèque à chips (union stricte) et
  galerie de vrais composants glissables. Étapes du PFE (ex-Fiche PFE) :
  liens « Accéder au brief » / « Accéder à mon fichier de rédaction », badges
  À faire / En cours / Fait / Validé par le prof, résumés détaillés, détail
  ordonné (exigences officielles du brief, propositions à valider,
  échéancier, suivi, synthèse). Mes schémas : aperçus « Exemple fictif »,
  nom du fichier, import par lien (Figma/FigJam intégrés, autres services
  en fiche) ou fichier local (images, PDF ; type et taille vérifiés,
  stockage local), remplacement et retrait.

## 2.21.0 — 2026-10-27

- **Type** : minor (branche `v3-dashboard` ; `/` sert désormais l’interface v3,
  l’interface précédente reste sur `/index.html` ; modèle de composition
  étendu de façon rétrocompatible : conteneurs imbriqués `group`, `justify`,
  `padding`, `margin` ; statut de tâche « En cours » ; CSP `frame-src`
  limitée à `https://embed.figma.com` ; dépendance `html-to-image` 1.11.13)
- **Fichiers** : `app/server/http.ts`, `app/shared/composition.ts`,
  `app/shared/tasks.ts`, `connectors/agents/fakeComposer.ts`,
  `app/client/App.tsx` (aperçu : dépôts, export, thème),
  `app/client/design/CompositionView.tsx`, `app/client/design/useComposition.ts`,
  `app/client/design/Simulator.tsx`, `app/client/ui.tsx`, `app/client/styles.css`,
  `app/v3/*` (App, Studio, Brief, Schemas, Dashboard, v3.css),
  `app/v3/studio/*` (Device, PropsBar, ExportPanel, LayersPanel, LibraryPanel,
  StudioChat, exportReact), `package.json`, `tests/composition.test.ts`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : navigation : 🌋, Dashboard au lancement, ordre Dashboard →
  Design → Fiche PFE → Mes schémas, « Version actuelle » retiré. Mon espace
  Design : panneau gauche à onglets (Claude, Bibliothèque, Calques, Versions,
  Export), aperçu 70 % redimensionnable, appareils Mobile (iPhone 15 Pro
  393 × 852), iPad (Air 11" 820 × 1180), MacBook (Pro 14" 1512 × 982) et
  Screen libre, zones système iOS réservées, rotation, zoom ; écran initial
  vide ; glisser-déposer directement dans l’écran et dans les calques, avec
  conteneurs imbriqués ; Auto Layout (direction, alignement, justification,
  gap, padding, margin, colonnes) via une barre de propriétés fine ;
  enregistrement automatique dans le projet ; « Enregistrer » et l’onglet
  Export partagent un export réel (PNG, JPEG, HTML/CSS, React/TSX ; Figma
  indiqué indisponible). Fiche PFE : liens Notion uniformes, checklist
  résumée et vue détaillée, statuts « En cours » ajoutés, badges en lecture
  seule et édition dans le détail (tâches liées, échéances du brief),
  « Voir le détail » renforcé, frise remplie jusqu’en bas. Mes schémas :
  7 onglets, tableaux FigJam par onglet (intégration officielle
  embed.figma.com, lecture seule), liens persistants, « Ouvrir dans FigJam ».
  Espacement titre / sous-titre / premier bloc +15 px.

## 2.20.0 — 2026-10-27

- **Type** : minor (branche `v3-dashboard` ; dépendance `lucide-react` 1.55.0 ;
  champ facultatif `scheme` dans les messages d’aperçu ; aucune API ni donnée
  serveur modifiée ; version actuelle `/` inchangée)
- **Fichiers** : `app/v3/Studio.tsx`, `app/v3/studio/*` (StudioChat,
  LibraryPanel, LayersPanel, Device, exportReact), `app/v3/Bubble.tsx`,
  `app/v3/App.tsx`, `app/v3/Brief.tsx`, `app/v3/Dashboard.tsx`,
  `app/v3/Timeline.tsx`, `app/v3/v3.css`,
  `app/client/design/useComposeChat.ts` (logique extraite),
  `app/client/design/ComposeChat.tsx`, `app/client/design/useComposition.ts`
  (`restore`), `app/client/App.tsx` (aperçu clair/sombre),
  `app/client/styles.css`, `package.json`, `tests/e2e/studio.spec.ts`
- **Résumé** : studio Design v3 : chat Claude (35 %, séparateur
  redimensionnable, modèle, contexte écran + sélection ciblée) et
  glisser-déposer sur un état unique (`useComposition`, partagé avec
  l’atelier actuel) ; bibliothèque des composants réels (recherche,
  catégories, aperçu réel des variantes, manquants signalés) ; calques
  (glisser, réordonner, changer de section, dupliquer, supprimer) et
  propriétés contextuelles ; simulateur iPhone, Android, iPad, MacBook ou
  libre (dimensions, poignée, rotation, zoom, points de rupture, plein écran,
  clair/sombre, sélection ou interaction) ; proposition → aperçu → validation,
  annuler/rétablir, écrans multiples, versions locales restaurables, export
  React/TS. Fiche PFE : liens « Brief du professeur » et « Mon Notion »,
  checklist en premier, 10 étapes numérotées avec emoji, résumé, détail et
  statut manuel persistant, frise verticale remplie au défilement.
  Navigation : pictos Lucide, « Contexte & Assistant » retiré du menu, bulle
  Claude globale (même historique). Dashboard : KPI sous le titre puis frise
  Passé / À venir (date ≠ validation), espacements ≥ 10 px.

## 2.19.0 — 2026-10-27

- **Type** : minor (branche `v3-dashboard` ; nouvelle page `/v3?vue=brief` ;
  aucune API ni donnée modifiée ; version actuelle `/` inchangée)
- **Fichiers** : `app/v3/App.tsx`, `app/v3/Dashboard.tsx`,
  `app/v3/Brief.tsx`, `app/v3/Timeline.tsx`, `app/v3/v3.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : Dashboard v3 resserré. Titre « Récapitulatif des échéances
  PFE » et sous-titre (dates, jour sur la période) ; frise « Échéances à
  venir » juste dessous (un second clic sur un jalon revient à aujourd’hui) ;
  bascule Clair/Sombre persistante en haut à droite ; volcan réduit et
  toujours animé (image fixe si `prefers-reduced-motion`) ; tailles et
  espacements compactés (1440 × 900 sans défilement) ; bouton « Liste » sur
  « Tâches réalisées » ouvrant la liste réelle des tâches (Échap ou clic
  extérieur pour fermer). Nouvelle page Brief : fiche PFE en sections
  (présentation, problématique, objectifs, publics, solution, points forts
  UX, périmètre et contraintes, méthode et tests, livrables, échéances,
  checklist), résumé visible et « Voir le détail », depuis la synthèse
  Notion locale (lecture seule) ; checklist et statuts modifiables conservés.

## 2.18.0 — 2026-10-27

- **Type** : minor (nouvelle interface parallèle `/v3` sur la branche
  `v3-dashboard` ; la version actuelle `/` reste inchangée ; aucune API ni
  donnée modifiée)
- **Fichiers** : `v3.html`, `app/v3/tokens.css`, `app/v3/v3.css`,
  `app/v3/ui.tsx`, `app/v3/App.tsx`, `app/v3/Dashboard.tsx`,
  `app/v3/main.tsx`, `app/client/VolcanoGL.tsx` (option `still`),
  `app/server/http.ts` (route `/v3`, type `woff2`), `vite.config.ts`
  (deux entrées), `tests/e2e/studio.spec.ts`
- **Résumé** : itération v3, étape 1 : page Dashboard seule, reconstruite
  de zéro sur le DS fourni (tokens shadcn/create `:root` et `.dark`, repris
  tels quels en oklch). Composants selon l’anatomie du DS (Card, Button,
  Badge, Progress, ToggleGroup). Indicateurs (tâches, échéance, période,
  jalons et retards), activité du volcan selon les dates avec paliers,
  rendu animé ou léger (image fixe), tâches par statut, frise des jalons
  cliquable pour prévisualiser une date (verticale sur mobile). Navigation
  repliable, autres pages annoncées et désactivées, thème sombre ou clair
  mémorisé, lien vers la version actuelle.

## 2.17.0 — 2026-10-27

- **Type** : minor (refonte visuelle du chrome ; aucune API, donnée ni token
  Lisière modifié)
- **Fichiers** : `app/client/theme.ts`, `app/client/main.tsx`,
  `app/client/styles.css`, `app/client/ui.tsx`, `app/client/HomePage.tsx`,
  `app/client/ChatBubble.tsx`, `app/client/design/MantineBlocks.tsx`,
  `tests/theme.test.ts`, `docs/FIGMA_KIT.md`
- **Résumé** : nouvelle identité DS-Studio = thème ui.shadcn.com/create
  collé, appliqué en entier. Interface en mode sombre (bloc `.dark`, oklch
  converti : fond `#0A0A0A`, cartes `#171717`, tuiles `#262626`, texte
  `#FAFAFA` / `#A1A1A1`, bordures blanches à 10 %, boutons principaux clairs
  `#E5E5E5`, destructive `#FF6467`, bleu `--chart-*` en accent et pour les
  bulles envoyées). L’aperçu des pages du DS garde le bloc clair `:root`.
  Palette Sunflower → Mahogany retirée du chrome (le volcan garde ses
  couleurs). Variantes du kit résolues par variables CSS (valables dans les
  deux modes), couleurs codées en dur remplacées par les variables du thème,
  icônes du menu inversées. Contrastes ≥ 4,5:1 vérifiés par test sur la page,
  les cartes et les tuiles.

## 2.16.1 — 2026-10-27

- **Type** : patch (valeurs de thème ; aucune API ni donnée modifiée)
- **Fichiers** : `app/client/theme.ts`, `app/client/styles.css`,
  `tests/theme.test.ts`, `docs/FIGMA_KIT.md`
- **Résumé** : thème shadcn/create collé (onglet Theme → Copy Theme)
  appliqué au thème Mantine. Ses neutres étaient déjà en place ; le rayon de
  base passe de 10 à 14 px (`--radius: 0.875rem`) et tous les paliers en
  dérivent depuis une seule valeur (`radiusBase`, `radii`) : champs et
  boutons 14, cartes 18, menu 12, bulles 26. Bordure de focus gardée à
  `#737373` (le `#A1A1A1` du thème n’atteint que 2,6:1). Mode sombre et
  couleurs `--chart-*` non repris (interface claire, aucun graphique).

## 2.16.0 — 2026-10-27

- **Type** : minor (dépendance `@fontsource-variable/inter` 5.3.0 ; blocs de
  composition « Kit shadcn · Mantine » renommés avec les variantes du kit,
  deux nouveaux blocs `mCard` et `mBubble` ; les anciennes variantes `m…`
  d’un brouillon sont ramenées à la variante par défaut ; tokens Lisière et
  données inchangés)
- **Fichiers** : `package.json`, `package-lock.json`, `app/client/theme.ts`,
  `app/client/main.tsx`, `app/client/styles.css`,
  `app/client/design/MantineBlocks.tsx`, `app/client/design/ComposeWorkspace.tsx`,
  `app/shared/composition.ts`, `tests/theme.test.ts`, `docs/FIGMA_KIT.md`
- **Résumé** : kit Figma shadcn/ui (sitsiilia) adopté comme référence UI,
  lu en lecture seule via le MCP Figma et les données du skill
  `figma-shadcn-by-sitsiilia` (non installé : à lancer soi-même, voir
  `docs/FIGMA_KIT.md`). Rendu avec Mantine, sans Tailwind ni doublon : Inter
  en local, rayons 4 → 14 (défaut 10), ombres noires à 10 %, focus en halo
  de 3 px, neutres du kit ; la palette du studio garde les rôles de couleur.
  Variantes du kit dans le thème : Button (default, outline, secondary,
  ghost, destructive en teinte douce, link ; 24/28/32/36 px), Badge (h 22,
  pastille, ghost), Tabs en rail, champs h 32, cartes bordées, menu latéral
  h 32 à fond neutre, bulles de chat rayon 22. Bibliothèque Design : Bouton,
  Badge, Alerte, Progression, Champ (Input, Native Select, Textarea), Onglets,
  Carte et Bulle de chat du kit, utilisables par Claude et prévisualisés.
  Correctif : identifiants des blocs `m…` en minuscules (l’aperçu refusait
  la composition).

## 2.15.0 — 2026-10-27

- **Type** : minor (dépendances `@mantine/core` et `@mantine/hooks` 9.6.3 ;
  champ facultatif `page` sur `/api/assistant` ; six nouveaux blocs de
  composition ; tokens Lisière, historique et données existantes inchangés)
- **Fichiers** : `package.json`, `package-lock.json`, `vite.config.ts`,
  `app/client/theme.ts`, `app/client/ui.tsx`, `app/client/main.tsx`,
  `app/client/Card.tsx`, `app/client/Sidebar.tsx`, `app/client/App.tsx`,
  `app/client/HomePage.tsx`, `app/client/ProjectBrief.tsx`,
  `app/client/ProjectContent.tsx`, `app/client/VolcanoDashboard.tsx`,
  `app/client/Volcano.tsx`, `app/client/VolcanoGL.tsx`,
  `app/client/AssistantPage.tsx`, `app/client/ChatConversation.tsx`,
  `app/client/ChatBubble.tsx`, `app/client/useAssistantChat.tsx`,
  `app/client/design/*` (ComposeWorkspace, ComposeChat, CompositionView,
  MantineBlocks, Simulator, TokenEditor), `app/client/styles.css`,
  `app/shared/composition.ts`, `app/server/http.ts`, `tests/theme.test.ts`,
  `tests/assistant.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** : Mantine UI intégré avec un thème unique (`theme.ts`) : palette
  Sunflower Gold → Rich Mahogany déclinée en échelles de 10 teintes, rôles
  primary (Pure Red assombri, 5,5:1), accent (Atomic Tangerine), warning
  (Sunflower Gold), danger (Tomato), surfaces chaudes ; contrastes WCAG
  vérifiés par test. Variables `--ui-*` générées par le thème (plus de
  doublons dans le CSS). Migration ciblée : cartes (Card), boutons
  principaux (Button), barre latérale (NavLink, désormais rétractable et
  mémorisée), onglets Bibliothèque/Structure (Tabs), progression (Progress),
  statuts (Badge), rendu Volcan (SegmentedControl). Composants Mantine
  personnalisés exposés dans la bibliothèque Design (Bouton, Badge, Alerte,
  Progression, Champ, Onglets). Volcan réaliste en WebGL (shader écrit pour
  le projet, sans dépendance) : relief éclairé, lave qui s’écoule, fumée,
  braises et fontaine selon les dates du projet ; 30 i/s max, résolution
  réduite, pause hors écran ; image fixe si `prefers-reduced-motion` ; version
  légère SVG au choix ou si WebGL manque. Bulle Claude flottante sur toutes
  les pages : panneau compact non modal, même historique que la page
  Assistant, page affichée transmise à Claude (non enregistrée), déplaçable
  à la souris, au doigt et aux flèches, position mémorisée et bornée à
  l’écran, fermeture par Échap ou ✕. Clé API toujours côté serveur.

## 2.14.0 — 2026-10-27

- **Type** : minor (nouvelles routes locales `/api/compositions`,
  `/api/compositions/delete`, `/api/compose` ; nouveau fichier privé
  `.ds-studio/compositions.json` ; tokens et données existantes inchangés)
- **Fichiers** : `app/shared/composition.ts`, `app/server/compositions.ts`,
  `app/server/http.ts`, `app/server/index.ts`, `connectors/agents/claude.ts`,
  `connectors/agents/fakeComposer.ts`, `app/client/design/ComposeWorkspace.tsx`,
  `app/client/design/Library.tsx`, `app/client/design/Structure.tsx`,
  `app/client/design/ComposeChat.tsx`, `app/client/design/CompositionView.tsx`,
  `app/client/design/useComposition.ts`, `app/client/design/Simulator.tsx`,
  `app/client/App.tsx`, `app/client/styles.css`, `scripts/e2e-server.mjs`,
  `tests/composition.test.ts`, `tests/e2e/studio.spec.ts`, `README.md`,
  `docs/SECURITY.md`
- **Résumé** : page Design repensée en atelier de composition (onglet par
  défaut), l’éditeur de tokens restant dans l’onglet « Tokens du DS ».
  Bibliothèque des composants existants (Lisière et Studio) par catégorie,
  avec recherche, aperçu et variantes. Sections Flex/Grid responsives (pile,
  rangée, grille 1 à 4 colonnes, espacements `space.*`, repli sur une colonne
  sous 560 px). Structure réorganisable (boutons, glisser-déposer), sélection
  dans l’aperçu et inspecteur (variante, taille, texte, colonnes, lignes,
  largeur, position). Chat Claude en sortie structurée : proposition
  prévisualisée, à appliquer ou refuser ; question seulement si une information
  essentielle manque. Annuler / rétablir, brouillon conservé, pages enregistrées
  séparément des tokens.

## 2.13.0 — 2026-10-27

- **Type** : minor (nouvelle route locale `/api/assistant/model`, champ
  facultatif `model` dans `.ds-studio/assistant.json`, historique conservé)
- **Fichiers** : `connectors/agents/claude.ts`, `app/server/assistant.ts`,
  `app/server/http.ts`, `app/client/AssistantPage.tsx`, `app/client/Card.tsx`,
  `app/client/styles.css`, `tests/assistant.test.ts`,
  `tests/e2e/studio.spec.ts`, `docs/SECURITY.md`
- **Résumé** : Contexte & Assistant : conversation sur toute la hauteur
  (`100dvh` moins l’en-tête), historique défilant seul, saisie et Envoyer
  toujours visibles. Sélecteur de modèle (Claude Opus 5.5, Sonnet 5.5,
  Haiku 5.5) mémorisé côté serveur et utilisé pour chaque requête ; repli
  serveur seulement pour les modèles qui l’acceptent. Colonne droite en
  sections repliables (`CollapsibleCard`) ; chat prioritaire sur mobile.

## 2.12.0 — 2026-10-27

- **Type** : minor (page Design refaite ; API, schéma de tokens et données
  inchangés)
- **Fichiers** : `app/client/design/useDesignDraft.ts`,
  `app/client/design/TokenEditor.tsx`, `app/client/design/Simulator.tsx`,
  `app/client/design/componentSpecs.ts`, `app/client/DesignSystem.tsx`,
  `app/client/App.tsx`, `app/client/AssistantPage.tsx`, `app/client/Sidebar.tsx`,
  `app/client/HomePage.tsx`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`,
  `README.md` ; supprimé : `app/client/useTokenDraft.ts`
- **Résumé** : l’atelier devient la page « Design » (`?vue=design`, ancienne
  adresse conservée). Éditeur à gauche (40 %) : tokens par catégorie avec
  contrôles visuels, recherche, brouillon multi-tokens persistant dans l’onglet,
  annuler / rétablir / réinitialiser, Enregistrer → diff → validation.
  Inspecteur de composants (bouton, champ, badge, carte, navigation : variantes,
  tailles, textes, états par défaut / survol / focus / erreur / désactivé),
  configuration mémorisée. Simulateur à droite (60 %) : vrais composants React
  dans une iframe alimentée par le brouillon, iPhone / iPad / desktop /
  personnalisé, poignées de redimensionnement (souris et clavier), zoom,
  dimensions et points de rupture, bascule brouillon / enregistré. Le panneau
  Assistant (Codex, brief privé) passe sur la page Contexte & Assistant.

## 2.11.0 — 2026-10-27

- **Type** : minor (nouvelle page par défaut ; l’atelier reste accessible via
  `?vue=atelier`)
- **Fichiers** : `app/client/HomePage.tsx`, `app/client/App.tsx`,
  `app/client/Sidebar.tsx`, `app/client/VolcanoDashboard.tsx`,
  `app/shared/brief.ts`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`,
  `README.md`
- **Résumé** : Accueil « Tableau de bord » ouvert par défaut. Chaque indicateur
  n’apparaît qu’une fois : avancement (avec jalons repliables), prochaine
  échéance avec tâches à faire avant, temps restant avec alertes de retard.
  CTA « Ouvrir le brief du prof » et « Accéder à mon Notion » (liens existants,
  nouvel onglet, lecture seule). Cartes de navigation cliquables vers Atelier,
  Brief, Assistant et Volcan. Pages adressables par `?vue=` et conservées au
  rechargement. Dashboard Volcan conservé.

## 2.10.0 — 2026-10-27

- **Type** : minor (interface, données inchangées)
- **Fichiers** : `app/client/Card.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/styles.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Brief : écart entre cartes +10 % (13,2 px, partagé), grand titre
  « Brief du projet » à la place de la phrase d’en-tête, sources Notion en pied
  de page. Planning : légende à gauche et « Détail des échéances » à droite sur
  une ligne (`Expandable`, flex `space-between`), retour à la ligne sur mobile.
  Cartes sans bande colorée.

## 2.9.0 — 2026-10-27

- **Type** : minor (mise en page, données inchangées)
- **Fichiers** : `app/client/Masonry.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/VolcanoDashboard.tsx`, `app/client/AssistantPage.tsx`,
  `app/client/styles.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : grille Bento « masonry » commune à toutes les pages (12 colonnes,
  classes de taille `size-s/q/m/l/half/full`). Chaque carte prend la hauteur de
  son contenu ; ouvrir un détail n’étire plus les voisines et la grille se
  recompacte seule. Test e2e avec plusieurs détails ouverts simultanément.

## 2.8.0 — 2026-10-27

- **Type** : minor (interface, données et API inchangées)
- **Fichiers** : `app/client/Card.tsx`, `app/client/Volcano.tsx`,
  `app/client/VolcanoDashboard.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/AssistantPage.tsx`, `app/client/styles.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : composant `Card` unique (marges, rayon, ombre, titres, emoji à
  taille de titre) pour Brief, Volcan et Assistant ; agrandissement ×5 des emojis
  retiré ; CSS des pages secondaires regroupée. Dashboard Volcan : volcan sur
  toute la colonne gauche, cartes à droite, « Avancement du projet » calculé
  depuis les tâches, intensité toujours liée aux dates. Volcan plus réaliste et
  léger : relief texturé statique, lave incandescente qui coule, fumée, cendres,
  braises, fontaine progressive, sans recadrage quel que soit le format.
  Vérifié sans débordement en 1440, 1024, 768 et 375 px.

## 2.7.0 — 2026-10-27

- **Type** : minor (nouvelle page et API locale `/api/assistant`, dépendance
  `@anthropic-ai/sdk` 0.133.0 épinglée)
- **Fichiers** : `connectors/agents/claude.ts`, `app/server/assistant.ts`,
  `app/server/http.ts`, `app/client/AssistantPage.tsx`, `app/client/Markdown.tsx`,
  `app/client/api.ts`, `app/client/Sidebar.tsx`, `app/client/App.tsx`,
  `app/client/VolcanoDashboard.tsx`, `app/client/styles.css`,
  `tests/assistant.test.ts`, `tests/e2e/studio.spec.ts`, `.env.example`,
  `README.md`, `CLAUDE.md`, `docs/SECURITY.md`, `package.json`,
  `package-lock.json`
- **Résumé** : onglet « Contexte & Assistant » avec chat Claude (claude-opus-5-5)
  via le serveur : streaming, Markdown sûr, saisie multiligne, historique
  persistant dans `.ds-studio/assistant.json`, sources citées, limites et
  erreurs gérées. Lecture seule du brief, planning, tâches, documents et tokens ;
  aucun outil d’écriture. Clé lue côté serveur uniquement. Testé avec un
  assistant simulé, pas contre l’API réelle.

## 2.6.0 — 2026-10-27

- **Type** : minor (nouvelle page, aucune page existante modifiée)
- **Fichiers** : `app/client/VolcanoDashboard.tsx`, `app/client/Sidebar.tsx`,
  `app/client/App.tsx`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : page secondaire « Dashboard Volcan » dans le menu. Volcan SVG
  animé dont l’activité suit la période réelle du PFE (25 sept. → 12 mars),
  éruption à l’échéance finale ; frise proportionnelle aux dates, cliquable pour
  prévisualiser l’activité, colorée par statut réel. Bento : accès aux pages,
  période, prochaine échéance, tâches, indicateurs. Animations coupées si
  « réduire les animations » est actif.

## 2.5.0 — 2026-10-27

- **Type** : minor (interface, données inchangées)
- **Fichiers** : `app/shared/brief.ts`, `app/client/useTasks.ts`,
  `app/client/ProjectContent.tsx`, `app/client/styles.css`,
  `tests/tasks.test.ts`
- **Résumé** : textes du chrome +2 px (composants du DS inchangés, pilotés par
  les tokens). Brief : grille Bento 6/4/2/1 colonnes sur toute la largeur et la
  hauteur, emojis en bannière (≈ ×5, adaptés à la hauteur d’écran), frise sans
  coupure (verticale sur mobile) colorée selon les statuts réels des tâches :
  validé, terminé, en cours, en retard, à venir. Données du brief centralisées
  dans `app/shared/brief.ts`.

## 2.4.0 — 2026-10-27

- **Type** : minor (nouvelle API locale `/api/tasks`, données existantes intactes)
- **Fichiers** : `app/client/Logo.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/Sidebar.tsx`, `app/client/App.tsx`, `app/client/styles.css`,
  `app/shared/tasks.ts`, `app/server/tasks.ts`, `app/server/http.ts`,
  `launcher/index.html`, `launcher/launcher.css`, `launcher/INSTALLATION.html`,
  `tests/tasks.test.ts`, `tests/e2e/studio.spec.ts`, `package.json`,
  `package-lock.json`
- **Résumé** : logo 🌋 centralisé (`Logo`) et palette du chrome étendue au
  lanceur et au guide. Brief devenu une page Bento tenant sur un écran :
  frise des échéances, cartes à emoji repliées par défaut, checklist de 9 tâches
  avec statuts « À faire / Fait / Validé par le prof » sauvegardés dans
  `.ds-studio/tasks.json`. Contenu tiré de la note d’intention Notion, lue sans
  modification.

## 2.3.0 — 2026-10-27

- **Type** : minor (nouvel onglet, aucune donnée ni API modifiée)
- **Fichiers** : `app/client/ProjectContent.tsx`, `app/client/Sidebar.tsx`,
  `app/client/App.tsx`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`,
  `package.json`, `package-lock.json`
- **Résumé** : onglet « Brief du projet » dans le menu de gauche : synthèse du
  brief PFE Notion (sujet, objectif, planning, cadrage, Design System, tests
  utilisateurs), consulté sans modification, avec lien vers la source.

## 2.2.0 — 2026-10-27

- **Type** : minor (interface, aucune donnée ni API modifiée)
- **Fichiers** : `app/client/Sidebar.tsx`, `app/client/icons/*.svg`,
  `app/client/App.tsx`, `app/client/styles.css`, `package.json`,
  `package-lock.json`
- **Résumé** : l’atelier devient un dashboard avec menu vertical à gauche
  (sections, historique, statut local et Figma). Couleurs, rayons, ombres et
  icônes du chrome repris du DS Figma de référence, lu sans modification. Les
  tokens éditables du DS restent indépendants du chrome.

## 2.1.0 — 2026-10-27

- **Type** : minor (fonctionnalité compatible, schéma de tokens inchangé)
- **Fichiers** : `connectors/figma/sync.ts`, `scripts/figma-sync.ts`,
  `tests/figma.test.ts`, `.agents/skills/figma-sync/SKILL.md`,
  `workspace/figma.config.example.json`, `docs/FIGMA.md`, `docs/TOKENS.md`,
  `README.md`, `AGENTS.md`, `package.json`, `package-lock.json`
- **Résumé** : synchronisation Figma via le MCP officiel de l’agent externe :
  comparaison tokens/composants sur cible autorisée, import par le diff local,
  plan d’écriture haché vérifié avant/après, skill `figma-sync`. Testé sur
  fixtures ; aucun fichier Figma réel testé.

## 2.0.0 — 2026-10-27

- **Type** : version de départ
- **Commit** : `12aeaef`
- **Fichiers** : import complet du starter DS-Studio V2 (89 fichiers)
- **Résumé** : point de départ du dépôt privé `audrey-creator23/ds-studio`, sans
  modification du starter.

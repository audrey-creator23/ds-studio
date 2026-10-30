# PROJECT_HANDOFF — DS-Studio et application PFE « Risques Martinique »

Document de transmission pour reprendre le projet dans une nouvelle session
d’IA (Claude Code, OpenCode, Codex…) sans repartir de zéro.
Rédigé le **29/10/2026**, mis à jour le **30/10/2026**. Il correspond à la **version 2.48.0**, sur la
branche `v3-dashboard`. Il doit être **mis à jour à chaque tâche**.

## 0. Lire d’abord — niveau de confiance des informations

Chaque information de ce document a l’un de ces quatre statuts :

- **[VÉRIFIÉ]** : constaté dans le dépôt, l’historique Git, les tests exécutés
  ou le rendu observé pendant la session de rédaction.
- **[DEMANDE]** : exigence formulée par l’utilisatrice, réalisée ou non.
- **[HYPOTHÈSE]** : déduction raisonnable, non prouvée.
- **[INCONNU]** : information non accessible.

**Historique des échanges incomplet** :

- Cette rédaction s’appuie sur trois sources :
  - le dépôt (code, `VERSION_HISTORY.md`, docs, 29 commits Git) ;
  - le résumé de la session précédente de Claude Code ;
  - les échanges de la session en cours (versions 2.44.0 → 2.46.0).
- Les conversations ayant produit les versions 2.0.0 à 2.43.0 ne sont pas
  disponibles en entier : leur contenu est reconstitué depuis
  `VERSION_HISTORY.md` et les commits.
- Des sessions Codex ont existé (dossier « DS-Studio-codex-v2 », adaptateur
  Codex). Leur contenu est **[INCONNU]**.
- **À la reprise, demander à l’utilisatrice de joindre les conversations
  manquantes** si une décision ancienne doit être justifiée.

---

## 1. Identité du projet

### 1.1 DS-Studio

- **[VÉRIFIÉ]** DS-Studio est à l’origine un *starter pédagogique* local
  (V2, 19 projets d’étudiants). Il sert à explorer et faire évoluer un
  Design System : propositions de tokens, diff avant validation, écriture
  atomique, annulation sélective, pont Figma.
  - Voir `README.md`, `START_HERE.md`, `AGENTS.md`, `docs/`.
- **[VÉRIFIÉ]** L’utilisatrice, Audrey Noiran (dépôt privé GitHub
  `audrey-creator23/ds-studio`), l’a transformé en **studio personnel de
  projet de fin d’études (PFE)**, l’« itération v3 », qui comprend :
  - un Dashboard de suivi des échéances ;
  - un studio Design (composition d’écrans, export, pont Figma) ;
  - les Étapes du PFE, des schémas et des notes ;
  - une **Carte interactive 3D des risques naturels en Martinique** ;
  - une page **Prévention & ressources** qui héberge le **prototype de
    l’application mobile du PFE** (`pfe-mobile/`).
- **[VÉRIFIÉ]** Sujet du PFE : application de prévention et d’urgence face
  aux risques naturels en Martinique. Sept risques sont couverts :
  - séisme, volcanisme (montagne Pelée), tsunami, cyclone ;
  - fortes pluies, sargasses, brume de sable.
- **[VÉRIFIÉ]** Jalons du PFE (`app/shared/brief.ts`) :
  - Lancement : 25/09/2026 ;
  - Note de cadrage : 13/11/2026 ;
  - Accessibilité & RGPD : 11/12/2026 ;
  - Début du DS : 08/01/2027 ;
  - Document de cadrage : 29/01/2027 ;
  - Fin du DS : 12/03/2027.

  Les rendus officiels sont la note de cadrage, le document de cadrage, le
  Design System, puis les maquettes et le prototype interactif.
- **Utilisateurs** :
  - **[VÉRIFIÉ]** DS-Studio a une seule utilisatrice, l’étudiante elle-même,
    sur sa machine (serveur local `127.0.0.1:4310`).
  - **[DEMANDE]** L’app PFE vise des habitants de Martinique, y compris en
    situation d’urgence : stress, une main libre, réseau dégradé.
- **Enjeux UX** **[DEMANDE]** :
  - urgence d’abord : l’appel aux secours est toujours visible ;
  - données officielles jamais falsifiées ni inventées ;
  - accessibilité WCAG 2.2 AA ;
  - Light/Dark, responsive, `prefers-reduced-motion` ;
  - rendu « premium » ;
  - code minimal (« CAVEMAX » : tokens et code minimaux, zéro régression).

### 1.2 Principes non négociables (répétés par l’utilisatrice)

**[DEMANDE]**, toujours en vigueur :

- **Git**
  - Ne jamais écraser l’historique.
  - Ne jamais **commiter ni pousser sans accord explicite** de
    l’utilisatrice, demandé à chaque fois.
  - Préserver le code et les données existants ; vérifier avant commit.
- **Notion** : interdiction absolue d’y modifier, supprimer ou ajouter quoi
  que ce soit (lecture seule).
- **Figma** : ne jamais modifier le fichier Figma source sans autorisation.
- **Secrets**
  - Clés (Anthropic, Météo-France…) côté serveur uniquement (`.env`),
    jamais côté client, jamais dans le dépôt ni dans ce fichier.
- **Données officielles et alertes**
  - Ne jamais inventer de vigilance, de « temps réel » ou d’alerte.
  - Pas de scraping non autorisé, pas de contournement (clé API, CAPTCHA,
    restrictions, simulation de navigateur, changement de User-Agent).
  - Ne jamais simuler un envoi, un suivi, une évacuation, ni un succès.
- **Skills et plugins** (`.agents/skills/*`, plugins Figma) : annoncer leur
  utilité et leur coût approximatif en tokens, puis attendre l’accord avant
  installation, chargement ou utilisation (`CLAUDE.md`).
- **Après chaque modification validée** :
  - ajouter une entrée dans `VERSION_HISTORY.md` (SemVer) ;
  - lancer `npm version X.Y.Z --no-git-tag-version` ;
  - lancer `npm run check`, `npm test`, `npm run build`,
    `npx playwright test` et `npm run scan` ;
  - redémarrer le service : `npm run --silent service -- restart` ;
  - faire un commit distinct (sur accord) terminé par
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Volcan** : il reste une métaphore créative de l’avancement du PFE,
  jamais l’activité réelle de la Pelée ni une prévision.
- **Style de travail** : réponses courtes en français, économie de tokens
  (« CAVEMAX »), pas de refonte inutile, réutilisation des moteurs, assets et
  tokens existants, zéro duplication.

---

## 2. Historique chronologique

Reconstitué depuis `git log` et `VERSION_HISTORY.md` **[VÉRIFIÉ]**. Les
raisons détaillées des versions anciennes sont **[INCONNU]** au-delà de ce
que disent ces entrées.

### 2.1 Commits

| Commit | Date | Versions |
| --- | --- | --- |
| `12aeaef` | 27/10/2026 | 2.0.0 : import du starter V2 |
| `fe22380` | 27/10 | ajout de VERSION_HISTORY.md |
| `e5ebc73` | 27/10 | 2.1.0 : synchro Figma via MCP officiel |
| `6ea48e5` … `9ef1cba` | 27/10 | 2.2.0 → 2.17.0 (branche `main` jusqu’ici) |
| `dd11293` | 27/10 | 2.18.0 : début de la v3 (branche `v3-dashboard`) |
| `ef32874`, `dafe15d`, `409203a` | 27/10 | 2.19.0 → 2.21.0 |
| `bd964b0` | 28/10 | 2.22.0 → 2.27.1 |
| `ca2e9f8` | 28/10 | 2.28.0 → 2.32.0 |
| `18a7e19` | 28/10 | 2.33.0 → 2.34.1 |
| `b0e5a7d` | 28/10 | 2.34.2 → 2.35.0 (poussé) |
| `96a520d` | 29/10 | 2.36.0 → 2.44.0 (commité et **poussé** sur accord) |
| `cf93bc4` | 29/10 | 2.45.0 → 2.46.0 (commité, **non poussé**) |
| *(non commité)* | 30/10 | **2.47.0** (Codex + corrections) et **2.48.0** (skills Claude) |

`main` pointe sur `9ef1cba` (2.17.0) ; `v3-dashboard` sur `96a520d`, à jour
avec `origin/v3-dashboard`. Aucune PR connue.

### 2.2 Étapes par version (résumé)

- **2.0.0** : starter DS-Studio V2 importé tel quel.
- **2.1.0** : comparaison et synchro Figma via le MCP officiel ; testé
  sur fixtures uniquement.
- **2.2.0 → 2.5.0** :
  - dashboard avec menu vertical ;
  - onglet Brief, lecture seule de Notion ;
  - page Bento, frise et checklist persistante
    (`.ds-studio/tasks.json`) ;
  - logo 🌋.
- **2.6.0** : page « Dashboard Volcan », volcan SVG animé selon les dates.
- **2.7.0** : onglet Contexte & Assistant (chat Claude côté serveur, lecture
  seule). Testé avec un assistant simulé.
- **2.8.0 → 2.11.0** :
  - composant `Card` unique ;
  - grille masonry ;
  - accueil Tableau de bord ;
  - pages adressables par `?vue=…`.
- **2.12.0 → 2.14.0** :
  - page Design : éditeur de tokens, inspecteur, puis atelier de
    composition ;
  - chat plein écran ;
  - choix du modèle Claude.
- **2.15.0 → 2.17.0** : Mantine et thème unique, kit Figma shadcn/ui
  (sitsiilia), thème shadcn/create sombre complet.
- **2.18.0 → 2.21.0** (v3) :
  - Dashboard reconstruit sur le DS fourni (shadcn/create, oklch) ;
  - studio Design hybride (chat Claude, bibliothèque, calques,
    appareils) ;
  - Fiche PFE ;
  - Mes schémas.
- **2.22.0 → 2.27.1** :
  - palette officielle des accents `#FABC3C → #F55536` (9 nuances, sans
    bleu ni violet) ;
  - KPI Rendus et Prochain rendu sur les statuts réels ;
  - Étapes du PFE (statuts manuels) ;
  - Mes notes en post-it ;
  - **état actif ou sélectionné centralisé : fond `#000`, texte blanc
    (21:1)**.
- **2.28.0 → 2.35.0** :
  - studio Design : couleur, audit de contraste WCAG, alignements,
    calques multi-sélection ;
  - chat Claude réel via la CLI Claude Code ;
  - plugin Figma « DS-Studio Bridge » (`localhost:4310`, appairage,
    import, « Actualiser Figma ») ;
  - export PNG/JPEG clair ;
  - « Ajuster », Pivoter, chat déplaçable.
- **2.36.0** : Carte interactive, Martinique en vraie 3D (Three.js) à
  partir d’un MNT réel (AWS Terrain Tiles), 5 risques simulés sur le
  relief.
- **2.37.0 → 2.38.0** :
  - observatoire, avec trois natures d’information jamais mélangées :
    officiel, exposition, simulation ;
  - données réelles USGS, NHC, NOAA via le serveur ;
  - page Prévention ;
  - corrections du rendu de l’océan.
- **2.39.0** : corrections du studio Design (bibliothèque, onglets,
  export).
- **2.40.0 → 2.41.0** :
  - carte centrée sur la personne : géolocalisation (≤ 300 m) ou adresse
    BAN, avec consentement ;
  - « Vous êtes ici » ;
  - « Niveau de vigilance actuel » non disponible, jamais vert ;
  - 7 tags de risques ;
  - atelier de l’app PFE.
- **2.42.0** : onglets Design remplis de couleur, appareils iPhone,
  simulateurs interactifs.
- **2.43.0** : app PFE responsive, menu, splash, UX de crise « Je suis en
  danger ».
- **2.44.0** :
  - app PFE : écran « Où êtes-vous ? » ;
  - carte plein écran avec burger flottant, puce vigilance et tiroir à
    3 états ;
  - pages Notifications et Widgets & raccourcis ;
  - connecteur Météo-France légal (clé requise, sinon « Non
    disponible »).
- **2.45.0** :
  - dock mobile 5 actions ;
  - card vigilance avec « Zone concernée » ;
  - Mes lieux (multi-lieux, CRUD) ;
  - 34 communes officielles (IGN) ;
  - Pelée recalée, étiquettes anti-chevauchement ;
  - card « Vous êtes ici » compacte, rythme du panneau droit ;
  - Mes notes en post-it Bento ;
  - volcan 3D sur le relief réel ;
  - splash continu.
- **2.47.0** (30/10) : reprise d’un travail **Codex** non commité
  (parcours « Me préparer » en 7 étapes, stockage local avec repli de
  session, adresse du logement sur 2 lignes, splash image par image),
  audité puis corrigé (notes en grille Bento, cases dans la DA, card
  vigilance PFE, volcan sans océan en palette chaude, padding mobile).
- **2.46.0** : frise « Échéances à venir » liée aux 6 phases du volcan
  (aperçu), bouton « Suivre ma progression », réalisme et VFX renforcés,
  correctifs de la boucle de rendu, ce document.

### 2.3 Arbitrages et changements de direction connus [VÉRIFIÉ]

- **Volcan**
  - Il suivait d’abord les **dates** du PFE (2.6.0 → 2.44.0).
  - Depuis 2.45.0, il suit l’**avancement réel** : étapes du PFE « faites »
    ou « validées ».
  - Depuis 2.46.0, la frise sert d’**aperçu** sans rien modifier.
- **Vigilance Météo-France**
  - Le site meteofrance.mq n’est pas lu, car ses « Droits de reproduction »
    interdisent l’extraction systématique.
  - Le flux officiel outre-mer exige une clé du portail API. Le connecteur
    renvoie donc « Non disponible » avec la raison.
- **Géorisques** : l’API coupe les connexions du serveur local
  (ECONNRESET), d’où « Données indisponibles ». Le contournement par
  User-Agent a été refusé.
- **Chat Claude** : appel via la CLI Claude Code (session claude.ai) depuis
  2.29.0. L’adaptateur « claude » de `connectors/agents` reste « non
  validé » pour l’agent embarqué.
- **Plugin Figma** : passage à `http://localhost:4310`, car Figma refuse les
  adresses IP.
- **États actifs** : noir/blanc partout depuis 2.27.0. Exception
  volontaire en 2.42.0 : les onglets gauche du studio sont remplis de
  couleur.

---

## 3. Architecture

### 3.1 Pile technique [VÉRIFIÉ] (`package.json`, v2.46.0)

- React 19.3.1, TypeScript 7.0.2, Vite 8.3.5, `tsx`.
- Mantine 9.6.3 (thème v2 / `app/client`) ; la v3 utilise ses propres
  composants (`app/v3/ui.tsx`) et les tokens shadcn/create
  (`app/v3/tokens.css`).
- Three.js 0.186.1 (pas de React Three Fiber : scènes impératives).
- lucide-react 1.55.0, zod 4.6.7, html-to-image, `@anthropic-ai/sdk`
  0.133.0.
- Tests : Node test runner via `tsx --test`, Playwright 1.64.1
  (Chromium).
- Node ≥ 22.12.

### 3.2 Arborescence utile

```
app/
  server/        serveur HTTP local (127.0.0.1:4310), données privées .ds-studio/
    http.ts        routes /api/*, /pfe/, statiques, sécurité d'origine
    carteData.ts   USGS, NHC, NOAA, BAN, Géorisques ; cache par source
    vigilance.ts   connecteur Météo-France (non connecté sans clé)
    figmaBridge.ts pont plugin Figma (appairage, scène)
    userData.ts    données v3 (étapes, notes…)   tasks.ts / project.ts / store.ts
    assistant.ts   chat Claude                    files.ts (écritures atomiques)
  shared/        contrats partagés (zod) : brief.ts (jalons, rendus), steps.ts
                 (étapes, notes), model.ts (tokens), figmaScene/Target, composition
  client/        UI v2 (Mantine), Volcano.tsx (SVG), VolcanoGL.tsx (shader 2D)
  v3/            itération v3 (entrée v3.html)
    App.tsx        navigation : dashboard, design, brief, schemas, notes, carte, prevention
    Dashboard.tsx  KPI, frise, Activité (volcan), Accès rapide
    Timeline.tsx   frise des jalons (aria-pressed, aperçu)
    volcan/        Volcan.tsx (UI), scene.ts (Three.js), phases.ts
    Studio.tsx + studio/   espace Design (bibliothèque, calques, export, Figma…)
    Brief.tsx      Étapes du PFE        Schemas.tsx  Mes schémas      Notes.tsx  Mes notes
    Carte.tsx      Carte interactive    Prevention.tsx  Prévention & ressources
    carte/         moteur partagé carte + app PFE :
      scene.ts       scène 3D Martinique      MapView.tsx  vue, balises, outils
      dem.ts         MNT (toPixel, readHeights) martinique-dem.png/.json
      communes.ts    34 communes (IGN)        martinique-communes.json
      risks.ts       7 risques, balises, fiches
      Proches.tsx    vigilance + tags (useSituation)
      Logement.tsx   logement (BAN, consentement)  Locate.tsx  géolocalisation
      Places.tsx     Mes lieux (multi-lieux)   Downloads.tsx  hors ligne (Cache Storage)
      Plan.tsx, Preparer.tsx, Situation.tsx, Coupe.tsx
    tokens.css     DS shadcn/create (oklch) + accents ; v3.css  styles v3
pfe-mobile/      app PFE autonome (servie sur /pfe/) : App, Explore, Danger, Settings,
                 crisis.ts, app.css, theme/current (DA actuelle), theme/future (vide)
figma-plugin/    plugin « DS-Studio Bridge » (code.ts, ui.html, manifest.json)
connectors/      agents (codex qualifié ; claude/gemini non validés) ; figma (contrat)
scripts/         service.mjs (service), launcher, fetch-martinique-dem/communes.mjs,
                 scan-public.mjs, e2e-server.mjs, figma-sync.ts…
tests/           *.test.ts (unitaires) ; e2e/studio.spec.ts (Playwright)
docs/            ARCHITECTURE, SECURITY, TOKENS, FIGMA, SOURCES_RISQUES, TESTING…
workspace/       contexte PFE d'exemple (Lisière), règles, décisions, tokens
.ds-studio/      ÉTAT PRIVÉ (jamais commité) : compositions, figma, verrous serveur…
```

### 3.3 Routes HTTP principales [VÉRIFIÉ] (`app/server/http.ts`)

- **Lecture (GET)**
  - `/api/bootstrap`, `/api/agents`, `/api/project`, `/api/tasks`,
    `/api/v3/data`, `/api/state`, `/api/compositions`, `/api/export`,
    `/api/assistant`.
  - Carte : `/api/carte/situation[?force=1]`, `/api/carte/seismes`,
    `/api/carte/commune?insee=`.
  - Figma : `/api/figma/status`, `/api/figma/scene`,
    `/api/figma/scene/meta`.
- **Écriture (POST)**
  - Projet et tokens : `/api/project`, `/api/v3/data`, `/api/tasks`,
    `/api/proposals`, `/api/import`, `/api/undo`, `/api/commit`,
    `/api/agent`.
  - Compositions : `/api/compositions` (+ `/delete`), `/api/compose`.
  - Carte (adresse ou coordonnées dans le corps, jamais dans l’URL) :
    `/api/carte/reverse`, `/api/carte/geocode`.
  - Figma : `/api/figma/scene`.
  - Assistant : `/api/assistant` (+ `/model`, `/clear`).
- **Service** : `/_studio/health`, `/_studio/stop`.
- **App PFE** : `/pfe/` sert `dist/pfe-mobile/index.html` ; en dev, Vite
  sert `/pfe-mobile/` avec HMR.

### 3.4 Stockage

- **Serveur** (`.ds-studio/`, privé) : tâches, données v3 (étapes, notes…),
  compositions, assistant, appairage et scène Figma, verrous.
  `DS_STUDIO_DATA_DIR` permet de le déplacer.
- **Navigateur** (`localStorage`) **[VÉRIFIÉ]** :

| Usage | Clés |
| --- | --- |
| Interface | `ds-v3-theme`, `ds-v3-nav`, `ds-v3-view`, `ds-v3-bubble-pos` |
| Studio Design | `ds-v3-design`, `ds-v3-files`, `ds-v3-history`, `ds-v3-screen`, `ds-v3-screen-colors` |
| Schémas | `ds-v3-schemas`, `ds-v3-schema-tabs` |
| Lieux (carte et app) | `ds-v3-logement` (principal, format inchangé), `ds-v3-lieux` (autres lieux) |
| Préparation et urgence | `ds-v3-plan`, `ds-v3-danger`, `ds-v3-ressources`, `ds-v3-trousse` |
| Notifications | `ds-v3-notifs`, `ds-v3-notifs-log` |
| Volcan | `ds-v3-volcan-nuit`, `ds-v3-volcan-anim` |

- **Cache Storage** : ressources hors ligne de l’app PFE (plafond 1 Go).

### 3.5 Variables d’environnement

Noms seulement, **aucune valeur ici** **[VÉRIFIÉ]** :

- `PORT` (défaut 4310)
- `DS_STUDIO_DATA_DIR`
- `DS_STUDIO_FIGMA_DIR`
- `DS_STUDIO_FAKE_COMPOSER` (tests)
- `CODEX_HOME`
- `METEOFRANCE_API_KEY` (absente : vigilance non connectée)

La clé Anthropic : **[HYPOTHÈSE]** le chat passe par la CLI Claude Code et
sa session, d’après les versions 2.29.0+. Aucune variable `ANTHROPIC_*`
n’est lue dans `app/`.

### 3.6 Commandes

```bash
npm install                      # dépendances
npm run dev                      # serveur + Vite (HMR), http://127.0.0.1:4310
npm run build                    # tsc + vite build (dist/)
npm run --silent service -- restart   # service local (sert dist/)
npm run check                    # tsc --noEmit
npm test                         # tests unitaires (74 au 29/10/2026)
npx playwright test              # e2e (45 au 29/10/2026)
npm run scan                     # contrôle de publication (0 alerte)
node scripts/fetch-martinique-communes.mjs   # re-télécharge les 34 communes
node scripts/fetch-martinique-dem.mjs        # re-télécharge le MNT
```

---

## 4. Pages et comportements attendus

### 4.1 Dashboard (`?vue=dashboard`, `app/v3/Dashboard.tsx`)

- **KPI** : « Rendus restants » (5 rendus, statuts réels), « Prochain
  rendu » (premier rendu non validé, J-X en date locale), « Délai écoulé »,
  « Jalon ».
- **Frise « Échéances à venir »** :
  - 6 jalons ; teinte selon la proximité (palette jaune → rouge) ;
    états Passé / À venir uniquement (une date passée ≠ validation).
  - **Un clic** donne un aperçu de la phase du volcan correspondante.
  - **Un second clic** sur le même jalon revient à la progression réelle.
- **Activité** :
  - volcan 3D (voir §6) ;
  - libellé « Phase X/6 · nom », plus « · aperçu {jalon} » si un jalon est
    sélectionné ;
  - bouton « Suivre ma progression » ;
  - outils en haut à droite : pause des animations, Jour, Nuit ;
  - description « Métaphore de l’avancement réel du PFE (N % des
    étapes) ».
- **Accès rapide** : 4 tuiles colorées (Design, Étapes du PFE, Mes schémas,
  Mes notes).
- **Contraintes** : tient en 1440 × 900 sans défilement (test e2e) ;
  Light/Dark ; bulle de chat Claude flottante.

### 4.2 Design (`?vue=design`, `Studio.tsx`, `studio/`)

- Onglets gauche dans l’ordre Bibliothèque → Calques → Claude (couleurs
  `--tab-*`).
- Aperçu dans les appareils iPhone 15 Pro, iPad Air, MacBook Pro et Screen
  libre, avec Pivoter et Ajuster.
- Calques multi-sélection, alignements, couleur, audit de contraste WCAG.
- Exports PNG/JPEG en thème clair, et React.
- Pont Figma : plugin, « Actualiser Figma ».
- Chat Claude par la CLI (lecture et proposition).

Détails : versions 2.20.0 → 2.42.0.

### 4.3 Étapes du PFE (`?vue=brief`, `Brief.tsx`)

- Un statut par étape : À faire, En cours, À retravailler, Fait, Validé.
- 10 étapes (`stepIds`). « Attendus du brief » et « Mes pistes »
  éditables.
- Checklist ; « Ma progression · N % » = étapes faites ou validées. C’est
  **la source du % du volcan**.
- Statuts saisis à la main ; les anciennes tâches indiquent seulement
  « en cours ».

### 4.4 Mes schémas (`?vue=schemas`)

Schémas de recherche par catégories (onglets). Détails **[INCONNU]**
au-delà de 2.21.0 et 2.25.1.

### 4.5 Mes notes (`?vue=notes`, `Notes.tsx`)

- **Affichage** :
  - post-it en grille Bento (colonnes ≥ 260 px, ordre de lecture,
    épinglées d’abord) ;
  - coin replié, élévation au survol.
- **Contenu** :
  - teintes de la palette (`1,3,5,7,9`) et pastels (`p1…p9`) ;
  - titre facultatif (champ `title`, ajouté en 2.45.0 au schéma
    `app/shared/steps.ts`) ;
  - texte long tronqué avec « Lire la suite ».
- **Actions** :
  - lecture seule par défaut ;
  - au survol, au focus ou au toucher : épingler, rappel, modifier,
    supprimer (avec confirmation) ;
  - crayon → édition, « Valider » en bas à droite, « Annuler » restaure
    l’état ;
  - rappels réels tant que DS-Studio est ouvert (notification système si
    autorisée).

### 4.6 Carte interactive (`?vue=carte`, `Carte.tsx` + `carte/`)

Voir §7. Panneau droit dans cet ordre :

1. « Vous êtes ici » : card compacte ;
2. vigilance ;
3. 7 risques ;
4. « Comprendre les alertes ».

Rythme : 20 px entre sections, 10–16 px à l’intérieur, marges de 16 px.

### 4.7 Prévention & ressources (`?vue=prevention`, `Prevention.tsx`)

Onglets, dont « Prototype de l’application » : iframe `/pfe/` dans un cadre
iPhone 15 Pro (393 × 852, Dynamic Island, zones sûres). Contient aussi des
ressources de préparation, un plan et des téléchargements.

### 4.8 Application PFE (`pfe-mobile/`)

Voir §8.

---

## 5. Design System

- **Tokens v3** (`app/v3/tokens.css`) **[VÉRIFIÉ]** :
  - thème ui.shadcn.com/create repris tel quel (oklch) : `:root` clair et
    `.dark` sombre ;
  - `--radius: 0.875rem` (14 px).
  - Sombre : fond ≈ `#0A0A0A`, cartes `#171717`, texte `#FAFAFA` /
    `#A1A1A1`.
- **Palette officielle des accents** :
  - `--accent-1 #FABC3C`, `-2 #FCB73A`, `-3 #FFB238`, `-4 #F8A23E`,
    `-5 #F19143`, `-6 #F88440`, `-7 #FF773D`, `-8 #FA663A`, `-9 #F55536` ;
  - encre `--accent-ink #0A0A0A` (contraste ≥ 6:1 sur les accents) ;
  - pas de bleu ni de violet.
- **Sélection et actif** : fond `#000`, texte et icônes blancs, liseré clair
  en sombre (règle centralisée, 2.27.0).
- **Typographie** : Inter (variable, locale). Tailles et espacements :
  **[INCONNU]** en détail, voir `v3.css` (variables `--gap`…).
- **Bento** : cards à hauteur de contenu ; grilles `auto-fit`.
- **Light/Dark** : bascule soleil/lune, mémorisée (`ds-v3-theme`).
- **Responsive**
  - Le Dashboard tient en 1440 × 900.
  - App PFE : barre latérale à partir de 900 px, sinon burger et dock.
- **Accessibilité** : WCAG 2.2 AA visé ; `aria-*` systématiques ; focus
  visibles ; `prefers-reduced-motion` respecté (carte, volcan, splash).
- **UX writing** : français, phrases courtes, honnêteté :
  - « Non disponible », « Simulation pédagogique », « Métaphore » ;
  - jamais de niveau officiel inventé ;
  - aucun envoi annoncé comme fait.
- **Guides** : `docs/COMPONENT_GUIDELINES.md`, `docs/CREATIVE_PROCESS.md`,
  `docs/TOKENS.md`. Pour les tokens, utiliser le skill `token-change` (sur
  accord).

---

## 6. Volcan 3D (Dashboard)

Fichiers : `app/v3/volcan/scene.ts`, `Volcan.tsx`, `phases.ts`.

### 6.1 Géométrie et rendu [VÉRIFIÉ]

- **Relief réel de la montagne Pelée** :
  - fenêtre de 168 px du MNT de la carte, environ 12,5 km, centrée sur le
    sommet (14,8094 N ; −61,1658 O) ;
  - exagération ×1,8, cuvette sommitale ; **sans océan** depuis 2.47.0
    (demande : la mer devient une plaine basse fondue dans la brume) ;
  - maillage de 256 × 256, ou 150 en basse consommation.
- **Couleurs et détail** :
  - couleurs par altitude et pente, **palette chaude** depuis 2.47.0
    (demande « marron au rouge ») : végétation olive / ocre, savane beige,
    roche brune,
    cendre ;
  - détail procédural au pixel (`onBeforeCompile`) : strates, ravines,
    taches de végétation.
- **Végétation et roches** :
  - ~5000 arbres (cônes) en `InstancedMesh` ;
  - ~360 roches émissives (« roches chaudes »).
- **Environnement** :
  - ciel et brume chauds (beige, pêche ; nuit brun-rouge) ;
  - ciel en dégradé jour/nuit, étoiles, lune ;
  - soleil avec ombres, lumière hémisphérique ;
  - lumière de cratère `#FF773D`.
- **Particules GPU** (positions calculées dans le shader) :
  - fumée (2400) ;
  - projections balistiques (700) ;
  - brume sur les flancs ;
  - **explosions en salves** (520).
- **Coulées** : rubans qui suivent la plus grande pente du relief, révélés
  progressivement, animés.
- **Palette DS** dans la lave, les lueurs et les fumées : `#F55536`,
  `#FF773D`, `#F19143`, `#FABC3C`.

### 6.2 Phases (`phases.ts`)

| Phase | Nom | Progression réelle | Jalon de la frise (aperçu) |
| --- | --- | --- | --- |
| 1 | Endormi | 0–19 % | Lancement |
| 2 | Fumerolles | 20–39 % | Note de cadrage |
| 3 | Fumée dense | 40–59 % | Accessibilité & RGPD |
| 4 | Cratère incandescent | 60–79 % | Début du DS |
| 5 | Pré-éruption | 80–99 % | Document de cadrage |
| 6 | Éruption | 100 % | Fin du DS |

- La progression réelle vaut `étapes faites ou validées / 10`. Elle était
  de 10 % le 29/10/2026, d’où la phase 1.
- L’aperçu ne modifie **aucun** statut ni pourcentage (test e2e).
- Les transitions sont continues et réversibles.

### 6.3 Interactions

- Rotation autonome lente et parallaxe au survol.
- Glisser souris ou tactile, borné (±0,7 rad en azimut).
- Clic : zoom léger (bascule).
- Jour/Nuit et pause des animations mémorisés.
- `prefers-reduced-motion` : animations en pause par défaut.

### 6.4 Performance

- Boucle unique : un bug de double boucle a été corrigé en 2.46.0.
- DPR adaptatif.
- **Basse consommation** automatique (rendu logiciel détecté ou image
  > 40 ms) : DPR 0,6, sans ombres, environ 8 i/s.
- Pause hors écran (`IntersectionObserver`) et si l’onglet est caché.
- Chargement paresseux (import dynamique), nettoyage WebGL
  (`dispose`, `forceContextLoss`).
- **Repli sans WebGL** : volcan SVG existant (`client/Volcano.tsx`).
- Mesuré : **60 i/s sur les 6 phases**, Chromium sans interface, GPU Apple
  M1 Pro (Metal).

### 6.5 Limites [VÉRIFIÉ / HYPOTHÈSE]

- **Pas photoréaliste** : rendu stylisé crédible, pas de textures PBR
  photographiques.
- La photo de référence de la Pelée mentionnée dans la demande 2.46.0
  **n’a pas été reçue** dans la session.
- Fumée en sprites (« volumétrique » au sens visuel seulement).
- La nuit, les arbres en cônes peuvent paraître facettés.
- Pas testé sur un vrai téléphone.
- `window.__volcan` est exposé pour les tests, comme `window.__carte`.

---

## 7. Carte de la Martinique

Fichiers : `app/v3/carte/*`, `app/server/carteData.ts`, `vigilance.ts`.
Sources détaillées : `docs/SOURCES_RISQUES.md`.

- **Terrain 3D**
  - AWS Terrain Tiles (SRTM terre zoom 11 ~74 m, ETOPO1/GEBCO mer).
  - Web Mercator.
  - Relief ×2, fonds ×0,5.
  - Océan en shader.
- **Communes**
  - 34 limites officielles : API Découpage administratif (Etalab),
    contours IGN ADMIN EXPRESS, Licence Ouverte 2.0, WGS84.
  - Simplifiées à ~25 m.
  - Bouton « Limites des communes » ; survol ou toucher → nom et
    surbrillance orange ; `communeAt()` local.
- **Pelée et Saint-Pierre**
  - Sommet de la Pelée : 14,8094 N ; −61,1658 O (IGN/GVP).
  - Saint-Pierre est une balise distincte.
  - Étiquettes anti-chevauchement selon le zoom.
- **Risques** (7) : séisme, volcanisme, tsunami, cyclone, fortes pluies,
  sargasses, brume de sable.
  - Couches **simulées** sur le relief : « Simulation pédagogique : ni
    prévision ni alerte ».
- **Données réelles** (serveur, cache, horodatage, « périmées » si la
  source tombe) :
  - séismes USGS FDSN (10 ans) ;
  - cyclones NHC `CurrentStorms.json` ;
  - tsunamis NOAA PTWC/NTWC (Atom) ;
  - adresses BAN (`/search`, `/reverse`).
  - Actualisation toutes les 60 min, au retour en ligne et à la demande
    (minimum 2 min entre deux actualisations forcées).
- **Vigilance officielle** : **non connectée**. Le flux Météo-France
  outre-mer demande `METEOFRANCE_API_KEY`, et son point d’accès reste à
  confirmer dans la doc du portail. L’interface affiche « Non disponible »,
  jamais vert.
- **Géorisques** : connexions coupées (ECONNRESET), d’où « Données
  indisponibles ».
- **Position et lieux**
  - Géolocalisation (précision ≤ 300 m) ou adresse BAN, avec
    consentement.
  - Martinique uniquement.
  - Stockage sur l’appareil.
  - Marqueurs personnels ≠ informations officielles.

---

## 8. Application PFE (`pfe-mobile/`)

- **Architecture**
  - App React autonome (entrée Vite `pfe-mobile/index.html`, sortie
    `dist/pfe-mobile/`), servie sur `/pfe/`.
  - Elle réutilise `app/v3/carte/*` : aucune copie.
  - `theme/current` = DA actuelle ; `theme/future` réservé.
- **Émulateur** : cadre iPhone de DS-Studio (`studio/Device.tsx`). Ce n’est
  pas le simulateur Xcode ; `react-device-mockup` n’existe pas
  (`pfe-mobile/README.md`).
- **Splash**
  - Logo 🌋, titre, bouton « Je suis en danger ».
  - Barre continue de 0 à 90 % en 2,4 s (dégradé `#FF773D → #FABC3C`, rail
    gris foncé).
  - 100 % seulement quand la page est chargée ; puis l’accueil.
- **Accueil** : « Je suis en danger » / « Explorer les risques ».
- **Urgence** (`Danger.tsx`, `crisis.ts`)
  - Appel aux secours (`tel:`) fixe en bas.
  - Situation devinée d’après le dernier événement observé, présentée
    comme incertaine.
  - Consignes ; abris officiels « non publiés » (renvoi au DICRIM).
  - SMS « Je suis en vie » pré-rempli, jamais envoyé automatiquement.
- **Explorer**
  1. « Où êtes-vous ? » : géolocalisation, adresse, ou dernière adresse.
  2. Carte 3D plein écran avec burger flottant.
  3. Card « Vigilance actuelle » : Non disponible, « Zone concernée :
     adresse », Météo-France · Martinique, heure de vérification.
  4. Tiroir : fermé, réduit, intermédiaire ou déployé ; 7 risques ; une
     couche à la fois.
  5. Lieux personnels avec mini-fiche.
  6. Placement d’un lieu d’un toucher sur la carte.
- **Dock mobile** (sous 900 px) : pilule noire avec 5 actions :
  - Carte ;
  - Risques ;
  - Mes lieux ;
  - Préparation et ressources ;
  - Profil et paramètres (pastille orange).

  Il est masqué sur l’écran d’urgence. Zoom et recentrage flottants retirés
  sur mobile (« Recentrer la carte » dans le menu).
- **Mes lieux** (`Places.tsx`)
  - Créer, modifier, supprimer : nom, type, couleur, adresse.
  - Domicile principal ; déplacement.
  - Migration sans perte : le logement principal reste dans
    `ds-v3-logement`.
- **Menu**
  - Accueil, Mes lieux, Ressources hors ligne, Mon plan d’urgence ;
  - Comprendre les alertes, Notifications, Widgets & raccourcis ;
  - « Recentrer la carte » sur la carte.
- **Notifications**
  - Permission explicite, notification de test, préférences.
  - **Pas de service push** : rien ne s’affiche app fermée. Ne remplace
    pas FR-Alert.
- **Widgets & raccourcis**
  - Liens `/pfe/#danger|explore|offline|plan`.
  - Guides iPhone (Raccourcis, Siri, Toucher le dos, bouton Action) et
    Android.
  - Double appui sur le bouton d’alimentation : impossible depuis le web ;
    le SOS natif est préservé.
- **Hors ligne** : Cache Storage, tailles réelles. Sans service worker, le
  serveur local reste nécessaire.
- **Données personnelles** : tout reste sur l’appareil ; BAN interrogée
  seulement après consentement ; aucun partage automatique.

---

## 9. Intégrations

- **Claude**
  - Bulle et chat du studio par la CLI Claude Code, avec la session de
    l’utilisatrice.
  - Modèles Opus / Sonnet / Haiku 5.5 au choix.
  - L’assistant embarqué v2 est en lecture seule, sans outils.
  - Non testé contre l’API brute (`CLAUDE.md`).
- **Figma**
  - Plugin `figma-plugin/` (« DS-Studio Bridge », `localhost:4310`, code
    d’appairage) : import d’écrans, Relaunch « Importer depuis
    DS-Studio », « Actualiser Figma ».
  - MCP Figma utilisé en lecture seule par les agents.
  - **Ne jamais écrire dans le fichier source sans autorisation.**
  - Voir `figma-plugin/README.md`, `docs/FIGMA.md`.
- **Exports** : PNG/JPEG (thème clair, fond transparent en option), React,
  Figma.
- **GitHub**
  - `origin` = `audrey-creator23/ds-studio` (privé).
  - Push seulement sur accord explicite.
- **Notion** : liens en lecture seule ; **aucune écriture, jamais**.

---

## 9 bis. Skills Claude (Superpowers, Caveman, Ponytail) — 2.48.0

- **Sources [VÉRIFIÉ]** (API GitHub, 30/10/2026) :

| Plugin | Dépôt | Version | Licence |
| --- | --- | --- | --- |
| Superpowers | `obra/superpowers` | v7.0.1 | MIT (Jesse Vincent) |
| Caveman | `JuliusBrussee/caveman` | v4.0.1 | Apache-2.0 (Julius Brussee) |
| Ponytail | `DietrichGebert/ponytail` | v5.3.3 | MIT (Dietrich Gebert) |

- **Installation** (choix de l’utilisatrice) :
  - `SKILL.md` et `LICENSE` seuls, dans `skills/<plugin>/skills/<skill>/` ;
  - un manifeste minimal `.claude-plugin/plugin.json`, sans hooks ;
  - script `scripts/vendor-skills.mjs` : versions figées et empreintes
    SHA-256 (réinstallation : `node scripts/vendor-skills.mjs`) ;
  - Superpowers réduit à 5 skills.
- **Écarté et pourquoi** : les plugins officiels de caveman et ponytail
  exécutent des hooks Node à chaque session ; ponytail écrit aussi dans
  `~/.config` et propose un webhook. Le serveur d’aperçu de
  `brainstorming` n’est pas installé.
- **Contenu audité** :
  - Markdown d’instructions uniquement ;
  - les exemples shell de `systematic-debugging` restent inertes (aucun
    outil shell) ;
  - `using-superpowers` pousse à enchaîner les skills : c’est bloqué, car
    l’outil Skill n’est pas fourni.
- **Architecture**
  - `app/server/skills.ts` détecte les skills : description,
    `tokens ≈ octets / 4`.
  - L’état est gardé dans `.ds-studio/skills.json` :
    `{ active, repoRead }`, tout faux par défaut.
  - Routes : `GET` et `POST /api/skills` ; `/api/compose` accepte
    `skill` (uniquement s’il est actif).
  - `connectors/agents/claudeCli.ts` ajoute `--plugin-dir` et préfixe le
    prompt par `/plugin:skill`. Il lit l’événement `init`, d’où
    `skillLoaded`.
  - La lecture du projet ajoute
    `--tools Read,Grep,Glob --add-dir <root> --allowedTools …`, avec des
    règles `deny` (`.env*`, `.ds-studio`, `.git`, `node_modules`) passées
    par `--settings`.
  - `AutoComposer` impose Claude Code quand un skill ou la lecture du
    projet sont demandés.
- **Interface** (`app/v3/studio/SkillsBar.tsx`) :
  - au-dessus de la saisie de l’onglet Claude ;
  - suggestion par mots clés ;
  - accord par `confirm` avant chaque envoi avec un skill, coût affiché ;
  - le skill choisi vaut pour un seul message.
- **Tests**
  - Unitaires : empreintes, état par défaut, refus d’un skill inconnu ou
    inactif.
  - e2e (compositeur simulé, qui renvoie une trace des options reçues) :
    détection, activation persistante, accord refusé ou donné, un message
    seulement, lecture du projet transmise.
  - **Un seul appel réel** (caveman, accord donné) : sans erreur, mais
    chargement non formellement prouvé. La preuve `init` a été ajoutée
    après cet appel ; la présence des champs `slash_commands`, `skills` et
    `plugins` dans l’`init` reste **[HYPOTHÈSE]**.
- **Limites**
  - Chaque message est un nouvel appel `claude -p` sans session
    persistante : les modes « persistants » (caveman, ponytail) doivent
    être rechargés à chaque message, avec coût et accord.
  - Skills indisponibles avec la clé API brute.
  - Écriture dans le dépôt non prévue : la lecture seule a été choisie.
  - Non testés en réel : ponytail, superpowers, lecture du projet.

---

## 10. État exact au 30/10/2026 (v2.48.0)

- **Terminé et testé** [VÉRIFIÉ] : tout ce qui est décrit en §4 à §8 et
  en §11, sauf les points ci-dessous. Résultats :
  - `npm run check` : OK ;
  - `npm test` : 81/81 ;
  - `npx playwright test` : 50/50 ;
  - `npm run scan` : 0 alerte ;
  - build : OK.
- **Git** : 2.45.0 → 2.46.0 commitées dans `cf93bc4` (**non poussé**).
  **2.47.0 et 2.48.0 non commitées** : travail Codex + corrections
  Claude Code (§11), skills Claude (§9 bis).
- **Partiel / limites**
  - Volcan non photoréaliste, photo de référence non reçue (§6.5).
  - Vigilance Météo-France non connectée (clé absente).
  - Géorisques indisponible.
  - Pas de push (notifications) ni de service worker.
  - Performances non mesurées sur un vrai téléphone.
  - Les tests e2e tournent en Chromium avec rendu logiciel : le test du
    Dashboard prend ~10 s.
- **Dette technique connue**
  - `app/v3/carte/scene.ts` (~1450 lignes) et `v3.css` (~4650 lignes)
    sont volumineux.
  - Avertissement Vite sur la taille des chunks.
  - Avertissement Three « PCFSoftShadowMap removed » sur la scène de la
    carte (le volcan utilise `PCFShadowMap`).
  - Erreur CSP en console : « script-src not explicitly set… »,
    préexistante, cause **[INCONNU]**.
  - **Prettier** : ne pas le lancer en masse sur `app/server` : il avait
    reformaté `app/server/userData.ts`, ce qui a été annulé.
- **Décisions ouvertes**
  - Brancher la vigilance (clé API, à fournir par l’utilisatrice).
  - Le placement exact des 5 actions du dock a été défini sans la capture
    de référence citée.
  - Photo de la Pelée à fournir pour affiner le volcan.

---

## 11. Dernière demande (2.47.0) — reprise du travail Codex

**[DEMANDE]** (30/10/2026) : reprendre et corriger le travail de Codex,
qui ne convenait ni visuellement ni fonctionnellement.

- **Exigence de méthode** : auditer chaque point en suivant la grille
  attendu → état actuel → défaut → correction → test.
- **Points à couvrir** :
  - app PFE : vigilance, contrôles, dock, communes, Pelée, Mes lieux ;
  - Mes notes ;
  - card Mon logement ;
  - panneau droit de la Carte ;
  - volcan et jalons ;
  - splash ;
  - **refonte de « Me préparer »** en parcours guidé de 7 étapes, sur
    3 zones en desktop et en tiroir sur mobile.
- **Contraintes** : respecter strictement la DA, contrôle qualité
  desktop / mobile / clair / sombre, ne rien simuler.

**Constat Git** [VÉRIFIÉ] : à la reprise, Codex avait laissé 16 fichiers
modifiés et 5 nouveaux, **non commités**, et `package.json` en 2.47.0 sans
entrée dans `VERSION_HISTORY.md`. Tout a été **conservé**.

**Apports Codex conservés** :

- `Preparation.tsx` et `preparationModel.ts` : parcours de 7 étapes, avec
  validation sur critères réels et migration sans fausse validation.
- `localStore.ts` : copie de session si le stockage est refusé.
- Adresse du logement sur 2 lignes ; « Enregistré le » retiré de
  l’interface.
- Splash piloté image par image.
- Tests : `localStore`, `preparation`, et 4 tests e2e (préparation,
  migration, brouillon des notes, splash).

**Audit et corrections Claude Code** [VÉRIFIÉ] :

| Exigence | Défaut constaté | Correction | Test |
| --- | --- | --- | --- |
| Notes : grille Bento, peu de vide | Colonnes CSS : 4e colonne vide, ordre vertical | Grille auto-fit, rangées de 8 px, `grid-row-end` mesuré, parent stable | e2e notes (grille + span), test brouillon Codex OK |
| DA : sélection noir / blanc | Cases et boutons radio en bleu navigateur | `accent-color` sur `--selected` ; blanc en sombre | Capture clair / sombre |
| Mobile : pas de cards imbriquées | Padding de `.preparation` en plus de la card | Padding retiré à ≤ 760 px | Capture mobile |
| Vigilance PFE compacte | Ligne Codex en trop qui masquait « Limites des communes » | « Météo-France · département · heure » ; périmètre dans l’info-bulle et l’`aria-label` | e2e PFE + capture |
| Volcan : note « plus zoomé, sans océan, marron au rouge » | Océan, île en disque, palette verte et bleue | Océan supprimé (plaine dans la brume), palette beige / ocre / brun / rouge, ciel chaud, cadrage serré | Captures phases 1 → 6, jour / nuit |
| Panneau droit aligné | « Comprendre les alertes » décalé de 13 px | Marge négative du bouton fantôme | Capture |

**Vérifié sans changement nécessaire** :

- dock à 5 actions ;
- carte plein écran ;
- Mes lieux ;
- card Mon logement ;
- splash ;
- frise → volcan ;
- parcours « Me préparer » sur desktop ;
- 34 communes et Pelée (tests existants).

**Non vérifiable ici / limites** :

- photoréalisme du volcan (stylisé) ; la fumée forme encore un nuage
  au-dessus d’une colonne peu dense ;
- essai sur un téléphone réel ;
- lecteur d’écran réel (seuls les rôles et libellés sont vérifiés) ;
- la refonte « Me préparer » est de Codex : vérifiée par captures et
  tests, pas reprise étape par étape ;
- vigilance officielle toujours non connectée.

---

## 12. Reprise immédiate

1. Ouvrir le dossier du dépôt (chez l’utilisatrice :
   `~/Desktop/DS-Studio-codex-v2`), branche `v3-dashboard`.
2. `git status` : 2.47.0 et 2.48.0 sont **non commitées** (et `cf93bc4`
   non poussé). Demander : « Je commite 2.47.0 → 2.48.0 sur v3-dashboard ? ». Ne commiter et ne
   pousser **que sur accord explicite**.
3. `npm install` si besoin, puis `npm run build` et
   `npm run --silent service -- restart`. Ouvrir
   `http://127.0.0.1:4310/` et `/pfe/`.
4. Avant toute modification, lire `CLAUDE.md`, `AGENTS.md`,
   `START_HERE.md`, puis le guide utile seulement (économie de contexte).
5. Après chaque modification :
   - mettre à jour `VERSION_HISTORY.md` et lancer `npm version` ;
   - lancer les 5 vérifications ;
   - redémarrer le service ;
   - **mettre à jour ce fichier**.
6. **Priorités suggérées** **[HYPOTHÈSE]**, à confirmer avec
   l’utilisatrice :
   - faire valider visuellement le volcan et l’app PFE ;
   - obtenir la photo de la Pelée et la capture du dock ;
   - brancher la vigilance si la clé est fournie ;
   - tester sur un iPhone réel ;
   - alléger `scene.ts` et `v3.css` si besoin.

---

## 13. Sources et traçabilité

- Historique : `VERSION_HISTORY.md` (une entrée par version, de 2.0.0 à
  2.46.0) et `git log` (29 commits au 29/10/2026).
- Sources des données de risques : `docs/SOURCES_RISQUES.md`.
- App PFE : `pfe-mobile/README.md`.
- Figma : `figma-plugin/README.md`, `docs/FIGMA.md`, `docs/FIGMA_KIT.md`.
- Sécurité : `docs/SECURITY.md`. Tests : `docs/TESTING.md`.
- Instructions agents : `CLAUDE.md`, `AGENTS.md`, `START_HERE.md`,
  `GEMINI.md`, `.agents/skills/*`.
- Liens vérifiés pendant le projet :
  - « Droits de reproduction » de Météo-France :
    https://meteofrance.com/droits-de-reproduction
  - SOS d’urgence sur iPhone (Apple) : https://support.apple.com/fr-fr/104992
  - API des communes : https://geo.api.gouv.fr

---

## PROMPT DE REPRISE À COPIER

```
Tu reprends le projet DS-Studio d'Audrey Noiran (dépôt privé GitHub
audrey-creator23/ds-studio, dossier local ~/Desktop/DS-Studio-codex-v2, branche
v3-dashboard, version 2.48.0 au 30/10/2026). Réponds en français, de façon
très concise (« CAVEMAX » : code et tokens minimaux, rendu premium, zéro
régression, réutiliser l'existant, zéro duplication, pas de refonte inutile).

Contexte : DS-Studio est un starter pédagogique de Design System devenu le
studio personnel du PFE de l'utilisatrice (React 19 / TS / Vite, Three.js,
lucide-react, serveur local 127.0.0.1:4310). Pages v3 : Dashboard (KPI, frise
« Échéances à venir » liée au volcan 3D en 6 phases, Accès rapide), Design
(studio de composition, exports, pont Figma), Étapes du PFE, Mes schémas,
Mes notes (post-it Bento), Carte interactive (Martinique 3D, MNT réel,
34 communes IGN, 7 risques simulés, données USGS/NHC/NOAA/BAN), Prévention
& ressources (prototype iPhone de l'app PFE). L'app PFE « Risques
Martinique » (pfe-mobile/, servie sur /pfe/) : splash, « Je suis en
danger », carte plein écran, dock mobile 5 actions, Mes lieux, vigilance,
notifications (sans push), raccourcis, hors ligne.

LIS D'ABORD PROJECT_HANDOFF.md (tout le contexte, l'état exact, les limites)
puis CLAUDE.md, AGENTS.md, START_HERE.md ; ne lis ensuite que le guide utile.

Règles absolues :
- Jamais de commit ni de push sans accord explicite demandé à chaque fois ;
  ne jamais réécrire l'historique ; préserver code et données (.ds-studio/,
  localStorage : ds-v3-logement doit rester compatible).
- Notion : lecture seule absolue. Figma : jamais d'écriture dans le fichier
  source sans autorisation.
- Aucun secret côté client ni dans le dépôt (clés en .env côté serveur).
- Jamais de fausse vigilance, alerte, « temps réel », envoi, suivi ou
  évacuation ; pas de scraping non autorisé ni de contournement (clé,
  CAPTCHA, User-Agent). Vigilance Météo-France non connectée sans
  METEOFRANCE_API_KEY → « Non disponible », jamais vert.
- Le volcan reste une métaphore de l'avancement du PFE, jamais l'activité
  réelle de la Pelée. La frise ne fait qu'un aperçu : ne jamais modifier
  statuts ni %.
- Skills/plugins : annoncer utilité et coût en tokens, attendre l'accord.
- WCAG 2.2 AA, Light/Dark, responsive, prefers-reduced-motion ; actif/
  sélectionné = noir/blanc ; palette d'accents #FABC3C → #F55536 (encre
  #0A0A0A), sans bleu ni violet.
- Après chaque modification validée : entrée VERSION_HISTORY.md (SemVer) +
  npm version X.Y.Z --no-git-tag-version ; npm run check, npm test, npm run
  build, npx playwright test, npm run scan ; npm run --silent service --
  restart ; mettre à jour PROJECT_HANDOFF.md ; commit distinct sur accord,
  terminé par « Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com> ».
- Ne pas lancer prettier en masse sur app/server (a déjà reformaté
  userData.ts).
- Sépare toujours faits vérifiés, demandes, hypothèses et inconnus ; ne
  prétends jamais qu'une chose fonctionne sans l'avoir exécutée.

État : 2.47.0 (travail Codex repris + corrections) et 2.48.0 (skills
Superpowers / Caveman / Ponytail dans l'onglet Claude, Markdown seul,
désactivés par défaut, accord par message) sont NON COMMITÉES ; dernier
commit cf93bc4 non poussé. 81 tests unitaires et 50 e2e passent. Chaque
utilisation réelle d'un skill demande l'accord de l'utilisatrice. Limites connues : volcan stylisé (pas
photoréaliste, photo de référence de la Pelée jamais reçue), vigilance non
connectée, Géorisques indisponible (ECONNRESET), pas de push ni de service
worker, pas d'essai sur iPhone réel.

Première action : faire `git status`, résumer l'état, demander si je dois
commiter 2.47.0 → 2.48.0, puis demander la prochaine priorité. Si une
décision passée doit être justifiée, demande de joindre les conversations
manquantes (l'historique des échanges antérieurs à 2.44.0 n'est connu que
par VERSION_HISTORY.md et les commits).
```

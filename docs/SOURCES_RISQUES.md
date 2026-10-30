# Sources des risques — Carte interactive (Martinique)

Vérifié le 29/10/2026. Règle : une donnée n’est affichée que si une source
publique la fournit en flux exploitable ; sinon « Non disponible » et lien
vers l’organisme compétent. Vigilance officielle, observation et simulation
sont toujours séparées. Rien n’est présenté comme « temps réel » : la carte
affiche l’heure de dernière vérification (toutes les 60 min, ou à la
demande) et la date de publication propre à chaque source.

| Risque | Organisme compétent (niveau officiel) | Flux intégré | Couverture / fréquence | Licence | Fiabilité / limites |
| --- | --- | --- | --- | --- | --- |
| Séisme | OVSM-IPGP ([ipgp.fr/observation/ovs/ovsm](https://www.ipgp.fr/observation/ovs/ovsm/)) ; préfecture | **USGS FDSN** `earthquake.usgs.gov/fdsnws/event/1/query` (GeoJSON) | Région 13,5–16° N, 59,5–62,5° O, 10 ans ; magnitudes ≳ 2,5 ; publication en minutes ; cache 15 min | Domaine public (gouvernement des États-Unis) | Catalogue mondial : pas la microsismicité de la Pelée (OVSM, bulletins PDF hebdomadaires, sans API). Observation, jamais un niveau. |
| Volcanisme | OVSM-IPGP (surveillance), préfecture (niveau d’alerte) | Aucun | — | — | Bulletins PDF seulement ; niveau d’alerte non publié en flux : « Non disponible ». |
| Tsunami | Préfecture (alerte) ; centre régional : PTWC (CARIBE-EWS) | **NOAA tsunami.gov** flux Atom `PHEBAtom.xml` (PTWC) et `PAAQAtom.xml` (NTWC) | Messages localisés 5–32° N, 50–98° O ; publiés à chaque événement ; cache 15 min | Domaine public (NOAA) | Messages techniques en anglais (information, veille, alerte) ; l’alerte en Martinique reste celle de la préfecture. Pas d’heure ni de hauteur affichées. |
| Cyclone | Météo-France Antilles-Guyane ([meteofrance.mq/fr/vigilance](https://meteofrance.mq/fr/vigilance)) ; préfecture (vigilance : voir note ci-dessous) | **NHC** `nhc.noaa.gov/CurrentStorms.json` (CMRS de Miami, OMM) | Systèmes actifs de l’Atlantique ; avis toutes les 6 h (3 h en veille / alerte) ; cache 30 min ; distance à l’île calculée | Domaine public (NOAA) | Vigilance Météo-France non connectée (flux officiel avec clé API, voir note) ; aucune heure d’arrivée calculée. |
| Fortes pluies / orages | Météo-France Antilles-Guyane | Aucun | — | — | Vigilance outre-mer : flux officiel avec clé API (voir note), non connecté : « Non disponible ». |
| Sargasses | Météo-France (bulletins sargasses), préfecture / ARS ; Madininair (H₂S) | Aucun | — | — | Bulletins sans flux structuré ; présence constatée non affichée. |
| Brume de sable | Madininair (PM10), Météo-France (prévision) | Aucun | — | — | Pas d’API officielle trouvée (agrégateurs tiers non retenus). Seuils PM10 : information 50 µg/m³, alerte 80 µg/m³. |

**Vigilance Météo-France outre-mer** (cyclone, fortes pluies, houle…) :
flux officiel en données ouvertes (Licence Ouverte 2.0), fichier unique
zippé actualisé chaque minute ; l’accès en direct passe par le portail
API de Météo-France **avec authentification (clé)**, seule l’archive est
téléchargeable sans clé ([documentation Météo-France](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/874741792/Donn+es+expertis+es)).
Non connecté : il faut créer un compte et une clé sur le portail API
(démarche de l’utilisatrice), puis la placer côté serveur (`.env`) ; le
format exact sera alors implémenté d’après la documentation du portail.
Aucune lecture automatique du site meteofrance.mq : les
[« Droits de reproduction »](https://meteofrance.com/droits-de-reproduction)
de Météo-France interdisent l’extraction répétée et systématique. La page
vigilance de meteofrance.mq ne renvoie qu’aux bulletins climatiques des
données publiques (produit 129), pas à la vigilance.
Connecteur : `app/server/vigilance.ts` (format normalisé prévu : niveau,
phénomènes, zone, source, publication, validité, fuseau
`America/Martinique`) ; tant qu’il n’est pas connecté, `situation()`
renvoie la raison et l’app affiche « Non disponible », jamais un vert.

Autres sources de la page :

- **Adresse ↔ position** : Base Adresse Nationale (`api-adresse.data.gouv.fr`,
  `/search` et `/reverse`), Licence Ouverte 2.0 ; appelée seulement avec le
  consentement, adresse et coordonnées dans le corps de la requête au
  serveur local (jamais dans une URL), résultats limités à la Martinique.
  Géolocalisation retenue seulement si la précision est ≤ 300 m.
- **Risques par commune** : API Géorisques (Licence Ouverte 2.0). Elle
  coupe actuellement les connexions du serveur local : « Données
  indisponibles ».
- **Relief et fonds** : AWS Terrain Tiles (SRTM, ETOPO1, GEBCO).
- **Limites des 34 communes** : API Découpage administratif
  (`geo.api.gouv.fr`, Etalab), contours IGN ADMIN EXPRESS, Licence
  Ouverte 2.0, WGS84 ; simplifiés à ~25 m (sous la résolution du relief),
  aucune géométrie ajoutée (`scripts/fetch-martinique-communes.mjs` →
  `app/v3/carte/martinique-communes.json`). Nom au survol / toucher,
  couche activable.
- **Montagne Pelée** : sommet (Le Chinois) 14,8094 N, 61,1658 O (IGN,
  GVP Smithsonian) ; le point le plus haut du MNT tombe à moins de 75 m.
  Saint-Pierre (14,7433 N, 61,1758 O) reste une balise distincte ;
  étiquettes qui se chevauchent effacées selon le zoom.
- **Lieux personnels** (app PFE) : marqueurs de l’utilisateur, stockés sur
  l’appareil, jamais présentés comme une information officielle.

Technique : `app/server/carteData.ts` (cache par source, une seule requête
par source en cours, actualisation manuelle limitée à une réponse de plus
de 2 min, délai 12 s, dernière réponse servie « périmée » si la source
tombe) ; route `GET /api/carte/situation[?force=1]` ; client
`app/v3/carte/Proches.tsx` (vérification toutes les 60 min, au retour en
ligne et à la demande ; hors ligne : dernières données datées).

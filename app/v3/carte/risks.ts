import {
  Activity,
  CloudLightning,
  Haze,
  Leaf,
  Mountain,
  Tornado,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Contenu de la carte. Trois natures d'information, jamais mélangées :
// 1. officiel : source, lien, et donnée seulement si une API publique la
//    fournit (sinon « Données indisponibles ») ;
// 2. exposition géographique : calculée sur le relief réel ;
// 3. simulation pédagogique : hypothèses écrites, niveaux « simulés ».
export type RiskId =
  | 'seisme'
  | 'volcan'
  | 'tsunami'
  | 'cyclone'
  | 'pluies'
  | 'brume'
  | 'sargasses';
export type Fiche = {
  quoi: string;
  ou: string;
  risque: string;
  consequences: string;
  prevention: string;
  source: string;
};
export type Marker = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  sea?: boolean;
  fiche: Fiche;
};
export type Official = {
  // Organisme qui publie le niveau officiel (vigilance, alerte, statut).
  org: string;
  url: string;
  // Donnée structurée disponible dans l'application ?
  feed: 'usgs' | null;
  note: string;
};
export type Risk = {
  id: RiskId;
  label: string;
  icon: LucideIcon;
  official: Official;
  // Niveaux SIMULÉS de la simulation (hypothèses de calcul).
  legend: [string, string, string];
  hypothesis: string;
  causes: string;
  consequences: string;
  avant: string[];
  pendant: string[];
  apres: string[];
  kit: string[];
  zone: Fiche;
  markers: Marker[];
};

const georisques =
  'Information officielle : georisques.gouv.fr ; DICRIM de la commune ; préfecture de la Martinique.';

export const risks: Risk[] = [
  {
    id: 'seisme',
    label: 'Séisme',
    icon: Activity,
    official: {
      org: 'OVSM-IPGP (observatoire) ; USGS (catalogue mondial)',
      url: 'https://www.ipgp.fr/observation/ovs/ovsm/',
      feed: 'usgs',
      note: 'Séismes régionaux de magnitude ≳ 2,5 (USGS). La microsismicité sous la Pelée est publiée par l’OVSM en bulletins (PDF), non intégrés.',
    },
    legend: ['Plus de 45 km', '30 à 45 km', 'Moins de 30 km'],
    hypothesis:
      'Distance à l’épicentre réel du 29/11/2007 (M 7,4, foyer à ~156 km) : la secousse s’atténue avec la distance. Hypothèse simple, pas un zonage.',
    causes:
      'La plaque Amérique (Atlantique) s’enfonce sous la plaque Caraïbe d’environ 2 cm par an : c’est la subduction. Les contraintes accumulées se libèrent brutalement le long de failles, dans la plaque plongeante ou à leur contact.',
    consequences:
      'Secousses, puis répliques plus faibles. Dommages aux bâtiments, glissements de terrain, coupures de réseaux ; un séisme fort en mer peut provoquer un tsunami.',
    avant: [
      'Fixer meubles hauts et objets lourds.',
      'Repérer un abri solide dans chaque pièce.',
      'Préparer la trousse d’urgence et le plan familial.',
    ],
    pendant: [
      'S’abriter sous un meuble solide, protéger sa tête.',
      'S’éloigner des fenêtres ; dehors, des bâtiments et câbles.',
      'En voiture : s’arrêter à l’écart, rester à bord.',
    ],
    apres: [
      'Sortir calmement, sans ascenseur ; couper gaz et électricité.',
      'Près de la côte après un séisme fort : monter vers les hauteurs.',
      'Écouter la radio, ne pas encombrer les réseaux.',
    ],
    kit: ['Chaussures et lampe près du lit'],
    zone: {
      quoi: 'Secousses du sol dues à la rupture de failles, liées à la subduction.',
      ou: 'Toute la Martinique est en zone de sismicité 5 (forte), la plus élevée en France.',
      risque:
        'Simulation : plus proche de l’épicentre, secousse plus forte (hypothèse de calcul).',
      consequences:
        'Dommages aux bâtiments, glissements de terrain, coupures de réseaux.',
      prevention:
        'Pendant : s’abriter sous un meuble solide, loin des vitres. Après : évacuer calmement, sans ascenseur.',
      source: georisques,
    },
    markers: [
      {
        id: 'epi-2007',
        label: 'Épicentre du 29/11/2007',
        lat: 14.944,
        lon: -61.274,
        sea: true,
        fiche: {
          quoi: 'Séisme de magnitude 7,4, ressenti dans tout l’arc antillais.',
          ou: 'En mer au nord-ouest de l’île ; foyer à environ 156 km de profondeur (hors échelle sur la carte).',
          risque:
            'Événement passé, montré pour comprendre les ondes ; pas une prévision.',
          consequences:
            'Dégâts surtout modérés grâce à la grande profondeur du foyer.',
          prevention:
            'Construction parasismique, exercices réguliers, trousse d’urgence.',
          source: 'USGS Earthquake Hazards Program ; OVSM-IPGP.',
        },
      },
    ],
  },
  {
    id: 'volcan',
    label: 'Volcanisme',
    icon: Mountain,
    official: {
      org: 'OVSM-IPGP (surveillance) ; préfecture (niveau d’alerte)',
      url: 'https://www.ipgp.fr/observation/ovs/ovsm/',
      feed: null,
      note: 'Statut et bilans publiés par l’OVSM (bulletins PDF) et la préfecture : pas de flux structuré public, donc non affichés ici.',
    },
    legend: [
      'Exposition simulée faible',
      'Exposition simulée modérée',
      'Exposition simulée forte',
    ],
    hypothesis:
      'Scénario hypothétique réglable : phénomène et vent choisis par vous. Les nuées suivent la plus forte pente du relief réel ; vitesses et portées illustratives, jamais des périmètres officiels.',
    causes:
      'La plaque qui plonge libère de l’eau vers 100 km de profondeur : le manteau fond, le magma remonte et alimente la montagne Pelée, volcan explosif.',
    consequences:
      'Nuées ardentes (avalanches de gaz et de cendres brûlants, très rapides), retombées de cendres, projections, coulées de boue (lahars) dans les rivières.',
    avant: [
      'Connaître le niveau d’alerte officiel et sa zone d’évacuation.',
      'Préparer masques FFP2 et lunettes étanches.',
    ],
    pendant: [
      'Suivre les consignes d’évacuation de la préfecture.',
      'Cendres : rester à l’intérieur, fermer portes et fenêtres, masque FFP2.',
      'S’éloigner des rivières (lahars).',
    ],
    apres: [
      'Ne revenir qu’à l’autorisation officielle.',
      'Dégager les toits des cendres avec protection, sans s’y exposer.',
    ],
    kit: ['Masques FFP2 (un par personne et par jour)', 'Lunettes étanches'],
    zone: {
      quoi: 'Volcan actif : nuées ardentes, retombées de cendres, lahars.',
      ou: 'Nord de l’île, autour de la montagne Pelée.',
      risque:
        'Exposition simulée selon le scénario choisi (hypothèse), pas le zonage officiel.',
      consequences:
        'Destructions, cendres sur cultures et réseaux, coulées de boue dans les rivières.',
      prevention:
        'Suivre l’OVSM et la préfecture ; connaître son itinéraire d’évacuation.',
      source: 'OVSM-IPGP ; ' + georisques,
    },
    markers: [
      {
        id: 'pelee',
        label: 'Montagne Pelée',
        lat: 14.8094,
        lon: -61.1658,
        fiche: {
          quoi: 'Volcan actif, environ 1 397 m, surveillé en continu.',
          ou: 'Nord de la Martinique.',
          risque:
            'Le niveau d’alerte réel est publié par la préfecture, sur avis de l’OVSM.',
          consequences:
            'Éruption de 1902 : nuée ardente qui détruit Saint-Pierre.',
          prevention:
            'Respecter les accès fermés et les consignes d’évacuation.',
          source: 'OVSM-IPGP.',
        },
      },
      {
        id: 'st-pierre',
        label: 'Saint-Pierre',
        lat: 14.7433,
        lon: -61.1758,
        fiche: {
          quoi: 'Ancienne capitale détruite le 8 mai 1902.',
          ou: 'Côte caraïbe, au pied du volcan.',
          risque: 'Lieu historique de la nuée ardente de 1902.',
          consequences: 'Environ 28 000 victimes en 1902.',
          prevention: 'Mémoire du risque, plans d’évacuation, surveillance.',
          source: 'OVSM-IPGP ; archives historiques.',
        },
      },
    ],
  },
  {
    id: 'tsunami',
    label: 'Tsunami',
    icon: Waves,
    official: {
      org: 'Préfecture (alerte) ; centres d’alerte régionaux',
      url: 'https://www.martinique.gouv.fr/',
      feed: null,
      note: 'Aucun flux d’alerte public intégré. Itinéraires et sites refuges : plan communal (DICRIM) et préfecture.',
    },
    legend: ['Terrain 6 à 10 m', 'Terrain 3 à 6 m', 'Terrain 0 à 3 m'],
    hypothesis:
      'Scénario illustratif sans heure ni hauteur prédictive : vagues venant de l’Atlantique ; zone = littoral bas (altitude ≤ 10 m, à moins de 1,5 km de la mer).',
    causes:
      'Un séisme sous la mer, un glissement sous-marin ou une éruption soulève brutalement une colonne d’eau : la vague traverse l’océan très vite et grandit en arrivant sur les fonds peu profonds.',
    consequences:
      'Plusieurs vagues successives, inondation rapide du littoral, courants violents, débris.',
    avant: [
      'Repérer un itinéraire à pied vers les hauteurs (DICRIM).',
      'Préparer un sac prêt près de la porte.',
    ],
    pendant: [
      'Signes : séisme fort ou long, mer qui se retire, grondement.',
      'Monter immédiatement à pied vers les hauteurs, sans attendre d’alerte.',
      'Ne pas aller voir la mer.',
    ],
    apres: [
      'Rester en hauteur jusqu’à la fin d’alerte officielle : les vagues se répètent.',
    ],
    kit: ['Sac d’évacuation prêt près de la porte', 'Chaussures fermées'],
    zone: {
      quoi: 'Série de vagues capables d’envahir le littoral bas.',
      ou: 'Bandes côtières de faible altitude, baies et embouchures.',
      risque:
        'Simulation : exposition croissante quand l’altitude baisse (hypothèse de calcul).',
      consequences:
        'Inondation rapide, courants violents, débris, vagues successives.',
      prevention:
        'Séisme fort ressenti ou mer qui se retire : gagner immédiatement les hauteurs à pied, sans attendre d’alerte.',
      source: georisques,
    },
    markers: [
      {
        id: 'fdf',
        label: 'Fort-de-France',
        lat: 14.6036,
        lon: -61.0742,
        fiche: {
          quoi: 'Chef-lieu en fond de baie, front de mer bas.',
          ou: 'Baie de Fort-de-France, côte caraïbe.',
          risque: 'Littoral bas exposé dans cette simulation.',
          consequences: 'Front de mer, port et axes côtiers inondables.',
          prevention:
            'Repérer à l’avance un itinéraire à pied vers les hauteurs.',
          source: georisques,
        },
      },
      {
        id: 'robert',
        label: 'Le Robert',
        lat: 14.6775,
        lon: -60.9406,
        fiche: {
          quoi: 'Commune de baie sur la côte atlantique.',
          ou: 'Côte atlantique, face à la vague du scénario.',
          risque: 'Littoral bas exposé dans cette simulation.',
          consequences: 'Quartiers côtiers et port de pêche inondables.',
          prevention:
            'S’éloigner du rivage et monter, ne pas revenir voir la mer.',
          source: georisques,
        },
      },
    ],
  },
  {
    id: 'cyclone',
    label: 'Cyclone',
    icon: Tornado,
    official: {
      org: 'Météo-France Antilles (vigilance) ; préfecture',
      url: 'https://meteofrance.mq/fr/vigilance',
      feed: null,
      note: 'Pas d’API publique de vigilance pour l’outre-mer : niveau, trajectoire officielle et heure d’arrivée non affichés ici (estimation indisponible).',
    },
    legend: ['Pentes moyennes', 'Pentes fortes', 'Littoral bas'],
    hypothesis:
      'Trajectoire fictive, séparée de toute trajectoire officielle ; intensité illustrative. Zones : submersion du littoral bas, glissements sur les pentes, d’après le relief réel.',
    causes:
      'Sur un océan à plus de 26 °C, l’air chaud et humide monte en tournant (sens inverse des aiguilles d’une montre au nord de l’équateur) ; la tempête se renforce tant qu’elle reste sur l’eau chaude.',
    consequences:
      'Vents et rafales violents, pluies intenses, houle et submersion marine, crues, coupures d’électricité.',
    avant: [
      'Suivre la vigilance Météo-France et les consignes.',
      'Rentrer ou attacher les objets ; protéger les ouvertures.',
      'Recharger téléphones et batteries ; faire des réserves d’eau.',
    ],
    pendant: [
      'Rester à l’abri, loin des fenêtres.',
      'Pendant l’œil, rester à l’abri : le vent revient de l’autre côté.',
    ],
    apres: [
      'Attendre la fin d’alerte ; attention aux fils tombés et aux eaux de crue.',
    ],
    kit: ['Réserve d’eau supplémentaire', 'Bâche et ruban adhésif'],
    zone: {
      quoi: 'Dépression tropicale : vents violents, pluies, houle et marée de tempête.',
      ou: 'Toute l’île, en particulier le littoral bas et les pentes fortes.',
      risque:
        'Simulation : submersion sur le littoral bas, glissements sur les pentes (hypothèse).',
      consequences:
        'Toitures arrachées, crues, routes coupées, coupures d’électricité.',
      prevention:
        'Suivre la vigilance ; préparer eau, nourriture, lampe ; rester à l’abri pendant l’œil.',
      source: 'Vigilance : Météo-France ; ' + georisques,
    },
    markers: [],
  },
  {
    id: 'pluies',
    label: 'Fortes pluies',
    icon: CloudLightning,
    official: {
      org: 'Météo-France Antilles (vigilance fortes pluies et orages)',
      url: 'https://meteofrance.mq/fr/vigilance',
      feed: null,
      note: 'Pas d’API publique de vigilance outre-mer : niveau, début et heure de passage non affichés (jamais extrapolés).',
    },
    legend: ['Ravines', 'Rivières', 'Grands cours d’eau'],
    hypothesis:
      'Écoulements calculés sur le relief réel (accumulation de l’eau selon la pente) : plus le bassin drainé est grand, plus la crue potentielle est forte. Pluie et orage illustratifs.',
    causes:
      'Orages et ondes tropicales déversent beaucoup d’eau en peu de temps ; les pentes fortes concentrent vite le ruissellement dans les ravines et rivières.',
    consequences:
      'Crues soudaines, inondations, coulées de boue, glissements de terrain, foudre.',
    avant: [
      'Suivre la vigilance ; éviter les déplacements.',
      'Mettre au sec documents et objets de valeur.',
    ],
    pendant: [
      'Ne jamais traverser une zone inondée, à pied ou en voiture.',
      'S’éloigner des ravines et rivières ; monter à l’étage.',
      'Orage : éviter arbres isolés, crêtes et baignade.',
    ],
    apres: ['Ne pas toucher les fils électriques ; signaler les dégâts.'],
    kit: ['Bottes et sacs étanches'],
    zone: {
      quoi: 'Ruissellement et crues rapides le long des ravines et rivières.',
      ou: 'Fonds de vallées, ravines, embouchures.',
      risque:
        'Simulation : crue potentielle selon la taille du bassin drainé (calcul sur le relief).',
      consequences: 'Crues soudaines, routes coupées, coulées de boue.',
      prevention:
        'Ne jamais traverser une zone inondée ; s’éloigner des cours d’eau.',
      source: 'Vigilance : Météo-France ; ' + georisques,
    },
    markers: [],
  },
  {
    id: 'brume',
    label: 'Brume de sable',
    icon: Haze,
    official: {
      org: 'Madininair (qualité de l’air) ; Météo-France (prévision)',
      url: 'https://www.madininair.fr/',
      feed: null,
      note: 'Mesures de particules (PM10) et indices publiés par Madininair, sans flux public intégré ici : niveau du jour non affiché.',
    },
    legend: ['Visibilité > 10 km', 'Visibilité 5 à 10 km', 'Visibilité < 5 km'],
    hypothesis:
      'Simulation : nuage de poussières venu de l’est, intensité réglable. Les seuils réglementaires portent sur les PM10 (information 50 µg/m³, alerte 80 µg/m³ en moyenne journalière), mesurés par Madininair.',
    causes:
      'Des vents soulèvent les poussières du Sahara ; les alizés les transportent au-dessus de l’Atlantique jusqu’aux Antilles, surtout de mai à septembre.',
    consequences:
      'Ciel laiteux, visibilité réduite, air chargé en particules fines (PM10) : gêne respiratoire, crises d’asthme, irritation des yeux.',
    avant: ['Suivre les indices de qualité de l’air de Madininair.'],
    pendant: [
      'Personnes sensibles (asthme, enfants, personnes âgées, grossesse) : limiter les efforts dehors.',
      'Éviter le sport intense en extérieur ; garder ses traitements à portée.',
    ],
    apres: ['Aérer quand l’indice redevient bon.'],
    kit: ['Traitement de fond et inhalateur (personnes asthmatiques)'],
    zone: {
      quoi: 'Poussières sahariennes en suspension dans l’air.',
      ou: 'Toute l’île, selon les arrivées de poussières.',
      risque:
        'Simulation : visibilité selon l’intensité choisie (hypothèse), pas une mesure.',
      consequences: 'Gêne respiratoire, visibilité réduite.',
      prevention:
        'Limiter les efforts dehors ; personnes sensibles, rester à l’intérieur.',
      source: 'Mesures : Madininair ; prévisions : Météo-France.',
    },
    markers: [],
  },
  {
    id: 'sargasses',
    label: 'Sargasses',
    icon: Leaf,
    official: {
      org: 'Météo-France (bulletins sargasses) ; Madininair (qualité de l’air)',
      url: 'https://www.madininair.fr/',
      feed: null,
      note: 'Bulletins publiés sans flux structuré public : présence constatée non affichée ici. Les nappes de la carte sont une simulation.',
    },
    legend: ['Côte caraïbe', 'Côte sud', 'Côte atlantique'],
    hypothesis:
      'Simulation de dérive vers l’ouest (alizés, courant nord-équatorial) ; échouements surtout sur la côte atlantique. Ce n’est pas une observation.',
    causes:
      'Algues brunes flottantes qui prolifèrent dans l’Atlantique tropical, puis dérivent avec vents et courants vers les Antilles.',
    consequences:
      'En se décomposant à terre, elles émettent de l’hydrogène sulfuré (H₂S) : odeur, gêne respiratoire, maux de tête ; pêche et tourisme touchés.',
    avant: ['Suivre les bulletins et les mesures d’air de Madininair.'],
    pendant: [
      'Éviter les zones d’échouement denses ; personnes sensibles (asthme, grossesse, enfants) : s’éloigner.',
      'Aérer quand l’air est meilleur, fermer quand l’odeur est forte.',
    ],
    apres: ['Ne pas manipuler les algues sans gants.'],
    kit: ['Gants de protection'],
    zone: {
      quoi: 'Algues brunes flottantes qui s’échouent en masse.',
      ou: 'Surtout les baies de la côte atlantique, exposées aux vents d’est.',
      risque:
        'Simulation : accumulation plus probable face aux alizés (hypothèse).',
      consequences:
        'Émanations d’H₂S, gêne respiratoire, pêche et tourisme touchés.',
      prevention:
        'Éviter les zones d’échouement, suivre les mesures de qualité de l’air.',
      source:
        'Bulletins sargasses : Météo-France ; mesures de l’air : Madininair.',
    },
    markers: [
      {
        id: 'vauclin',
        label: 'Le Vauclin',
        lat: 14.545,
        lon: -60.8394,
        fiche: {
          quoi: 'Baie atlantique souvent touchée par les échouements.',
          ou: 'Côte atlantique sud-est.',
          risque: 'Accumulation probable dans cette simulation.',
          consequences:
            'Odeurs, gêne respiratoire, activités nautiques arrêtées.',
          prevention: 'S’éloigner des amas en décomposition.',
          source: 'Bulletins sargasses : Météo-France.',
        },
      },
      {
        id: 'francois',
        label: 'Le François',
        lat: 14.6158,
        lon: -60.9031,
        fiche: {
          quoi: 'Baie et îlets de la côte atlantique.',
          ou: 'Côte atlantique centre.',
          risque: 'Accumulation probable dans cette simulation.',
          consequences: 'Ports et mangroves encombrés.',
          prevention: 'Suivre les consignes municipales de ramassage.',
          source: 'Bulletins sargasses : Météo-France.',
        },
      },
    ],
  },
];

// Trousse d'urgence : socle commun (autonomie 72 h). Quantité d'eau :
// 6 L par personne pour 72 h (guide « Tous responsables », gouvernement).
export const kitBase = [
  { id: 'eau', label: 'Eau potable', perPerson: 6, unit: 'L' },
  { id: 'nourriture', label: 'Nourriture non périssable pour 3 jours' },
  { id: 'radio', label: 'Radio à piles ou à manivelle' },
  { id: 'lampe', label: 'Lampe torche et piles de rechange' },
  { id: 'secours', label: 'Trousse de premiers secours' },
  { id: 'medicaments', label: 'Médicaments personnels et ordonnances' },
  {
    id: 'documents',
    label: 'Copies des papiers importants (pochette étanche)',
  },
  { id: 'batterie', label: 'Batterie externe chargée et chargeur' },
  { id: 'argent', label: 'Un peu d’argent liquide' },
  { id: 'vetements', label: 'Vêtements de rechange et couverture de survie' },
  { id: 'sifflet', label: 'Sifflet (se signaler)' },
  { id: 'cles', label: 'Double des clés' },
  { id: 'contacts', label: 'Liste de contacts sur papier' },
];
export const kitNeeds = [
  { id: 'bebe', label: 'Bébé', items: ['Lait, biberons et couches'] },
  { id: 'animaux', label: 'Animaux', items: ['Nourriture et laisse ou cage'] },
  {
    id: 'sante',
    label: 'Traitement ou appareillage',
    items: ['Traitement pour 7 jours, appareils et chargeurs'],
  },
  {
    id: 'mobilite',
    label: 'Mobilité réduite',
    items: ['Aide prévue pour évacuer (voisin, proche)'],
  },
];
export const contacts = [
  { n: '112', label: 'Urgences (numéro européen)' },
  { n: '15', label: 'SAMU' },
  { n: '17', label: 'Police, gendarmerie' },
  { n: '18', label: 'Pompiers' },
  { n: '114', label: 'Urgences par SMS (personnes sourdes, malentendantes)' },
];
export const authorities = [
  {
    label: 'Préfecture de la Martinique',
    url: 'https://www.martinique.gouv.fr/',
  },
  {
    label: 'Météo-France Antilles : vigilance',
    url: 'https://meteofrance.mq/fr/vigilance',
  },
  {
    label: 'OVSM-IPGP : volcan et séismes',
    url: 'https://www.ipgp.fr/observation/ovs/ovsm/',
  },
  {
    label: 'Géorisques : risques près de chez soi',
    url: 'https://www.georisques.gouv.fr/',
  },
  { label: 'Madininair : qualité de l’air', url: 'https://www.madininair.fr/' },
];

export const dataSources = [
  'Relief et bathymétrie : AWS Terrain Tiles (SRTM NASA à terre, ETOPO1 NOAA / GEBCO en mer), ~75 m.',
  'Échelle verticale exagérée (relief × 2, fonds marins × 0,5) pour la lisibilité.',
  'Séismes observés : USGS. Risques par commune : Géorisques. Adresses : Base Adresse Nationale.',
];

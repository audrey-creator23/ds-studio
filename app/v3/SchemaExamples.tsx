import type { ReactNode } from 'react';

// Aperçus illustratifs des onglets vides de « Mes schémas ». Ce sont des
// EXEMPLES FICTIFS (étiquetés comme tels), jamais des données de recherche :
// ils disparaissent dès qu'un vrai fichier est importé. Palette officielle.
const A = ['#FABC3C', '#FFB238', '#F19143', '#FF773D', '#F55536'];
const INK = '#0A0A0A';
const t = (
  x: number,
  y: number,
  s: string,
  size = 13,
  w = 500,
  fill = 'currentColor',
  anchor = 'middle',
) => (
  <text
    x={x}
    y={y}
    fontSize={size}
    fontWeight={w}
    fill={fill}
    textAnchor={anchor as 'middle'}
  >
    {s}
  </text>
);
function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 800 450"
      role="img"
      aria-label={`Exemple fictif : ${label}`}
      className="example-svg"
    >
      {children}
    </svg>
  );
}
function Mind({ center, branches }: { center: string; branches: string[] }) {
  const cx = 400;
  const cy = 225;
  return (
    <>
      {branches.map((b, i) => {
        const a = (i / branches.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * 260;
        const y = cy + Math.sin(a) * 160;
        return (
          <g key={b}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={A[i % 5]}
              strokeWidth={3}
            />
            <rect
              x={x - 80}
              y={y - 20}
              width={160}
              height={40}
              rx={20}
              fill={A[i % 5]}
            />
            {t(x, y + 5, b, 13, 600, INK)}
          </g>
        );
      })}
      <circle
        cx={cx}
        cy={cy}
        r={64}
        fill="var(--card)"
        stroke={A[3]}
        strokeWidth={4}
      />
      {t(cx, cy + 5, center, 15, 700)}
    </>
  );
}

const examples: Record<string, ReactNode> = {
  'Entretiens utilisateurs': (
    <Frame label="carte mentale thématique d’entretiens">
      <Mind
        center="Entretiens"
        branches={[
          'Alertes reçues',
          'Préparation',
          'Coupures réseau',
          'Confiance',
          'Proches',
          'Après-crise',
        ]}
      />
    </Frame>
  ),
  Benchmark: (
    <Frame label="mapping concurrentiel sur deux axes">
      <line
        x1={80}
        y1={225}
        x2={720}
        y2={225}
        stroke="currentColor"
        opacity={0.3}
        strokeWidth={2}
      />
      <line
        x1={400}
        y1={40}
        x2={400}
        y2={410}
        stroke="currentColor"
        opacity={0.3}
        strokeWidth={2}
      />
      {t(90, 215, 'Informer', 12, 500, 'currentColor', 'start')}
      {t(710, 215, 'Faire agir', 12, 500, 'currentColor', 'end')}
      {t(410, 55, 'Grand public', 12, 500, 'currentColor', 'start')}
      {t(410, 400, 'Spécialistes', 12, 500, 'currentColor', 'start')}
      {[
        [560, 120, 'Sargass Tracker', A[4]],
        [250, 300, 'Appli vigilance X', A[2]],
        [210, 130, 'Portail d’infos Y', A[1]],
        [600, 320, 'Carte des abris Z', A[3]],
        [480, 170, 'Mon projet', A[0]],
      ].map(([x, y, n, c]) => (
        <g key={n as string}>
          <circle cx={x as number} cy={y as number} r={14} fill={c as string} />
          {t(
            (x as number) + 22,
            (y as number) + 5,
            n as string,
            13,
            600,
            'currentColor',
            'start',
          )}
        </g>
      ))}
    </Frame>
  ),
  'Parcours utilisateurs': (
    <Frame label="parcours utilisateur : étapes, actions, irritants, opportunités">
      {['Alerte', 'S’informer', 'Se préparer', 'Évacuer', 'Après'].map(
        (s, i) => (
          <g key={s}>
            <rect
              x={100 + i * 138}
              y={30}
              width={128}
              height={36}
              rx={18}
              fill={A[i]}
            />
            {t(164 + i * 138, 53, s, 13, 700, INK)}
            {[
              'Reçoit la vigilance',
              'Cherche la consigne',
              'Prépare le kit',
              'Rejoint l’abri',
              'Signale sa situation',
            ].map((a, j) =>
              j === i ? (
                <g key={a}>{t(164 + i * 138, 125, a, 11, 500)}</g>
              ) : null,
            )}
            {[
              'Message ambigu',
              'Sources dispersées',
              'Liste trop longue',
              'Réseau coupé',
              'Infos datées',
            ].map((a, j) =>
              j === i ? (
                <g key={a}>{t(164 + i * 138, 225, a, 11, 500)}</g>
              ) : null,
            )}
            {[
              'Résumé clair',
              'Consigne unique',
              'Checklist guidée',
              'Mode hors ligne',
              'Suivi daté',
            ].map((a, j) =>
              j === i ? (
                <g key={a}>{t(164 + i * 138, 325, a, 11, 500)}</g>
              ) : null,
            )}
          </g>
        ),
      )}
      {['Actions', 'Irritants', 'Opportunités'].map((r, i) => (
        <g key={r}>
          {t(20, 125 + i * 100, r, 12, 700, 'currentColor', 'start')}
          <line
            x1={100}
            y1={150 + i * 100}
            x2={780}
            y2={150 + i * 100}
            stroke="currentColor"
            opacity={0.15}
          />
        </g>
      ))}
      <path
        d="M100 400 C 250 380, 300 420, 440 395 S 650 380, 780 400"
        fill="none"
        stroke={A[3]}
        strokeWidth={3}
      />
    </Frame>
  ),
  Personas: (
    <Frame label="persona du grand public martiniquais">
      <rect
        x={60}
        y={40}
        width={680}
        height={370}
        rx={24}
        fill="none"
        stroke={A[2]}
        strokeWidth={2}
      />
      <circle cx={170} cy={150} r={70} fill={A[0]} />
      {t(170, 160, 'M-J', 28, 700, INK)}
      {t(
        280,
        110,
        'Marie-Jo, 58 ans (personnage fictif)',
        20,
        700,
        'currentColor',
        'start',
      )}
      {t(
        280,
        140,
        'Habite une commune du Nord · peu à l’aise avec le numérique',
        13,
        500,
        'currentColor',
        'start',
      )}
      {t(100, 270, 'Besoins', 14, 700, A[4], 'start')}
      {t(
        100,
        300,
        '• Une consigne claire et courte',
        13,
        500,
        'currentColor',
        'start',
      )}
      {t(
        100,
        325,
        '• Savoir quand prévenir ses proches',
        13,
        500,
        'currentColor',
        'start',
      )}
      {t(430, 270, 'Frustrations', 14, 700, A[3], 'start')}
      {t(
        430,
        300,
        '• Trop de sources à consulter',
        13,
        500,
        'currentColor',
        'start',
      )}
      {t(430, 325, '• Coupures de réseau', 13, 500, 'currentColor', 'start')}
    </Frame>
  ),
  'Mind maps': (
    <Frame label="carte mentale des risques naturels">
      <Mind
        center="Risques"
        branches={[
          'Cyclones',
          'Séismes',
          'Montagne Pelée',
          'Tsunamis',
          'Fortes pluies',
          'Sargasses',
        ]}
      />
    </Frame>
  ),
  'Architecture de l’information': (
    <Frame label="arborescence de l’application">
      <rect x={330} y={30} width={140} height={40} rx={10} fill={A[3]} />
      {t(400, 55, 'Accueil', 14, 700, INK)}
      {['Vigilances', 'Carte', 'Préparer', 'Urgence', 'Profil'].map((s, i) => {
        const x = 80 + i * 160;
        return (
          <g key={s}>
            <path
              d={`M400 70 V110 H${x + 60} V150`}
              fill="none"
              stroke="currentColor"
              opacity={0.35}
              strokeWidth={2}
            />
            <rect x={x} y={150} width={120} height={38} rx={10} fill={A[i]} />
            {t(x + 60, 174, s, 13, 600, INK)}
            {[0, 1].map((j) => (
              <g key={j}>
                <line
                  x1={x + 60}
                  y1={188}
                  x2={x + 60}
                  y2={240 + j * 60}
                  stroke="currentColor"
                  opacity={0.25}
                />
                <rect
                  x={x + 10}
                  y={225 + j * 60}
                  width={100}
                  height={30}
                  rx={8}
                  fill="none"
                  stroke={A[i]}
                  strokeWidth={2}
                />
                {t(x + 60, 245 + j * 60, `Écran ${j + 1}`, 11, 500)}
              </g>
            ))}
          </g>
        );
      })}
    </Frame>
  ),
  'Synthèse de recherche': (
    <Frame label="regroupement par affinités">
      {[
        ['S’informer', ['Sources dispersées', 'Messages trop longs']],
        ['Se préparer', ['Kit oublié', 'Liste peu claire']],
        ['Agir en urgence', ['Réseau coupé', 'Stress élevé']],
      ].map(([title, notes], i) => (
        <g key={title as string}>
          {t(150 + i * 250, 60, title as string, 15, 700)}
          {(notes as string[]).map((n, j) => (
            <g key={n}>
              <rect
                x={70 + i * 250}
                y={90 + j * 120}
                width={160}
                height={96}
                rx={6}
                fill={A[(i + j) % 5]}
                transform={`rotate(${j ? 2 : -2} ${150 + i * 250} ${138 + j * 120})`}
              />
              {t(150 + i * 250, 143 + j * 120, n, 13, 600, INK)}
            </g>
          ))}
        </g>
      ))}
    </Frame>
  ),
};

export function SchemaExample({ tab }: { tab: string }) {
  return (
    <div className="example">
      <span className="example-tag">Exemple fictif</span>
      {examples[tab]}
    </div>
  );
}

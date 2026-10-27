import { memo, type CSSProperties } from 'react';

// Volcan en deux calques SVG. Le calque statique (relief, texture, lumière)
// n'est jamais animé : le navigateur ne le redessine pas. Le calque vivant
// n'anime que transform, opacity et stroke-dashoffset, peu coûteux.
// `activity` (0 → 1) suit les dates du projet, pas l'avancement des tâches.

const W = 600;
const H = 700;
const CRATER = { x: 300, y: 312 };

// Chenaux de lave : points le long des ravines, révélés selon l'activité.
const channels = [
  [
    [288, 320],
    [272, 352],
    [252, 392],
    [228, 436],
    [198, 488],
    [160, 548],
    [118, 612],
    [70, 680],
  ],
  [
    [312, 320],
    [330, 356],
    [352, 398],
    [380, 446],
    [414, 500],
    [456, 560],
    [504, 624],
    [556, 690],
  ],
  [
    [300, 322],
    [302, 372],
    [296, 430],
    [304, 496],
    [294, 568],
    [306, 640],
    [300, 700],
  ],
];
const path = (points: number[][]) =>
  points
    .map(([x, y], i) =>
      i === 0
        ? `M${x} ${y}`
        : `Q${(x + points[i - 1][0]) / 2 + (i % 2 ? 6 : -6)} ${(y + points[i - 1][1]) / 2} ${x} ${y}`,
    )
    .join(' ');
const reveal = (points: number[][], share: number) =>
  points.slice(0, Math.max(2, Math.ceil(points.length * share)));

// Pseudo-aléatoire stable : même rendu à chaque affichage.
const CONE =
  'M-40 700 L40 612 C120 532 200 432 248 352 C262 330 272 318 282 312 Q300 305 318 312 C328 318 338 330 352 352 C400 432 480 532 560 612 L640 700 Z';

const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const VolcanoStatic = memo(function VolcanoStatic({
  activity,
}: {
  activity: number;
}) {
  return (
    <svg
      className="volcano-layer"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="vs-sky"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2={H}
        >
          <stop offset="0" stopColor="#0c0706" />
          <stop offset="0.5" stopColor="#24110c" />
          <stop offset="0.78" stopColor="#4d1f12" />
          <stop offset="1" stopColor="#6e2c15" />
        </linearGradient>
        <radialGradient id="vs-haze" cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#ff7a2a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vs-rock" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#5e3b2d" />
          <stop offset="0.42" stopColor="#3f271e" />
          <stop offset="0.7" stopColor="#2a1913" />
          <stop offset="1" stopColor="#170d0a" />
        </linearGradient>
        <linearGradient id="vs-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b1610" />
          <stop offset="1" stopColor="#140b08" />
        </linearGradient>
        <radialGradient id="vs-crater" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fff1b0" />
          <stop offset="0.35" stopColor="#ffab3d" />
          <stop offset="0.75" stopColor="#e2461c" />
          <stop offset="1" stopColor="#5a160a" />
        </radialGradient>
        <radialGradient
          id="vs-lavalight"
          gradientUnits="userSpaceOnUse"
          cx={CRATER.x}
          cy={CRATER.y + 10}
          r="300"
        >
          <stop offset="0" stopColor="#ff8a3d" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="#c2410c" stopOpacity="0.25" />
          <stop offset="1" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vs-skylight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9a38a" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#d9a38a" stopOpacity="0" />
        </linearGradient>
        <filter id="vs-texture" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.035"
            numOctaves="4"
            seed="11"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.25 0.92"
            result="shade"
          />
          <feComposite
            in="shade"
            in2="SourceGraphic"
            operator="in"
            result="grain"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="grain" />
          </feMerge>
        </filter>
      </defs>
      {/* Ciel et sol débordent du cadre : aucun bord visible quel que soit le format. */}
      <rect x={-W} y={-H} width={W * 3} height={H * 2} fill="url(#vs-sky)" />
      <ellipse
        cx={CRATER.x}
        cy={CRATER.y + 20}
        rx={220}
        ry={200}
        fill="url(#vs-haze)"
        opacity={0.15 + activity * 0.7}
      />
      <path
        d="M-600 540 L-420 500 L-260 530 L-120 490 L-20 560 L80 500 L150 520 L210 486 L260 510 L340 498 L420 470 L500 506 L620 476 L760 520 L900 486 L1060 530 L1200 500 L1200 700 L-600 700 Z"
        fill="url(#vs-far)"
      />
      <g filter="url(#vs-texture)">
        <path d={CONE} fill="url(#vs-rock)" />
        {/* Ravines sombres et arêtes éclairées : le relief. */}
        {[
          'M266 334 C240 392 204 452 160 520 C120 580 74 640 20 700',
          'M278 326 C262 400 236 480 206 560 C186 616 172 660 160 700',
          'M322 326 C340 400 366 480 398 560 C418 616 434 660 446 700',
          'M336 334 C362 392 398 452 442 520 C482 580 528 640 584 700',
          'M300 330 C290 420 310 520 290 700',
          'M254 352 C230 420 214 470 236 560',
          'M350 356 C372 420 390 470 372 560',
        ].map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="#0e0705"
            strokeWidth="9"
            strokeOpacity="0.4"
            strokeLinecap="round"
          />
        ))}
        {[
          'M270 330 C246 390 212 450 170 516 C140 562 112 600 86 640',
          'M326 330 C348 388 380 444 420 506 C446 546 470 580 496 616',
          'M288 328 C278 400 266 470 250 560',
        ].map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="#b07a5c"
            strokeWidth="2.5"
            strokeOpacity="0.3"
            strokeLinecap="round"
          />
        ))}
        <path d={CONE} fill="url(#vs-skylight)" />
      </g>
      <path d={CONE} fill="url(#vs-lavalight)" opacity={0.1 + activity * 0.6} />
      {/* Croûte de lave refroidie dans les chenaux. */}
      {channels.map((c) => (
        <path
          key={c[0].join()}
          d={path(c)}
          fill="none"
          stroke="#3a120a"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.8"
        />
      ))}
      {/* Rebord du cratère éclairé par la lave. */}
      <ellipse cx={CRATER.x} cy={CRATER.y} rx="30" ry="8" fill="#1a0d09" />
      <ellipse
        cx={CRATER.x}
        cy={CRATER.y + 1}
        rx="24"
        ry="5"
        fill="url(#vs-crater)"
        opacity={0.35 + activity * 0.65}
      />
      <path
        d="M262 332 Q300 300 338 332"
        fill="none"
        stroke="#ff8a3d"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={activity * 0.7}
      />
      <rect x={-W} y={H - 12} width={W * 3} height={H} fill="#0f0806" />
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse
          key={i}
          cx={20 + rand(i) * 560}
          cy={672 + rand(i + 30) * 24}
          rx={8 + rand(i + 60) * 22}
          ry={4 + rand(i + 90) * 8}
          fill="#0f0806"
          opacity="0.85"
        />
      ))}
    </svg>
  );
});

function VolcanoLive({ activity }: { activity: number }) {
  const smoke = 5 + Math.round(activity * 7);
  const embers = activity >= 0.3 ? Math.round(4 + activity * 20) : 0;
  const ash = activity >= 0.6 ? Math.round((activity - 0.5) * 10) : 0;
  return (
    <svg
      className="volcano-layer volcano-live"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      style={
        {
          '--speed': `${(9 - activity * 5).toFixed(2)}s`,
          '--smoke': (0.35 + activity * 0.45).toFixed(2),
        } as CSSProperties
      }
    >
      <defs>
        <radialGradient id="vl-smoke" cx="0.42" cy="0.38" r="0.6">
          <stop offset="0" stopColor="#cfc2bb" stopOpacity="0.75" />
          <stop offset="0.6" stopColor="#8c7d76" stopOpacity="0.35" />
          <stop offset="1" stopColor="#5e514c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vl-ash" cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#5a4a45" stopOpacity="0.8" />
          <stop offset="1" stopColor="#2a201d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vl-glow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#ff7a24" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff4a14" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="vl-lava"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={CRATER.y}
          x2="0"
          y2={H}
        >
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.35" stopColor="#ffb23e" />
          <stop offset="1" stopColor="#e2461c" />
        </linearGradient>
        <linearGradient
          id="vl-spray"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={CRATER.y}
          x2="0"
          y2={CRATER.y - 320}
        >
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.5" stopColor="#ff9a2e" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse
        className="vl-glow"
        cx={CRATER.x}
        cy={CRATER.y}
        rx={50 + activity * 90}
        ry={30 + activity * 60}
        fill="url(#vl-glow)"
        opacity={0.25 + activity * 0.75}
      />
      {channels.map((c, i) => {
        const share = Math.min(1, Math.max(0, (activity - i * 0.22) * 1.6));
        if (share <= 0) return null;
        const d = path(reveal(c, share));
        return (
          <g key={c[0].join()}>
            <path className="vl-lava-heat" d={d} />
            <path className="vl-lava-body" d={d} />
            <path className="vl-lava-core" d={d} />
          </g>
        );
      })}
      {Array.from({ length: smoke }, (_, i) => (
        <g
          key={`s${i}`}
          className="vl-smoke"
          style={
            {
              '--dx': `${(rand(i) - 0.35) * 160}px`,
              '--rise': `${220 + rand(i + 9) * 200}px`,
              '--grow': (1.8 + rand(i + 4) * 1.6).toFixed(2),
              animationDelay: `calc(var(--speed) * ${(-i / smoke).toFixed(3)})`,
            } as CSSProperties
          }
        >
          <circle
            cx={CRATER.x - 8}
            cy={CRATER.y - 10}
            r="18"
            fill="url(#vl-smoke)"
          />
          <circle
            cx={CRATER.x + 10}
            cy={CRATER.y - 16}
            r="14"
            fill="url(#vl-smoke)"
          />
          <circle
            cx={CRATER.x}
            cy={CRATER.y - 24}
            r="16"
            fill="url(#vl-smoke)"
          />
        </g>
      ))}
      {Array.from({ length: ash }, (_, i) => (
        <circle
          key={`a${i}`}
          className="vl-ash"
          cx={CRATER.x}
          cy={CRATER.y - 20}
          r={26 + rand(i + 3) * 14}
          fill="url(#vl-ash)"
          style={
            {
              '--dx': `${(rand(i + 7) - 0.5) * 80}px`,
              animationDelay: `${(-i * 0.9).toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
      {activity >= 0.85 && (
        <g className="vl-fountain">
          {Array.from({ length: 9 }, (_, i) => {
            const dx = (i - 4) * 22 + (rand(i + 40) - 0.5) * 14;
            const h = 110 + rand(i + 50) * 120;
            return (
              <path
                key={i}
                d={`M${CRATER.x + dx * 0.08} ${CRATER.y - 4} Q${CRATER.x + dx * 0.55} ${CRATER.y - h * 1.6} ${CRATER.x + dx} ${CRATER.y - h * 0.15}`}
                style={{ animationDelay: `${(-i * 0.13).toFixed(2)}s` }}
              />
            );
          })}
        </g>
      )}
      {Array.from({ length: embers }, (_, i) => (
        <circle
          key={`e${i}`}
          className="vl-ember"
          cx={CRATER.x + (rand(i + 2) - 0.5) * 20}
          cy={CRATER.y - 4}
          r={1.4 + rand(i + 5) * 1.8}
          style={
            {
              '--dx': `${(rand(i + 11) - 0.5) * 180}px`,
              '--up': `${-(60 + rand(i + 13) * 160 * (0.5 + activity))}px`,
              animationDuration: `${(1.6 + rand(i + 17) * 1.8).toFixed(2)}s`,
              animationDelay: `${(-rand(i + 19) * 3).toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}

export const levels = [
  [1, 'Éruption'],
  [0.75, 'Pré-éruption'],
  [0.5, 'Grondement'],
  [0.25, 'Fumerolles'],
  [0, 'Sommeil'],
] as const;
export const levelOf = (a: number) => levels.find(([min]) => a >= min)![1];

export default function Volcano({ activity }: { activity: number }) {
  return (
    <div
      className="volcano-stage"
      role="img"
      aria-label={`Volcan, intensité ${Math.round(activity * 100)} % : ${levelOf(activity)}`}
    >
      <VolcanoStatic activity={activity} />
      <VolcanoLive activity={activity} />
    </div>
  );
}

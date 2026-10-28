import type { DeviceId } from './Device.js';

// Icône « Pivoter » : silhouette de l'appareil actif (dans son orientation
// courante) et flèche courbe, au trait Lucide (24 px, contour fin).
export default function RotateIcon({
  device,
  landscape,
  size = 16,
}: {
  device: DeviceId;
  landscape: boolean;
  size?: number;
}) {
  // Orientation dessinée par défaut : Screen et MacBook en paysage,
  // mobile et iPad en portrait ; pivotée si l'aperçu diffère.
  const turned = landscape !== (device === 'screen' || device === 'laptop');
  const shape = {
    mobile: (
      <>
        <rect x="5" y="8" width="8" height="13" rx="2" />
        <path d="M8.5 10.5h1" />
      </>
    ),
    tablet: (
      <>
        <rect x="3.5" y="8" width="11" height="13" rx="1.5" />
        <path d="M8.5 18.5h1" />
      </>
    ),
    laptop: (
      <>
        <rect x="3.5" y="9" width="11" height="8" rx="1" />
        <path d="M1.5 20h15" />
      </>
    ),
    // Écran : pied toujours en bas, donc dessiné dans les deux sens.
    screen: landscape ? (
      <>
        <rect x="3" y="8.5" width="12" height="9" rx="1" />
        <path d="M9 17.5V20M6.5 20.5h5" />
      </>
    ) : (
      <>
        <rect x="4" y="6.5" width="8" height="11" rx="1" />
        <path d="M8 17.5V20M5.5 20.5h5" />
      </>
    ),
  }[device];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-device={device}
      data-turned={turned || undefined}
    >
      <g
        transform={
          turned && device !== 'screen' ? 'rotate(90 9 14.5)' : undefined
        }
      >
        {shape}
      </g>
      <path d="M13 4a7 7 0 0 1 7 7" />
      <path d="m17.5 8.5 2.5 2.5 2.5-2.5" />
    </svg>
  );
}

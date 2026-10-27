// Logo unique de DS-Studio : emoji volcan natif (Apple Color Emoji sur macOS/iOS).
export default function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`logo logo-${size}`} role="img" aria-label="DS-Studio">
      🌋
    </span>
  );
}

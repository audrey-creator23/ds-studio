import type { ComponentProps, ReactNode } from 'react';

// Composants de la v3 : anatomie et variantes du DS shadcn/ui fourni
// (Card*, Button, Badge, Progress, ToggleGroup, Separator), stylés par
// app/v3/v3.css avec les seuls tokens de app/v3/tokens.css.
const cx = (...c: (string | false | undefined)[]) =>
  c.filter(Boolean).join(' ');

export function Card({ className, ...p }: ComponentProps<'section'>) {
  return <section data-slot="card" className={cx('card', className)} {...p} />;
}
export function CardHeader({ className, ...p }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cx('card-header', className)}
      {...p}
    />
  );
}
export function CardTitle({ className, ...p }: ComponentProps<'h2'>) {
  return (
    <h2 data-slot="card-title" className={cx('card-title', className)} {...p} />
  );
}
export function CardDescription({ className, ...p }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cx('card-description', className)}
      {...p}
    />
  );
}
export function CardAction({ className, ...p }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cx('card-action', className)}
      {...p}
    />
  );
}
export function CardContent({ className, ...p }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cx('card-content', className)}
      {...p}
    />
  );
}
export function CardFooter({ className, ...p }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cx('card-footer', className)}
      {...p}
    />
  );
}

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
export function Button({
  variant = 'default',
  size = 'default',
  className,
  type = 'button',
  ...p
}: ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'default' | 'icon';
}) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={type}
      className={cx('button', className)}
      {...p}
    />
  );
}

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';
export function Badge({
  variant = 'default',
  className,
  ...p
}: ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cx('badge', className)}
      {...p}
    />
  );
}

export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cx('progress', className)}
    >
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr data-slot="separator" className={cx('separator', className)} />;
}

// Choix exclusif (ToggleGroup type="single") : boutons à état pressé.
export function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      data-slot="toggle-group"
      role="group"
      aria-label={label}
      className="toggle-group"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-slot="toggle"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

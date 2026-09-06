import { cn } from '../../lib/cn';

export type ProgressTone = 'accent' | 'success' | 'danger';

const TONES: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
};

export interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  className?: string;
}

export function ProgressBar({ value, tone = 'accent', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-inset', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', TONES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

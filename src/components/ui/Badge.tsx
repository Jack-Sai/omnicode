import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line bg-inset text-fg-secondary',
  accent: 'border-accent-line bg-accent-subtle text-accent',
  success: 'border-success-line bg-success-subtle text-success',
  warning: 'border-warning-line bg-warning-subtle text-warning',
  danger: 'border-danger-line bg-danger-subtle text-danger',
  info: 'border-info-line bg-info-subtle text-info',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** 状态圆点：在线 / 检测中 / 离线 */
export type DotTone = 'success' | 'warning' | 'danger' | 'muted';

const DOT_TONES: Record<DotTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning animate-pulse',
  danger: 'bg-danger',
  muted: 'bg-fg-muted/40',
};

export function StatusDot({ tone = 'muted', className }: { tone?: DotTone; className?: string }) {
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_TONES[tone], className)} />;
}

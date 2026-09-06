import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否有悬停反馈（用于可点击的列表项） */
  interactive?: boolean;
  /** 选中态，用于当前生效的卡片 */
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  interactive,
  selected,
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-surface shadow-sm transition-colors duration-150',
        selected ? 'border-accent' : 'border-line',
        interactive && 'cursor-pointer hover:border-line-strong hover:bg-surface-hover',
        PADDING[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 卡片内部的次级区块，用于代码 / JSON 预览 */
export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-md border border-line bg-inset p-3 font-mono text-xs leading-relaxed text-fg-secondary',
        className
      )}
    >
      {children}
    </pre>
  );
}

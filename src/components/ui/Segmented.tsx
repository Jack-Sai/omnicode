import { cn } from '../../lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 撑满父容器；否则按内容收缩 */
  block?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  block,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-inset p-0.5',
        block && 'flex w-full',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[5px] font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              block && 'flex-1',
              active
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg-secondary'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

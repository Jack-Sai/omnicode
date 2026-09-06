import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border border-accent bg-accent text-accent-solid hover:bg-accent-hover shadow-sm',
  secondary:
    'border border-line bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg shadow-sm',
  ghost: 'border border-transparent bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg',
  danger: 'border border-danger-line bg-danger-subtle text-danger hover:border-danger/40',
  success: 'border border-success-line bg-success-subtle text-success hover:border-success/40',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1.5 rounded-md px-2.5 text-xs',
  md: 'h-9 gap-2 rounded-md px-3.5 text-sm',
  lg: 'h-10 gap-2 rounded-lg px-4 text-sm',
};

const BASE =
  'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] ' +
  'disabled:pointer-events-none disabled:opacity-45';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, block, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  label: string;
}

const ICON_SIZES = { sm: 'h-7 w-7 rounded-md', md: 'h-8 w-8 rounded-md' };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', label, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        ICON_SIZES[size],
        'inline-flex items-center justify-center p-0',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

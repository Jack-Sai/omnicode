import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/* 所有输入控件共享一套边框 / 聚焦态，保证视觉一致 */
const FIELD_BASE =
  'w-full rounded-md border border-line bg-surface text-fg ' +
  'placeholder:text-fg-muted transition-[border-color,box-shadow] duration-150 ' +
  'outline-none focus:border-accent focus:shadow-[var(--shadow-focus)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const SIZES = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
};

type FieldSize = keyof typeof SIZES;

/* ---------------- Field：label + 控件 + 提示 ---------------- */
export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-fg-secondary">{label}</label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------- Input ---------------- */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: FieldSize;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = 'md', leadingIcon, className, ...props },
  ref
) {
  const input = (
    <input
      ref={ref}
      className={cn(FIELD_BASE, SIZES[inputSize], leadingIcon && 'pl-9', className)}
      {...props}
    />
  );

  if (!leadingIcon) return input;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">
        {leadingIcon}
      </span>
      {input}
    </div>
  );
});

/* ---------------- Textarea ---------------- */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { mono, className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(FIELD_BASE, 'resize-none px-3 py-2 text-sm', mono && 'font-mono text-xs', className)}
      {...props}
    />
  );
});

/* ---------------- Select ---------------- */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: FieldSize;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { selectSize = 'md', className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        FIELD_BASE,
        SIZES[selectSize],
        'cursor-pointer appearance-none bg-[length:14px] bg-[right_0.6rem_center] bg-no-repeat pr-8',
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a909b' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

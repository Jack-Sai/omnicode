import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { IconButton } from './Button';

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: keyof typeof WIDTHS;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'md',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] flex-col',
            '-translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface',
            'shadow-lg focus:outline-none data-[state=open]:animate-scale-in',
            WIDTHS[width]
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-fg">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-xs text-fg-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="关闭" size="sm" className="-mr-1 -mt-0.5">
                <X size={15} />
              </IconButton>
            </Dialog.Close>
          </div>

          {children && <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>}

          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

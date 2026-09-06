import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并 className，后写的 Tailwind 工具类会正确覆盖先写的 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatTime = (value: string) => new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(value));
export const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const initials = (name?: string) => (name || '?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();

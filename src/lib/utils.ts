import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PostStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date into a clean editorial format with exact time.
 * e.g., "Oct 16, 2026 • 02:06 PM"
 */
export function formatExactDateTime(dateString?: string, timeZone: string = 'Asia/Kolkata'): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);

    const formattedTime = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);

    const tzAbbr = timeZone === 'Asia/Kolkata' ? 'IST' : timeZone;
    return `${formattedDate} • ${formattedTime} ${tzAbbr}`;
  } catch {
    return dateString;
  }
}

/**
 * Calculates human-readable relative time or countdown.
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return '';
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    // Future
    if (diffMs > 0) {
      if (diffMin < 1) return 'in moments';
      if (diffMin === 1) return 'in 1 minute';
      if (diffMin < 60) return `in ${diffMin} minutes`;
      if (diffHour === 1) return 'in 1 hour';
      if (diffHour < 24) return `in ${diffHour} hours`;
      if (diffDay === 1) return 'tomorrow';
      if (diffDay < 30) return `in ${diffDay} days`;
      return `in ${Math.round(diffDay / 30)} months`;
    }

    // Past
    const absMin = Math.abs(diffMin);
    const absHour = Math.abs(diffHour);
    const absDay = Math.abs(diffDay);

    if (absMin < 1) return 'just now';
    if (absMin === 1) return '1 minute ago';
    if (absMin < 60) return `${absMin}m ago`;
    if (absHour === 1) return '1h ago';
    if (absHour < 24) return `${absHour}h ago`;
    if (absDay === 1) return 'yesterday';
    if (absDay < 30) return `${absDay}d ago`;
    return `${Math.round(absDay / 30)}mo ago`;
  } catch {
    return '';
  }
}

export interface StatusMeta {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  description: string;
  timeLabel: string;
}

export function getStatusMeta(status: PostStatus): StatusMeta {
  switch (status) {
    case 'scheduled':
      return {
        label: 'Scheduled',
        badgeBg: 'bg-zinc-900/80',
        badgeBorder: 'border-zinc-700/60',
        badgeText: 'text-zinc-200',
        dotColor: 'bg-zinc-400',
        description: 'Queued for automatic publication at intended time',
        timeLabel: 'Scheduled For',
      };
    case 'publishing':
      return {
        label: 'Publishing',
        badgeBg: 'bg-zinc-900/90',
        badgeBorder: 'border-white/40',
        badgeText: 'text-white font-medium',
        dotColor: 'bg-white animate-ping',
        description: 'Currently dispatching to Meta Threads API',
        timeLabel: 'Triggered At',
      };
    case 'published':
      return {
        label: 'Published',
        badgeBg: 'bg-white/[0.08]',
        badgeBorder: 'border-white/20',
        badgeText: 'text-white',
        dotColor: 'bg-white',
        description: 'Successfully live on Meta Threads',
        timeLabel: 'Published At',
      };
    case 'failed':
      return {
        label: 'Failed',
        badgeBg: 'bg-zinc-900/80',
        badgeBorder: 'border-zinc-600/80',
        badgeText: 'text-zinc-300',
        dotColor: 'bg-zinc-500',
        description: 'Publishing encountered an error',
        timeLabel: 'Attempted At',
      };
    case 'draft':
      return {
        label: 'Draft',
        badgeBg: 'bg-zinc-950/60',
        badgeBorder: 'border-zinc-800',
        badgeText: 'text-zinc-400',
        dotColor: 'bg-zinc-600',
        description: 'Saved draft in review',
        timeLabel: 'Created At',
      };
    default:
      return {
        label: status,
        badgeBg: 'bg-zinc-900',
        badgeBorder: 'border-zinc-800',
        badgeText: 'text-zinc-300',
        dotColor: 'bg-zinc-500',
        description: '',
        timeLabel: 'Timestamp',
      };
  }
}

/**
 * Extracts first non-empty line as the hook.
 */
export function extractFirstLine(text?: string): string {
  if (!text) return '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[0] || '';
}

/**
 * Copies text to clipboard safely.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

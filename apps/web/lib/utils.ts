import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string): string {
  const localeMap: Record<string, string> = {
    AED: 'en-AE',
    INR: 'en-IN',
    USD: 'en-US',
  }
  return new Intl.NumberFormat(localeMap[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function generateSubdomain(storeName: string): string {
  return storeName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function intentScoreLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: 'High Intent', color: 'text-emerald-600' }
  if (score >= 0.5) return { label: 'Medium Intent', color: 'text-amber-600' }
  return { label: 'Low Intent', color: 'text-slate-500' }
}

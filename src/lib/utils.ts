import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\+91\s?)(\d{2})(\d{5})(\d{3})/, '$1$2•••••$4')
}

export function maskAccount(account: string): string {
  return '•'.repeat(account.length - 4) + account.slice(-4)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function generateId(prefix = 'ID'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

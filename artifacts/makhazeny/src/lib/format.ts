import type { Lang } from './i18n'

export function getLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-EG' : 'en-GB'
}

export function formatCurrency(value: number | string, lang: Lang): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat(getLocale(lang), {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(getLocale(lang), { maximumFractionDigits: 0 }).format(value)
}

export function formatDate(
  date: Date | string,
  lang: Lang,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const defaults: Intl.DateTimeFormatOptions =
    lang === 'ar'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return d.toLocaleDateString(getLocale(lang), options ?? defaults)
}

export function formatTime(date: Date | string, lang: Lang): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(getLocale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang !== 'ar',
  })
}

export function formatDateTime(date: Date | string, lang: Lang): string {
  return `${formatDate(date, lang)} ${formatTime(date, lang)}`
}

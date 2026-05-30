'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

export function LiveClock() {
  const locale = useLocale()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!now) {
    return (
      <div className="hidden h-9 w-40 animate-pulse rounded-md bg-muted sm:block" aria-hidden />
    )
  }

  const intlLocale = locale === 'ar' ? 'ar-EG' : 'en-GB'
  const time = now.toLocaleTimeString(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const date = now.toLocaleDateString(intlLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="hidden flex-col items-end text-end sm:flex">
      <time
        dateTime={now.toISOString()}
        className="font-mono text-sm font-semibold tabular-nums tracking-tight text-foreground"
      >
        {time}
      </time>
      <span className="text-xs text-muted-foreground">{date}</span>
    </div>
  )
}

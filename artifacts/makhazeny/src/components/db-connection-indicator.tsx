import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type DbStatus = 'connected' | 'disconnected' | 'checking'

export function DbConnectionIndicator() {
  const [status, setStatus] = useState<DbStatus>('checking')
  const { t } = useLanguage()

  useEffect(() => {
    let active = true

    async function check() {
      try {
        const res = await apiFetch('/api/healthz')
        if (!active) return
        if (!res.ok) {
          setStatus('disconnected')
          return
        }
        const data = await res.json()
        setStatus(data.database === 'connected' ? 'connected' : 'disconnected')
      } catch {
        if (active) setStatus('disconnected')
      }
    }

    check()
    const id = setInterval(check, 10_000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const isConnected = status === 'connected'
  const label =
    status === 'checking'
      ? t('Checking database...')
      : isConnected
        ? t('Database connected')
        : t('Database disconnected')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 shadow-sm"
            role="status"
            aria-label={label}
          >
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-colors duration-300',
                status === 'checking' && 'animate-pulse bg-amber-400',
                status === 'connected' && 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
                status === 'disconnected' && 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
              )}
            />
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
              {t('DB')}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

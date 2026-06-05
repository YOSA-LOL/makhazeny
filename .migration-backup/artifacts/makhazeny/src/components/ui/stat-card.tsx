import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { statToneClasses, type StatTone } from '@/lib/status-styles'

interface StatCardProps {
  label: string
  value: React.ReactNode
  subtitle?: string
  icon?: LucideIcon
  tone?: StatTone
  className?: string
  badge?: React.ReactNode
  trend?: { value: number; label?: string }
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = 'default',
  className,
  badge,
  trend,
}: StatCardProps) {
  const styles = statToneClasses[tone]
  const trendPositive = trend && trend.value > 0
  const trendNeutral = trend && trend.value === 0
  const trendNegative = trend && trend.value < 0

  return (
    <Card
      className={cn(
        'border-l-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        styles.border,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <div className="flex items-center gap-2">
          {badge}
          {Icon ? (
            <div className={cn('rounded-lg p-2', styles.iconBg)}>
              <Icon className={cn('h-4 w-4', styles.icon)} />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className={cn('text-2xl font-bold tracking-tight', styles.value)}>{value}</div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5',
              trendPositive && 'bg-success/10 text-success',
              trendNeutral && 'bg-muted text-muted-foreground',
              trendNegative && 'bg-destructive/10 text-destructive',
            )}>
              {trendPositive && <TrendingUp className="h-3 w-3" />}
              {trendNeutral && <Minus className="h-3 w-3" />}
              {trendNegative && <TrendingDown className="h-3 w-3" />}
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-l-4 border-l-muted shadow-sm', className)}>
      <CardHeader className="pb-2">
        <div className="h-3 bg-muted rounded-full w-1/2 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-8 bg-muted rounded-lg w-3/4 animate-pulse" />
        <div className="h-3 bg-muted rounded-full w-2/3 animate-pulse" />
      </CardContent>
    </Card>
  )
}

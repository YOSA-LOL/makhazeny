import type { LucideIcon } from 'lucide-react'

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
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = 'default',
  className,
  badge,
}: StatCardProps) {
  const styles = statToneClasses[tone]

  return (
    <Card
      className={cn(
        'border-l-4 shadow-sm transition-shadow hover:shadow-md',
        styles.border,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="flex items-center gap-2">
          {badge}
          {Icon ? (
            <div className={cn('rounded-md p-1.5', styles.iconBg)}>
              <Icon className={cn('h-4 w-4', styles.icon)} />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tracking-tight', styles.value)}>{value}</div>
        {subtitle ? (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-l-4 border-l-muted shadow-sm', className)}>
      <CardHeader className="pb-2">
        <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
      </CardContent>
    </Card>
  )
}

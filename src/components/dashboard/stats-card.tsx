import { MessageSquare, Users, TrendingUp, Clock, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconName = 'users' | 'message-square' | 'trending-up' | 'clock'

interface StatsCardProps {
  title: string
  value: string | number
  description: string
  iconName: IconName
  trend?: {
    value: number
    isPositive: boolean
  }
  gradient?: 'purple' | 'blue' | 'green' | 'orange' | 'pink'
  className?: string
}

const gradients = {
  purple: 'from-violet-500 to-purple-600',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-emerald-500 to-teal-500',
  orange: 'from-orange-500 to-amber-500',
  pink: 'from-pink-500 to-rose-500',
}

const icons: Record<IconName, LucideIcon> = {
  'users': Users,
  'message-square': MessageSquare,
  'trending-up': TrendingUp,
  'clock': Clock,
}

export function StatsCard({
  title,
  value,
  description,
  iconName,
  trend,
  gradient = 'purple',
  className,
}: StatsCardProps) {
  const Icon = icons[iconName]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
        'dark:hover:shadow-primary/10',
        className
      )}
    >
      {/* Gradient background on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5',
          'bg-gradient-to-br',
          gradients[gradient]
        )}
      />

      {/* Icon with gradient background */}
      <div
        className={cn(
          'mb-4 inline-flex items-center justify-center rounded-lg p-2.5',
          'bg-gradient-to-br shadow-lg',
          gradients[gradient]
        )}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>

      {/* Content */}
      <div className="relative">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                trend.isPositive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Decorative corner gradient */}
      <div
        className={cn(
          'absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity duration-300',
          'group-hover:opacity-20',
          'bg-gradient-to-br',
          gradients[gradient]
        )}
      />
    </div>
  )
}

'use client'

import { cn } from '@/lib/utils'

interface BillingPeriodToggleProps {
  value: 'monthly' | 'yearly'
  onChange: (value: 'monthly' | 'yearly') => void
}

export function BillingPeriodToggle({ value, onChange }: BillingPeriodToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'text-sm font-medium transition-colors',
          value === 'monthly' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Ежемесячно
      </button>
      <div
        className="relative h-6 w-11 cursor-pointer rounded-full bg-muted p-0.5"
        onClick={() => onChange(value === 'monthly' ? 'yearly' : 'monthly')}
      >
        <div
          className={cn(
            'h-5 w-5 rounded-full bg-primary transition-transform',
            value === 'yearly' ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
      <button
        onClick={() => onChange('yearly')}
        className={cn(
          'text-sm font-medium transition-colors',
          value === 'yearly' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Ежегодно
        <span className="ml-1 text-xs text-green-600">-20%</span>
      </button>
    </div>
  )
}

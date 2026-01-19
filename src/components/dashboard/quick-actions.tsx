'use client'

import { LucideIcon, MessageSquare, UserPlus, Settings, Zap } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface QuickAction {
  title: string
  description: string
  href: string
  icon: LucideIcon
  gradient: string
}

const actions: QuickAction[] = [
  {
    title: 'Диалоги',
    description: 'Открыть чаты',
    href: '/conversations',
    icon: MessageSquare,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    title: 'Новый лид',
    description: 'Добавить клиента',
    href: '/crm',
    icon: UserPlus,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Интеграции',
    description: 'Подключить бота',
    href: '/settings/integrations',
    icon: Zap,
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    title: 'Настройки',
    description: 'Параметры',
    href: '/settings',
    icon: Settings,
    gradient: 'from-slate-500 to-slate-600',
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className={cn(
            'group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-300',
            'hover:shadow-lg hover:-translate-y-1',
            'dark:hover:shadow-primary/5'
          )}
        >
          {/* Gradient background on hover */}
          <div
            className={cn(
              'absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10',
              'bg-gradient-to-br',
              action.gradient
            )}
          />

          <div className="relative flex flex-col items-center text-center">
            <div
              className={cn(
                'mb-3 inline-flex items-center justify-center rounded-xl p-3',
                'bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110',
                action.gradient
              )}
            >
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-medium">{action.title}</h3>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

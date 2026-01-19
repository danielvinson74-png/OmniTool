'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, User, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ActivityItem {
  id: string
  type: 'conversation' | 'lead'
  title: string
  description: string
  time: string
  unread?: number
}

interface ActivityCardProps {
  title: string
  description: string
  items: ActivityItem[]
  emptyMessage: string
  viewAllHref: string
}

export function ActivityCard({
  title,
  description,
  items,
  emptyMessage,
  viewAllHref,
}: ActivityCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Все
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'group flex items-center gap-4 rounded-lg p-3 transition-colors',
                  'hover:bg-muted/50 cursor-pointer',
                  'animate-in fade-in slide-in-from-left-2',
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    item.type === 'conversation'
                      ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  )}
                >
                  {item.type === 'conversation' ? (
                    <MessageSquare className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                  {item.unread && item.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                      {item.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

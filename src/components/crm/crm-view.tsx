'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { LayoutList, LayoutGrid, Phone, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

const statusConfig: Record<string, { label: string; color: string; badge: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new:         { label: 'Новый',          color: 'border-blue-500/40 bg-blue-500/5',    badge: 'default' },
  contacted:   { label: 'Связались',      color: 'border-yellow-500/40 bg-yellow-500/5', badge: 'secondary' },
  qualified:   { label: 'Квалифицирован', color: 'border-purple-500/40 bg-purple-500/5', badge: 'secondary' },
  negotiation: { label: 'Переговоры',     color: 'border-orange-500/40 bg-orange-500/5', badge: 'outline' },
  won:         { label: 'Выиграно',       color: 'border-green-500/40 bg-green-500/5',  badge: 'default' },
  lost:        { label: 'Потеряно',       color: 'border-red-500/40 bg-red-500/5',      badge: 'destructive' },
}

const statusOrder = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { leads: any[] }

export function CrmView({ leads }: Props) {
  const [view, setView] = useState<'list' | 'kanban'>('list')

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{leads.length} лидов в базе</p>
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView('list')}
          >
            <LayoutList className="h-4 w-4 mr-1" />
            Список
          </Button>
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Канбан
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Контакт</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Добавлен</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link href={`/crm/${lead.id}`} className="font-medium hover:underline">
                        {lead.name || lead.username || 'Без имени'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {lead.phone && <div>{lead.phone}</div>}
                        {lead.username && <div className="text-muted-foreground">@{lead.username}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[lead.status]?.badge || 'default'}>
                        {statusConfig[lead.status]?.label || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{lead.source || '—'}</TableCell>
                    <TableCell>{lead.city || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ru })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {statusOrder.map((status) => {
              const config = statusConfig[status]
              const columnLeads = leads.filter((l) => l.status === status)
              return (
                <div key={status} className="w-64 flex-shrink-0">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{config.label}</span>
                    <Badge variant="secondary" className="text-xs">{columnLeads.length}</Badge>
                  </div>
                  <div className={`min-h-[200px] rounded-lg border-2 ${config.color} p-2 space-y-2`}>
                    {columnLeads.map((lead) => (
                      <Link key={lead.id} href={`/crm/${lead.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-3 space-y-2">
                            <p className="text-sm font-medium leading-tight">
                              {lead.name || lead.username || 'Без имени'}
                            </p>
                            <div className="space-y-1">
                              {lead.phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </div>
                              )}
                              {lead.username && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MessageCircle className="h-3 w-3" />
                                  @{lead.username}
                                </div>
                              )}
                            </div>
                            {lead.source && (
                              <Badge variant="outline" className="text-xs capitalize">{lead.source}</Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ru })}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {columnLeads.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Нет лидов</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

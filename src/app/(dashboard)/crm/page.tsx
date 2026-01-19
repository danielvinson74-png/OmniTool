import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export const metadata = {
  title: 'CRM | OmniTool',
  description: 'Управление клиентами',
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Новый', variant: 'default' },
  contacted: { label: 'Связались', variant: 'secondary' },
  qualified: { label: 'Квалифицирован', variant: 'secondary' },
  negotiation: { label: 'Переговоры', variant: 'outline' },
  won: { label: 'Выиграно', variant: 'default' },
  lost: { label: 'Потеряно', variant: 'destructive' },
}

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any
  const orgId = profile?.current_organization_id || ''

  const { data: leadsData } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads = leadsData as any[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">
            Управляйте своими клиентами и лидами
          </p>
        </div>
      </div>

      {leads && leads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Все лиды</CardTitle>
            <CardDescription>
              {leads.length} лидов в базе
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
                      <Link
                        href={`/crm/${lead.id}`}
                        className="font-medium hover:underline"
                      >
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
                      <Badge variant={statusLabels[lead.status]?.variant || 'default'}>
                        {statusLabels[lead.status]?.label || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{lead.source}</TableCell>
                    <TableCell>{lead.city || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Нет лидов</CardTitle>
            <CardDescription>
              Лиды появятся автоматически, когда клиенты напишут вашему боту
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link
              href="/settings/integrations"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Подключить Telegram
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

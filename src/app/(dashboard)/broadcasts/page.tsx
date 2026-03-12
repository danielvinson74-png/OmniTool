import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Send } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export const metadata = {
  title: 'Рассылки | OmniTool',
  description: 'Управление рассылками',
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:     { label: 'Черновик',   variant: 'outline' },
  scheduled: { label: 'Запланирована', variant: 'secondary' },
  sending:   { label: 'Отправляется', variant: 'default' },
  sent:      { label: 'Отправлена', variant: 'default' },
  cancelled: { label: 'Отменена',   variant: 'destructive' },
}

const messengerLabels: Record<string, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

export default async function BroadcastsPage() {
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

  const { data: broadcastsData } = await supabase
    .from('broadcasts')
    .select('*, broadcast_steps(count)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcasts = (broadcastsData as any[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Рассылки</h1>
          <p className="text-muted-foreground">Отправляйте сообщения группам контактов</p>
        </div>
        <Button asChild>
          <Link href="/broadcasts/new">
            <Send className="mr-2 h-4 w-4" />
            Создать рассылку
          </Link>
        </Button>
      </div>

      {broadcasts.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Мессенджер</TableHead>
                <TableHead className="text-right">Аудитория</TableHead>
                <TableHead className="text-right">Отправлено</TableHead>
                <TableHead className="text-right">Ошибки</TableHead>
                <TableHead className="text-right">Ответы</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((broadcast) => {
                const status = statusLabels[broadcast.status] ?? { label: broadcast.status, variant: 'outline' as const }
                const date = broadcast.scheduled_at || broadcast.created_at
                return (
                  <TableRow key={broadcast.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/broadcasts/${broadcast.id}`} className="font-medium hover:underline">
                        {broadcast.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {broadcast.messenger_type ? messengerLabels[broadcast.messenger_type] : 'Все'}
                    </TableCell>
                    <TableCell className="text-right">{broadcast.stats_total || '—'}</TableCell>
                    <TableCell className="text-right text-green-600">{broadcast.stats_sent || '—'}</TableCell>
                    <TableCell className="text-right text-red-500">{broadcast.stats_failed || '—'}</TableCell>
                    <TableCell className="text-right">{broadcast.stats_replied || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(date), 'd MMM yyyy', { locale: ru })}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Нет рассылок</CardTitle>
            <CardDescription>
              Создайте первую рассылку и отправьте сообщения своим контактам
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/broadcasts/new">Создать рассылку</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

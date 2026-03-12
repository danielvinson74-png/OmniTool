import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BroadcastActions } from '@/components/broadcasts/broadcast-actions'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:     { label: 'Черновик',      variant: 'outline' },
  scheduled: { label: 'Запланирована', variant: 'secondary' },
  sending:   { label: 'Отправляется',  variant: 'default' },
  sent:      { label: 'Отправлена',    variant: 'default' },
  cancelled: { label: 'Отменена',      variant: 'destructive' },
}

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
  const orgId = profile?.current_organization_id

  const { data: broadcastData } = await supabase
    .from('broadcasts')
    .select('*, broadcast_steps(*)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!broadcastData) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcast = broadcastData as any

  // Per-step stats
  const { data: recipientStats } = await supabase
    .from('broadcast_recipients')
    .select('step_id, status, has_replied')
    .eq('broadcast_id', id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepStats: Record<string, any> = {}
  for (const r of recipientStats ?? []) {
    if (!stepStats[r.step_id]) {
      stepStats[r.step_id] = { sent: 0, failed: 0, pending: 0, skipped: 0, replied: 0 }
    }
    stepStats[r.step_id][r.status] = (stepStats[r.step_id][r.status] ?? 0) + 1
    if (r.has_replied) stepStats[r.step_id].replied++
  }

  const steps = [...(broadcast.broadcast_steps ?? [])].sort(
    (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
  )

  const status = statusLabels[broadcast.status] ?? { label: broadcast.status, variant: 'outline' as const }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{broadcast.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Создана {format(new Date(broadcast.created_at), 'd MMM yyyy', { locale: ru })}
            {broadcast.completed_at && (
              <> · Завершена {format(new Date(broadcast.completed_at), 'd MMM yyyy', { locale: ru })}</>
            )}
          </p>
        </div>
        <BroadcastActions broadcastId={id} status={broadcast.status} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Аудитория</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{broadcast.stats_total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Отправлено</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{broadcast.stats_sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ошибки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{broadcast.stats_failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ответили</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{broadcast.stats_replied}</p>
          </CardContent>
        </Card>
      </div>

      {/* Steps breakdown */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Статистика по шагам</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Шаг</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead>Задержка</TableHead>
                <TableHead className="text-right">Отправлено</TableHead>
                <TableHead className="text-right">Ошибки</TableHead>
                <TableHead className="text-right">Ожидает</TableHead>
                <TableHead className="text-right">Ответили</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step: { id: string; step_order: number; message_text: string; delay_days: number }) => {
                const stats = stepStats[step.id] ?? { sent: 0, failed: 0, pending: 0, replied: 0 }
                return (
                  <TableRow key={step.id}>
                    <TableCell className="font-medium">{step.step_order + 1}</TableCell>
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-2 text-sm">{step.message_text}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {step.delay_days === 0 ? 'Сразу' : `+${step.delay_days} дн.`}
                    </TableCell>
                    <TableCell className="text-right text-green-600">{stats.sent}</TableCell>
                    <TableCell className="text-right text-red-500">{stats.failed}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{stats.pending}</TableCell>
                    <TableCell className="text-right">{stats.replied}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

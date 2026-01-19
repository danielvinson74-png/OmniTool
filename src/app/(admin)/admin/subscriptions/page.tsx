import { createAdminClient } from '@/lib/supabase/admin'
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
import { SubscriptionActions } from '@/components/admin/subscription-actions'

export const metadata = {
  title: 'Подписки | Админ-панель',
  description: 'Управление подписками',
}

export default async function AdminSubscriptionsPage() {
  const supabase = createAdminClient()

  // Get all subscriptions with organization and plan info
  const { data: subscriptionsData } = await supabase
    .from('subscriptions')
    .select(`
      *,
      organizations(id, name),
      subscription_plans(id, name, slug, max_conversations)
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptions = subscriptionsData as any[]

  // Get all plans for dropdown
  const { data: plansData } = await supabase
    .from('subscription_plans')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans = plansData as any[]

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Активна', variant: 'default' },
    canceled: { label: 'Отменена', variant: 'secondary' },
    past_due: { label: 'Просрочена', variant: 'destructive' },
    trialing: { label: 'Пробный период', variant: 'outline' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Подписки</h1>
        <p className="text-muted-foreground">
          Управление подписками организаций
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все подписки</CardTitle>
          <CardDescription>
            {subscriptions?.length || 0} подписок в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Организация</TableHead>
                <TableHead>План</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Лимит диалогов</TableHead>
                <TableHead>Действует до</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.map((sub) => {
                const status = statusLabels[sub.status] || { label: sub.status, variant: 'outline' as const }

                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.organizations?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.subscription_plans?.slug === 'free' ? 'secondary' : 'default'}>
                        {sub.subscription_plans?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.subscription_plans?.max_conversations === -1
                        ? 'Безлимит'
                        : sub.subscription_plans?.max_conversations || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <SubscriptionActions
                        subscriptionId={sub.id}
                        currentPlanId={sub.plan_id}
                        plans={plans}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!subscriptions || subscriptions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет подписок
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

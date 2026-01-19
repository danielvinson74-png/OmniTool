import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Статистика | Админ-панель',
  description: 'Системная статистика',
}

export default async function AdminStatsPage() {
  const supabase = createAdminClient()

  // Get various stats
  const [
    { count: totalUsers },
    { count: totalOrgs },
    { count: totalConversations },
    { count: totalMessages },
    { count: totalLeads },
    { count: telegramConnections }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('messenger_connections').select('*', { count: 'exact', head: true }).eq('is_active', true)
  ])

  // Get subscription distribution
  const { data: subDistData } = await supabase
    .from('subscriptions')
    .select('subscription_plans(name, slug)')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subDist = subDistData as any[]
  const planCounts: Record<string, number> = {}
  subDist?.forEach(sub => {
    const planName = sub.subscription_plans?.name || 'Unknown'
    planCounts[planName] = (planCounts[planName] || 0) + 1
  })

  // Get users registered in last 7 days
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { count: newUsersWeek } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())

  // Get conversations in last 7 days
  const { count: newConvsWeek } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())

  // Get messages in last 7 days
  const { count: newMsgsWeek } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Статистика</h1>
        <p className="text-muted-foreground">
          Общая статистика системы
        </p>
      </div>

      {/* Overall stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{newUsersWeek || 0} за последние 7 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего организаций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrgs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активных интеграций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{telegramConnections || 0}</div>
            <p className="text-xs text-muted-foreground">Telegram ботов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего диалогов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{newConvsWeek || 0} за последние 7 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего сообщений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{newMsgsWeek || 0} за последние 7 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Распределение по планам</CardTitle>
          <CardDescription>Количество подписок на каждом тарифе</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(planCounts).length > 0 ? (
              Object.entries(planCounts).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={plan === 'Free' ? 'secondary' : 'default'}>
                      {plan}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min((count / (totalOrgs || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {count} ({((count / (totalOrgs || 1)) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Нет данных о подписках</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

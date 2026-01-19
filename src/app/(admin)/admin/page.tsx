import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, MessageSquare, CreditCard } from 'lucide-react'

export const metadata = {
  title: 'Админ-панель | OmniTool',
  description: 'Управление системой',
}

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  // Get counts
  const [
    { count: usersCount },
    { count: orgsCount },
    { count: conversationsCount },
    { count: subscriptionsCount }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).neq('plan_id', null)
  ])

  // Get recent users
  const { data: recentUsersData } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentUsers = recentUsersData as any[]

  // Get subscription stats by plan
  const { data: subStatsData } = await supabase
    .from('subscriptions')
    .select('plan_id, subscription_plans(name, slug)')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subStats = subStatsData as any[]

  const planCounts: Record<string, number> = {}
  subStats?.forEach(sub => {
    const planName = sub.subscription_plans?.name || 'Unknown'
    planCounts[planName] = (planCounts[planName] || 0) + 1
  })

  const stats = [
    {
      title: 'Пользователи',
      value: usersCount || 0,
      icon: Users,
      description: 'Всего зарегистрировано'
    },
    {
      title: 'Организации',
      value: orgsCount || 0,
      icon: Building2,
      description: 'Активных организаций'
    },
    {
      title: 'Диалоги',
      value: conversationsCount || 0,
      icon: MessageSquare,
      description: 'Всего диалогов'
    },
    {
      title: 'Подписки',
      value: subscriptionsCount || 0,
      icon: CreditCard,
      description: 'Активных подписок'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Админ-панель</h1>
        <p className="text-muted-foreground">
          Обзор системы и управление пользователями
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent users */}
        <Card>
          <CardHeader>
            <CardTitle>Новые пользователи</CardTitle>
            <CardDescription>Последние зарегистрированные</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers && recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.full_name || 'Без имени'}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Нет пользователей</p>
            )}
          </CardContent>
        </Card>

        {/* Subscription stats */}
        <Card>
          <CardHeader>
            <CardTitle>Подписки по планам</CardTitle>
            <CardDescription>Распределение пользователей</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(planCounts).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(planCounts).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <p className="font-medium">{plan}</p>
                    <p className="text-sm text-muted-foreground">{count} подписок</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Нет данных о подписках</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, TrendingUp, Clock } from 'lucide-react'

export const metadata = {
  title: 'Дашборд | OmniTool',
  description: 'Обзор вашей активности',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any

  // Get stats
  const orgId = profile?.current_organization_id as string | undefined

  const [
    { count: leadsCount },
    { count: conversationsCount },
    { count: messagesCount },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId || ''),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId || ''),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('organization_id', orgId || ''),
  ])

  // Get recent conversations
  const { data: recentConversationsData } = await supabase
    .from('conversations')
    .select('id, title, last_message_preview, last_message_at, unread_count')
    .eq('organization_id', orgId || '')
    .order('last_message_at', { ascending: false })
    .limit(5)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentConversations = (recentConversationsData as any[]) || []

  // Get recent leads
  const { data: recentLeadsData } = await supabase
    .from('leads')
    .select('id, name, username, source, created_at')
    .eq('organization_id', orgId || '')
    .order('created_at', { ascending: false })
    .limit(5)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentLeads = (recentLeadsData as any[]) || []

  const stats = [
    {
      title: 'Всего лидов',
      value: leadsCount || 0,
      description: 'Клиентов в базе',
      icon: Users,
    },
    {
      title: 'Диалогов',
      value: conversationsCount || 0,
      description: 'Активных чатов',
      icon: MessageSquare,
    },
    {
      title: 'Сообщений',
      value: messagesCount || 0,
      description: 'Всего сообщений',
      icon: TrendingUp,
    },
    {
      title: 'Время ответа',
      value: '< 5 мин',
      description: 'Среднее время',
      icon: Clock,
    },
  ]

  // Format time helper
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин`
    if (diffHours < 24) return `${diffHours} ч`
    return `${diffDays} д`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Привет, {profile?.full_name?.split(' ')[0] || 'пользователь'}!
        </h1>
        <p className="text-muted-foreground">
          Вот обзор вашей активности
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Последние диалоги</CardTitle>
            <CardDescription>Недавние сообщения</CardDescription>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет активных диалогов</p>
            ) : (
              <div className="space-y-4">
                {recentConversations.map((conv) => (
                  <div key={conv.id} className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {conv.title || 'Без имени'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {conv.last_message_preview || 'Нет сообщений'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Новые лиды</CardTitle>
            <CardDescription>Последние клиенты</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет новых лидов</p>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                      <Users className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {lead.name || lead.username || 'Без имени'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Источник: {lead.source || 'неизвестно'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(lead.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

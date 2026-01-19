import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Диалоги | OmniTool',
  description: 'Все ваши диалоги из мессенджеров',
}

export default async function ConversationsPage() {
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

  const { data: conversationsData } = await supabase
    .from('conversations')
    .select(`
      *,
      leads(name, username)
    `)
    .eq('organization_id', orgId)
    .order('last_message_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversations = conversationsData as any[]

  const hasConnections = await supabase
    .from('messenger_connections')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_active', true)

  if (!hasConnections.count) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Диалоги</h1>
          <p className="text-muted-foreground">
            Все ваши переписки из мессенджеров в одном месте
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Мессенджеры не подключены</CardTitle>
            <CardDescription>
              Подключите Telegram бота, чтобы начать получать сообщения
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Диалоги</h1>
        <p className="text-muted-foreground">
          Все ваши переписки из мессенджеров в одном месте
        </p>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conversation.leads?.name || conversation.leads?.username || 'Без имени'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message_preview || 'Нет сообщений'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Нет диалогов</CardTitle>
            <CardDescription>
              Диалоги появятся, когда клиенты начнут писать вашему боту
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

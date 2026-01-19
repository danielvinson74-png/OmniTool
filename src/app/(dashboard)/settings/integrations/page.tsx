import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Phone, CheckCircle2, XCircle } from 'lucide-react'
import { TelegramConnectForm } from '@/components/telegram/connect-form'
import { WhatsAppConnectForm } from '@/components/whatsapp/connect-form'

export const metadata = {
  title: 'Интеграции | OmniTool',
  description: 'Подключение мессенджеров',
}

const messengers = [
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Подключите Telegram бота для получения сообщений',
    icon: MessageCircle,
    available: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Подключение через QR-код',
    icon: Phone,
    available: true,
  },
  {
    id: 'vk',
    name: 'ВКонтакте',
    description: 'Сообщения из сообщества ВКонтакте',
    icon: MessageCircle,
    available: false,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Direct сообщения из Instagram',
    icon: MessageCircle,
    available: false,
  },
]

export default async function IntegrationsPage() {
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

  const { data: connectionsData } = await supabase
    .from('messenger_connections')
    .select('*')
    .eq('organization_id', orgId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connections = (connectionsData || []) as any[]

  const getConnection = (messengerId: string) => {
    return connections.find(c => c.messenger_type === messengerId)
  }

  const isConnected = (messengerId: string) => {
    const conn = getConnection(messengerId)
    return conn?.is_active === true
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground">
          Подключайте мессенджеры для получения сообщений
        </p>
      </div>

      <div className="space-y-4">
        {/* Telegram */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Telegram</CardTitle>
                  <CardDescription className="hidden sm:block">Подключите Telegram бота для получения сообщений</CardDescription>
                </div>
              </div>
              {isConnected('telegram') ? (
                <Badge variant="default" className="bg-green-500 w-fit">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Подключено
                </Badge>
              ) : (
                <Badge variant="outline" className="w-fit">
                  <XCircle className="mr-1 h-3 w-3" />
                  Не подключено
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TelegramConnectForm
              isConnected={isConnected('telegram')}
              botUsername={(getConnection('telegram')?.credentials as { bot_username?: string })?.bot_username}
            />
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <WhatsAppConnectForm
          initialConnection={getConnection('whatsapp')}
        />

        {/* Coming soon integrations */}
        <div className="grid gap-4 md:grid-cols-2">
          {messengers.filter(m => !m.available).map((messenger) => (
            <Card key={messenger.id} className="opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <messenger.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{messenger.name}</CardTitle>
                      <CardDescription>{messenger.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">Скоро</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Интеграция будет доступна в ближайшее время
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

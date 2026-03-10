import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageCircle, Phone, Mail, User, MapPin, Calendar, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LeadStatusSelect } from '@/components/crm/lead-status-select'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('leads').select('name, username').eq('id', id).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = data as any
  return {
    title: lead?.name ? `${lead.name} | CRM | OmniTool` : 'Клиент | CRM | OmniTool',
  }
}

const messengerLabels: Record<string, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  vk: 'ВКонтакте',
  instagram: 'Instagram',
}

export default async function LeadPage({ params }: Props) {
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
  if (!profile?.current_organization_id) return null

  const { data: leadData } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('organization_id', profile.current_organization_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = leadData as any
  if (!lead) notFound()

  const { data: conversationsData } = await supabase
    .from('conversations')
    .select('id, title, messenger_type, last_message_preview, last_message_at, status, unread_count')
    .eq('lead_id', id)
    .eq('organization_id', profile.current_organization_id)
    .order('last_message_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversations = (conversationsData as any[]) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {lead.name || lead.username || 'Без имени'}
          </h1>
          <p className="text-muted-foreground">Карточка клиента</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Lead info */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Статус</span>
                <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
              </div>

              {/* Name */}
              {lead.name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{lead.name}</span>
                </div>
              )}

              {/* Username */}
              {lead.username && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">@{lead.username}</span>
                </div>
              )}

              {/* Phone */}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
              )}

              {/* Email */}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{lead.email}</span>
                </div>
              )}

              {/* City */}
              {lead.city && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{lead.city}</span>
                </div>
              )}

              {/* Created */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.created_at), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Source */}
          {lead.source && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Источник</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="capitalize">{lead.source}</Badge>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Заметки</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Conversations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Диалоги</CardTitle>
              <CardDescription>
                {conversations.length > 0
                  ? `${conversations.length} диалог${conversations.length === 1 ? '' : conversations.length < 5 ? 'а' : 'ов'}`
                  : 'Нет диалогов'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Диалоги появятся когда клиент напишет через мессенджер
                </p>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <Link key={conv.id} href={`/conversations/${conv.id}`}>
                      <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <MessageCircle className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {conv.title || messengerLabels[conv.messenger_type] || conv.messenger_type}
                              </p>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {messengerLabels[conv.messenger_type] || conv.messenger_type}
                              </Badge>
                              {conv.unread_count > 0 && (
                                <Badge className="text-xs shrink-0 bg-primary">
                                  {conv.unread_count}
                                </Badge>
                              )}
                            </div>
                            {conv.last_message_preview && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {conv.last_message_preview}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {conv.last_message_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.last_message_at), {
                                addSuffix: true,
                                locale: ru,
                              })}
                            </span>
                          )}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

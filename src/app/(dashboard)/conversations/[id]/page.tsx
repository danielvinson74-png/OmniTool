import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ChatWindow } from '@/components/conversations/chat-window'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: conversationData } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = conversationData as any

  return {
    title: conversation?.title ? `${conversation.title} | OmniTool` : 'Диалог | OmniTool',
  }
}

export default async function ConversationPage({ params }: Props) {
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

  // Get conversation with lead info
  const { data: conversationData } = await supabase
    .from('conversations')
    .select(`
      *,
      leads(id, name, username, phone, email, status)
    `)
    .eq('id', id)
    .eq('organization_id', profile.current_organization_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = conversationData as any

  if (!conversation) {
    notFound()
  }

  // Get messages
  const { data: messagesData } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = messagesData as any[]

  // Mark as read
  if (conversation.unread_count > 0) {
    await supabase
      .from('conversations')
      .update({ unread_count: 0 } as never)
      .eq('id', id)
  }

  return (
    <ChatWindow
      conversation={conversation}
      initialMessages={messages || []}
      currentUserId={user.id}
    />
  )
}

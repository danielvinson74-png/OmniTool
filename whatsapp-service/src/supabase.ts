import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function getMessengerConnection(orgId: string) {
  const { data, error } = await supabase
    .from('messenger_connections')
    .select('*')
    .eq('organization_id', orgId)
    .eq('messenger_type', 'whatsapp')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching connection:', error)
  }

  return data
}

export async function saveMessengerConnection(
  orgId: string,
  credentials: Record<string, unknown>,
  isActive: boolean = true
) {
  const existing = await getMessengerConnection(orgId)

  if (existing) {
    const { error } = await supabase
      .from('messenger_connections')
      .update({
        credentials,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating connection:', error)
      throw error
    }
  } else {
    const { error } = await supabase.from('messenger_connections').insert({
      organization_id: orgId,
      messenger_type: 'whatsapp',
      connection_name: 'WhatsApp',
      credentials,
      is_active: isActive,
    })

    if (error) {
      console.error('Error creating connection:', error)
      throw error
    }
  }
}

export async function findOrCreateLead(
  orgId: string,
  phoneNumber: string,
  pushname?: string
) {
  // Remove @c.us suffix
  const cleanPhone = phoneNumber.replace('@c.us', '')

  // Try to find existing lead
  const { data: existingLead } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', orgId)
    .eq('external_id', cleanPhone)
    .eq('external_id_type', 'whatsapp')
    .single()

  if (existingLead) {
    // Update name if provided
    if (pushname && pushname !== existingLead.name) {
      await supabase
        .from('leads')
        .update({ name: pushname, updated_at: new Date().toISOString() })
        .eq('id', existingLead.id)
    }
    return existingLead
  }

  // Create new lead
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      organization_id: orgId,
      external_id: cleanPhone,
      external_id_type: 'whatsapp',
      name: pushname || cleanPhone,
      phone: cleanPhone,
      source: 'whatsapp',
      status: 'new',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    throw error
  }

  return newLead
}

export async function findOrCreateConversation(
  orgId: string,
  leadId: string,
  chatId: string,
  connectionId: string,
  title: string
) {
  // Try to find existing conversation
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('messenger_type', 'whatsapp')
    .eq('external_chat_id', chatId)
    .single()

  if (existingConv) {
    return existingConv
  }

  // Check conversation limit
  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  // Get subscription plan limits
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('subscription_plans(conversations_limit)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .single()

  const limit = (subscription?.subscription_plans as { conversations_limit?: number })?.conversations_limit || 50

  if (limit !== -1 && (count || 0) >= limit) {
    throw new Error(`Conversation limit reached (${limit}). Please upgrade your plan.`)
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      messenger_connection_id: connectionId,
      external_chat_id: chatId,
      messenger_type: 'whatsapp',
      title,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    throw error
  }

  return newConv
}

export async function saveMessage(
  orgId: string,
  conversationId: string,
  content: string,
  senderType: 'lead' | 'user',
  messageType: string,
  externalMessageId: string,
  attachments: unknown[] = [],
  metadata: Record<string, unknown> = {}
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      content,
      sender_type: senderType,
      message_type: messageType,
      external_message_id: externalMessageId,
      status: 'delivered',
      attachments,
      metadata,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving message:', error)
    throw error
  }

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 100),
      unread_count: senderType === 'lead' ? supabase.rpc('increment_unread', { conv_id: conversationId }) : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  return data
}

export async function updateConversationUnread(conversationId: string, increment: boolean) {
  if (increment) {
    // Get current count and increment
    const { data: conv } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .single()

    await supabase
      .from('conversations')
      .update({
        unread_count: (conv?.unread_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  } else {
    await supabase
      .from('conversations')
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  }
}

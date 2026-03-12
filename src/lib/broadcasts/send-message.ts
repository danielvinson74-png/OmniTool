import { SupabaseClient } from '@supabase/supabase-js'
import { createTelegramClient } from '@/lib/telegram/client'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'whatsapp-service-secret-key'

async function sendViaWhatsApp(orgId: string, chatId: string, text: string) {
  const formattedChatId = chatId.endsWith('@c.us') ? chatId : `${chatId}@c.us`

  const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions/${orgId}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_SERVICE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chatId: formattedChatId, message: text }),
  })

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to send WhatsApp message')
  }

  return String(data.messageId)
}

async function sendViaTelegram(botToken: string, chatId: string, text: string) {
  const telegram = createTelegramClient(botToken)
  const result = await telegram.sendMessage(chatId, text)
  return String(result.message_id)
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Shared helper for sending a message to a conversation.
 * Used by both /api/messages/send and the broadcast cron processor.
 *
 * @param supabase - Supabase client (admin client for cron, user client for API)
 * @param orgId    - Organization ID
 * @param conversationId - Conversation to send to
 * @param text     - Message text
 * @param senderId - User ID for operator sends, undefined for broadcast/system sends
 */
export async function sendMessageToConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  orgId: string,
  conversationId: string,
  text: string,
  senderId?: string
): Promise<SendMessageResult> {
  // Fetch conversation with messenger connection
  const { data: conversationData } = await supabase
    .from('conversations')
    .select('*, messenger_connections(*)')
    .eq('id', conversationId)
    .eq('organization_id', orgId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation = conversationData as any

  if (!conversation) {
    return { success: false, error: 'Conversation not found' }
  }

  if (conversation.status === 'spam' || conversation.status === 'archived') {
    return { success: false, error: 'Conversation is not active' }
  }

  const connection = conversation.messenger_connections
  if (!connection || !connection.is_active) {
    return { success: false, error: 'Messenger not connected' }
  }

  const messengerType = conversation.messenger_type
  let externalMessageId: string

  try {
    if (messengerType === 'telegram') {
      const credentials = connection.credentials as { bot_token?: string }
      if (!credentials.bot_token) {
        return { success: false, error: 'Invalid Telegram connection' }
      }
      externalMessageId = await sendViaTelegram(
        credentials.bot_token,
        conversation.external_chat_id,
        text
      )
    } else if (messengerType === 'whatsapp') {
      externalMessageId = await sendViaWhatsApp(orgId, conversation.external_chat_id, text)
    } else {
      return { success: false, error: `Unsupported messenger type: ${messengerType}` }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    }
  }

  // Build metadata
  const metadata: Record<string, unknown> = {}
  if (messengerType === 'telegram') {
    metadata.telegram_message_id = externalMessageId
  } else if (messengerType === 'whatsapp') {
    metadata.whatsapp_message_id = externalMessageId
  }

  // Save message to database
  const { data: savedMessage, error: saveError } = await supabase
    .from('messages')
    .insert({
      organization_id: orgId,
      conversation_id: conversationId,
      external_message_id: externalMessageId,
      message_text: text,
      message_type: 'text',
      sender_type: senderId ? 'user' : 'user',
      sender_id: senderId ?? null,
      status: 'sent',
      metadata,
    } as never)
    .select('id')
    .single()

  if (saveError) {
    console.error('Failed to save message to DB:', saveError)
  }

  // Update conversation last message
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 100),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', conversationId)

  return {
    success: true,
    messageId: savedMessage?.id,
  }
}

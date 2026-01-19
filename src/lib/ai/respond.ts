import { createClient } from '@supabase/supabase-js'
import { generateResponse } from '@/lib/openai/client'
import type { ChatMessage } from '@/lib/openai/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface HandleAIResponseParams {
  organizationId: string
  conversationId: string
  leadId: string
  incomingMessage: string
  messengerType: 'telegram' | 'whatsapp'
  externalChatId: string
}

interface HandleAIResponseResult {
  success: boolean
  replied: boolean
  message?: string
  error?: string
}

export async function handleAIResponse(
  params: HandleAIResponseParams
): Promise<HandleAIResponseResult> {
  const {
    organizationId,
    conversationId,
    incomingMessage,
    messengerType,
    externalChatId,
  } = params

  // Create service role client for server-side operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Get AI settings for organization
    const { data: aiSettingsData, error: settingsError } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (settingsError || !aiSettingsData) {
      return { success: true, replied: false, message: 'AI не настроен' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiSettings = aiSettingsData as any

    // Check if AI is enabled globally
    if (!aiSettings.is_enabled) {
      return { success: true, replied: false, message: 'AI отключён' }
    }

    // Check if API key is set
    if (!aiSettings.api_key) {
      return { success: true, replied: false, message: 'API ключ не настроен' }
    }

    // 2. Check if AI is enabled for this conversation
    const { data: conversationData } = await supabase
      .from('conversations')
      .select('ai_enabled')
      .eq('id', conversationId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversation = conversationData as any

    if (conversation?.ai_enabled === false) {
      return { success: true, replied: false, message: 'AI отключён для диалога' }
    }

    // 3. Get conversation history for context
    const { data: messagesData } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(aiSettings.context_messages_count || 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const historyMessages = (messagesData as any[]) || []

    // Build chat messages in chronological order
    const chatMessages: ChatMessage[] = historyMessages
      .reverse()
      .map((msg) => ({
        role: msg.sender_type === 'lead' ? 'user' : 'assistant',
        content: msg.content,
      })) as ChatMessage[]

    // Add delay before responding (more natural)
    const delay = (aiSettings.auto_reply_delay_seconds || 2) * 1000
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // 4. Generate AI response
    const result = await generateResponse({
      apiKey: aiSettings.api_key,
      model: aiSettings.model || 'gpt-4o-mini',
      systemPrompt: aiSettings.system_prompt || 'Ты вежливый помощник.',
      messages: chatMessages,
      temperature: aiSettings.temperature || 0.7,
      maxTokens: aiSettings.max_tokens || 500,
    })

    if (!result.success || !result.content) {
      console.error('AI generation failed:', result.error)
      return { success: false, replied: false, error: result.error }
    }

    // 5. Send response via messenger
    const sendResult = await sendMessageToMessenger(
      supabase,
      organizationId,
      messengerType,
      externalChatId,
      result.content
    )

    if (!sendResult.success) {
      return { success: false, replied: false, error: sendResult.error }
    }

    // 6. Save AI message to database
    const { error: insertError } = await supabase.from('messages').insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      content: result.content,
      sender_type: 'ai',
      message_type: 'text',
      status: 'sent',
      is_ai_generated: true,
      external_message_id: sendResult.messageId,
      metadata: {
        model: aiSettings.model,
        tokens_used: result.usage?.totalTokens,
      },
    })

    if (insertError) {
      console.error('Failed to save AI message:', insertError)
    }

    // 7. Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: result.content.substring(0, 100),
      } as never)
      .eq('id', conversationId)

    return {
      success: true,
      replied: true,
      message: result.content,
    }
  } catch (error) {
    console.error('AI response handler error:', error)
    return {
      success: false,
      replied: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }
  }
}

async function sendMessageToMessenger(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  organizationId: string,
  messengerType: 'telegram' | 'whatsapp',
  externalChatId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Get messenger connection
  const { data: connectionData } = await supabase
    .from('messenger_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('messenger_type', messengerType)
    .eq('is_active', true)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = connectionData as any

  if (!connection) {
    return { success: false, error: 'Мессенджер не подключён' }
  }

  if (messengerType === 'telegram') {
    return sendTelegramMessage(connection, externalChatId, text)
  } else if (messengerType === 'whatsapp') {
    return sendWhatsAppMessage(organizationId, externalChatId, text)
  }

  return { success: false, error: 'Неизвестный тип мессенджера' }
}

async function sendTelegramMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: any,
  chatId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const botToken = (connection.credentials as { bot_token?: string })?.bot_token

  if (!botToken) {
    return { success: false, error: 'Токен бота не найден' }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      }
    )

    const data = await response.json()

    if (!data.ok) {
      return { success: false, error: data.description }
    }

    return { success: true, messageId: String(data.result.message_id) }
  } catch (error) {
    return { success: false, error: 'Ошибка отправки в Telegram' }
  }
}

async function sendWhatsAppMessage(
  organizationId: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const whatsappServiceUrl =
    process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
  const whatsappSecret =
    process.env.WHATSAPP_SERVICE_SECRET || 'whatsapp-service-secret-key'

  try {
    const response = await fetch(
      `${whatsappServiceUrl}/sessions/${organizationId}/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappSecret}`,
        },
        body: JSON.stringify({
          to: chatId,
          message: text,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Ошибка WhatsApp' }
    }

    return { success: true, messageId: data.messageId }
  } catch (error) {
    return { success: false, error: 'Ошибка отправки в WhatsApp' }
  }
}

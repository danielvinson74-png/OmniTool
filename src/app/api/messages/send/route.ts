import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTelegramClient } from '@/lib/telegram/client'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'whatsapp-service-secret-key'

async function sendWhatsAppMessage(orgId: string, chatId: string, message: string) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions/${orgId}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_SERVICE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chatId, message }),
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to send WhatsApp message')
  }

  return { message_id: data.messageId }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = profileData as any

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const body = await request.json()
    const { conversationId, text } = body

    if (!conversationId || !text) {
      return NextResponse.json({ error: 'conversationId and text are required' }, { status: 400 })
    }

    // Get conversation
    const { data: conversationData } = await supabase
      .from('conversations')
      .select('*, messenger_connections(*)')
      .eq('id', conversationId)
      .eq('organization_id', profile.current_organization_id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversation = conversationData as any

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const connection = conversation.messenger_connections
    if (!connection || !connection.is_active) {
      return NextResponse.json({ error: 'Messenger not connected' }, { status: 400 })
    }

    let sentMessage: { message_id: string | number }
    const messengerType = conversation.messenger_type

    // Send message based on messenger type
    if (messengerType === 'telegram') {
      const credentials = connection.credentials as { bot_token?: string }
      if (!credentials.bot_token) {
        return NextResponse.json({ error: 'Invalid Telegram connection' }, { status: 400 })
      }

      const telegram = createTelegramClient(credentials.bot_token)
      try {
        sentMessage = await telegram.sendMessage(conversation.external_chat_id, text)
      } catch (error) {
        console.error('Telegram send error:', error)
        return NextResponse.json({ error: 'Failed to send Telegram message' }, { status: 500 })
      }
    } else if (messengerType === 'whatsapp') {
      try {
        sentMessage = await sendWhatsAppMessage(
          profile.current_organization_id,
          conversation.external_chat_id,
          text
        )
      } catch (error) {
        console.error('WhatsApp send error:', error)
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Failed to send WhatsApp message'
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: `Unsupported messenger type: ${messengerType}` }, { status: 400 })
    }

    // Prepare metadata based on messenger type
    const metadata: Record<string, unknown> = {}
    if (messengerType === 'telegram') {
      metadata.telegram_message_id = sentMessage.message_id
    } else if (messengerType === 'whatsapp') {
      metadata.whatsapp_message_id = sentMessage.message_id
    }

    // Save message to database
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        organization_id: profile.current_organization_id,
        conversation_id: conversationId,
        external_message_id: String(sentMessage.message_id),
        message_text: text,
        message_type: 'text',
        sender_type: 'user',
        sender_id: user.id,
        status: 'sent',
        metadata
      } as never)
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save message:', saveError)
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: text.slice(0, 100),
        unread_count: 0,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', conversationId)

    return NextResponse.json({
      success: true,
      message: savedMessage
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

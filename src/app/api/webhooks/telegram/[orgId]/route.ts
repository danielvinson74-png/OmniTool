import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TelegramUpdate, TelegramMessage } from '@/lib/telegram/client'
import { handleAIResponse } from '@/lib/ai/respond'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const supabase = createAdminClient()

    // Get connection to verify webhook secret
    const { data: connectionData } = await supabase
      .from('messenger_connections')
      .select('id, credentials')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'telegram')
      .eq('is_active', true)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = connectionData as any

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const credentials = connection.credentials as {
      webhook_secret?: string
      bot_token?: string
    }

    // Verify webhook secret (Telegram sends it in header)
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token')
    if (credentials.webhook_secret && secretToken !== credentials.webhook_secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const update: TelegramUpdate = await request.json()

    // Handle message
    if (update.message) {
      await handleMessage(supabase, orgId, connection.id, update.message)
    }

    // Handle edited message
    if (update.edited_message) {
      await handleMessage(supabase, orgId, connection.id, update.edited_message, true)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

async function handleMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  connectionId: string,
  message: TelegramMessage,
  isEdited = false
) {
  const chatId = message.chat.id
  const fromUser = message.from

  if (!fromUser) return

  // Determine message type and content
  let messageType = 'text'
  let messageText = message.text || ''
  const attachments: unknown[] = []

  if (message.photo) {
    messageType = 'image'
    messageText = message.caption || ''
    const largestPhoto = message.photo[message.photo.length - 1]
    attachments.push({
      type: 'photo',
      file_id: largestPhoto.file_id,
      width: largestPhoto.width,
      height: largestPhoto.height
    })
  } else if (message.document) {
    messageType = 'file'
    messageText = message.caption || ''
    attachments.push({
      type: 'document',
      file_id: message.document.file_id,
      file_name: message.document.file_name,
      mime_type: message.document.mime_type
    })
  } else if (message.audio) {
    messageType = 'audio'
    attachments.push({
      type: 'audio',
      file_id: message.audio.file_id,
      duration: message.audio.duration,
      title: message.audio.title
    })
  } else if (message.video) {
    messageType = 'video'
    messageText = message.caption || ''
    attachments.push({
      type: 'video',
      file_id: message.video.file_id,
      duration: message.video.duration
    })
  } else if (message.voice) {
    messageType = 'audio'
    attachments.push({
      type: 'voice',
      file_id: message.voice.file_id,
      duration: message.voice.duration
    })
  } else if (message.sticker) {
    messageType = 'sticker'
    messageText = message.sticker.emoji || ''
    attachments.push({
      type: 'sticker',
      file_id: message.sticker.file_id,
      emoji: message.sticker.emoji
    })
  } else if (message.location) {
    messageType = 'location'
    messageText = `📍 ${message.location.latitude}, ${message.location.longitude}`
  }

  // Find or create lead
  let lead = await findOrCreateLead(supabase, orgId, fromUser, chatId)

  // Find or create conversation
  let conversation = await findOrCreateConversation(
    supabase,
    orgId,
    connectionId,
    chatId,
    lead?.id,
    fromUser
  )

  // If this is an edited message, we might want to update existing message
  // For now, we'll just add it as a new message with a note
  if (isEdited) {
    messageText = `[изменено] ${messageText}`
  }

  // Create message
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      organization_id: orgId,
      conversation_id: conversation.id,
      tg_id: fromUser.id,
      external_message_id: message.message_id.toString(),
      message_text: messageText,
      message_type: messageType,
      sender_type: 'lead',
      status: 'delivered',
      attachments: attachments.length > 0 ? attachments : [],
      metadata: {
        telegram_message: {
          message_id: message.message_id,
          date: message.date,
          chat_type: message.chat.type
        }
      },
      created_at: new Date(message.date * 1000).toISOString()
    })

  if (messageError) {
    console.error('Failed to create message:', messageError)
    return
  }

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date(message.date * 1000).toISOString(),
      last_message_preview: messageText.slice(0, 100),
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id)

  // Trigger AI response (async, don't wait)
  if (conversation.id && messageType === 'text' && messageText && !isEdited) {
    handleAIResponse({
      organizationId: orgId,
      conversationId: conversation.id,
      leadId: lead?.id || '',
      incomingMessage: messageText,
      messengerType: 'telegram',
      externalChatId: chatId.toString(),
    }).catch((err) => {
      console.error('AI response error:', err)
    })
  }
}

async function findOrCreateLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  user: { id: number; first_name: string; last_name?: string; username?: string },
  chatId: number
) {
  // Try to find existing lead by tg_id
  const { data: existingLead } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', orgId)
    .eq('tg_id', user.id)
    .single()

  if (existingLead) {
    // Update lead info if changed
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
    if (existingLead.name !== fullName || existingLead.username !== user.username) {
      await supabase
        .from('leads')
        .update({
          name: fullName,
          username: user.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
    }
    return existingLead
  }

  // Create new lead
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      organization_id: orgId,
      tg_id: user.id,
      username: user.username,
      name: fullName,
      source: 'telegram',
      status: 'new',
      metadata: {
        telegram_chat_id: chatId
      }
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create lead:', error)
    return null
  }

  return newLead
}

async function findOrCreateConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  connectionId: string,
  chatId: number,
  leadId: string | null,
  user: { first_name: string; last_name?: string; username?: string }
) {
  // Try to find existing conversation
  const { data: existingConversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('messenger_type', 'telegram')
    .eq('external_chat_id', chatId.toString())
    .single()

  if (existingConversation) {
    // Update lead_id if it was created after conversation
    if (!existingConversation.lead_id && leadId) {
      await supabase
        .from('conversations')
        .update({ lead_id: leadId })
        .eq('id', existingConversation.id)
    }
    return existingConversation
  }

  // Check dialog limit before creating new conversation
  const limitCheck = await checkDialogLimit(supabase, orgId)
  if (!limitCheck.canCreate) {
    console.log(`Dialog limit reached for org ${orgId}: ${limitCheck.current}/${limitCheck.limit}`)
    // Return a minimal object to still save the message
    return { id: null, unread_count: 0, limitReached: true }
  }

  // Create new conversation
  const title = user.username
    ? `@${user.username}`
    : [user.first_name, user.last_name].filter(Boolean).join(' ')

  const { data: newConversation, error } = await supabase
    .from('conversations')
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      messenger_connection_id: connectionId,
      messenger_type: 'telegram',
      external_chat_id: chatId.toString(),
      title,
      status: 'open',
      unread_count: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create conversation:', error)
    // Return a minimal object to continue
    return { id: null, unread_count: 0 }
  }

  return newConversation
}

async function checkDialogLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string
): Promise<{ canCreate: boolean; current: number; limit: number | null }> {
  // Get current subscription with plan info
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(dialog_limit)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = subscriptionData as any

  if (!subscription) {
    // No active subscription — use free tier limit (50)
    const dialogLimit = 50
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    return {
      canCreate: (count || 0) < dialogLimit,
      current: count || 0,
      limit: dialogLimit,
    }
  }

  const dialogLimit = subscription.subscription_plans?.dialog_limit

  // null means unlimited
  if (dialogLimit === null) {
    return { canCreate: true, current: 0, limit: null }
  }

  // Count current conversations
  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  return {
    canCreate: (count || 0) < dialogLimit,
    current: count || 0,
    limit: dialogLimit,
  }
}

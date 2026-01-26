import { IncomingMessage } from './types'
import {
  findOrCreateLead,
  findOrCreateConversation,
  saveMessage,
  getMessengerConnection,
  updateConversationUnread,
} from './supabase'

const NEXTJS_APP_URL = process.env.NEXTJS_APP_URL || 'http://localhost:3000'
const WHATSAPP_SERVICE_SECRET = process.env.WEBHOOK_SECRET || 'whatsapp-service-secret-key'

export async function handleIncomingMessage(
  orgId: string,
  message: IncomingMessage
): Promise<void> {
  console.log(`[${orgId}] Incoming message from ${message.from}:`, message.body?.slice(0, 50))

  try {
    // Get messenger connection
    const connection = await getMessengerConnection(orgId)
    if (!connection) {
      console.error(`[${orgId}] No WhatsApp connection found`)
      return
    }

    // Extract contact name from message if available
    const pushname = message.from.split('@')[0] // Use phone number as fallback

    // Find or create lead
    const lead = await findOrCreateLead(orgId, message.from, pushname)

    // Find or create conversation
    const conversation = await findOrCreateConversation(
      orgId,
      lead.id,
      message.from,
      connection.id,
      lead.name || message.from.replace('@c.us', '')
    )

    // Determine message type
    let messageType = 'text'
    let content = message.body
    const attachments: unknown[] = []
    const metadata: Record<string, unknown> = {
      whatsapp_message_id: message.id,
      timestamp: message.timestamp,
    }

    switch (message.type) {
      case 'image':
        messageType = 'image'
        if (message.mediaUrl) {
          attachments.push({
            type: 'image',
            url: message.mediaUrl,
            mimetype: message.mimetype,
          })
        }
        content = message.caption || '[Изображение]'
        break

      case 'video':
        messageType = 'video'
        if (message.mediaUrl) {
          attachments.push({
            type: 'video',
            url: message.mediaUrl,
            mimetype: message.mimetype,
          })
        }
        content = message.caption || '[Видео]'
        break

      case 'audio':
        messageType = 'audio'
        if (message.mediaUrl) {
          attachments.push({
            type: 'audio',
            url: message.mediaUrl,
            mimetype: message.mimetype,
          })
        }
        content = '[Голосовое сообщение]'
        break

      case 'document':
        messageType = 'file'
        if (message.mediaUrl) {
          attachments.push({
            type: 'document',
            url: message.mediaUrl,
            mimetype: message.mimetype,
            filename: message.filename,
          })
        }
        content = message.filename || '[Документ]'
        break

      case 'sticker':
        messageType = 'sticker'
        if (message.mediaUrl) {
          attachments.push({
            type: 'sticker',
            url: message.mediaUrl,
          })
        }
        content = '[Стикер]'
        break

      case 'location':
        messageType = 'location'
        if (message.location) {
          metadata.location = message.location
        }
        content = message.body || '[Локация]'
        break

      case 'contact':
        messageType = 'contact'
        if (message.contact) {
          metadata.contact = message.contact
        }
        content = '[Контакт]'
        break

      default:
        messageType = 'text'
        content = message.body || ''
    }

    // Save message
    await saveMessage(
      orgId,
      conversation.id,
      content,
      'lead',
      messageType,
      message.id,
      attachments,
      metadata
    )

    // Increment unread count
    await updateConversationUnread(conversation.id, true)

    console.log(`[${orgId}] Message saved successfully`)

    // Trigger AI response for text messages
    if (messageType === 'text' && content) {
      triggerAIResponse(orgId, conversation.id, lead.id, content, message.from)
    }
  } catch (err) {
    console.error(`[${orgId}] Error handling message:`, err)
  }
}

function triggerAIResponse(
  orgId: string,
  conversationId: string,
  leadId: string,
  messageText: string,
  externalChatId: string
) {
  // Call the main app webhook to trigger AI response (fire and forget)
  fetch(`${NEXTJS_APP_URL}/api/webhooks/whatsapp/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_SERVICE_SECRET}`,
    },
    body: JSON.stringify({
      organizationId: orgId,
      conversationId,
      leadId,
      messageText,
      externalChatId,
    }),
  }).then((res) => {
    if (!res.ok) {
      console.error(`[${orgId}] AI webhook failed:`, res.status)
    }
  }).catch((err) => {
    console.error(`[${orgId}] AI webhook error:`, err)
  })
}

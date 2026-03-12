import { NextRequest, NextResponse } from 'next/server'
import { handleAIResponse } from '@/lib/ai/respond'
import { createAdminClient } from '@/lib/supabase/admin'

const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'whatsapp-service-secret-key'

export async function POST(request: NextRequest) {
  try {
    // Verify secret
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token !== WHATSAPP_SERVICE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      organizationId,
      conversationId,
      leadId,
      messageText,
      externalChatId,
    } = body

    if (!organizationId || !conversationId || !externalChatId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Track broadcast reply (wrapped so it never breaks message ingestion)
    if (conversationId) {
      const adminSupabase = createAdminClient()
      adminSupabase
        .from('broadcast_recipients')
        .update({ has_replied: true, updated_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('status', 'sent')
        .eq('has_replied', false)
        .catch((err: unknown) => console.error('Broadcast reply tracking error:', err))
    }

    // Trigger AI response (async)
    handleAIResponse({
      organizationId,
      conversationId,
      leadId: leadId || '',
      incomingMessage: messageText || '',
      messengerType: 'whatsapp',
      externalChatId,
    }).catch((err) => {
      console.error('WhatsApp AI response error:', err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp AI webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTelegramClient } from '@/lib/telegram/client'
import crypto from 'crypto'

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
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Validate token format (should be like 123456789:ABC...)
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    // Verify token by calling Telegram API
    const telegram = createTelegramClient(token)
    let botInfo

    try {
      botInfo = await telegram.getMe()
    } catch {
      return NextResponse.json({ error: 'Invalid bot token' }, { status: 400 })
    }

    // Check if already connected
    const { data: existingConnectionData } = await supabase
      .from('messenger_connections')
      .select('id')
      .eq('organization_id', profile.current_organization_id)
      .eq('messenger_type', 'telegram')
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingConnection = existingConnectionData as any

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex')

    // Build webhook URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${appUrl}/api/webhooks/telegram/${profile.current_organization_id}`

    // Set webhook on Telegram
    try {
      await telegram.setWebhook(webhookUrl, {
        secret_token: webhookSecret,
        drop_pending_updates: true,
        allowed_updates: ['message', 'edited_message', 'callback_query']
      })
    } catch (error) {
      console.error('Failed to set webhook:', error)
      return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 })
    }

    const credentials = {
      bot_token: token,
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      bot_name: botInfo.first_name,
      webhook_secret: webhookSecret
    }

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('messenger_connections')
        .update({
          credentials,
          webhook_url: webhookUrl,
          is_active: true,
          name: botInfo.first_name,
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', existingConnection.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('messenger_connections')
        .insert({
          organization_id: profile.current_organization_id,
          messenger_type: 'telegram',
          name: botInfo.first_name,
          credentials,
          webhook_url: webhookUrl,
          is_active: true
        } as never)

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        name: botInfo.first_name
      }
    })
  } catch (error) {
    console.error('Telegram connect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
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

    // Get connection to retrieve token
    const { data: connectionData } = await supabase
      .from('messenger_connections')
      .select('credentials')
      .eq('organization_id', profile.current_organization_id)
      .eq('messenger_type', 'telegram')
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = connectionData as any

    if (connection?.credentials) {
      // Delete webhook from Telegram
      const creds = connection.credentials as { bot_token?: string }
      if (creds.bot_token) {
        try {
          const telegram = createTelegramClient(creds.bot_token)
          await telegram.deleteWebhook(true)
        } catch (error) {
          console.error('Failed to delete webhook:', error)
        }
      }
    }

    // Delete connection from database
    const { error: deleteError } = await supabase
      .from('messenger_connections')
      .delete()
      .eq('organization_id', profile.current_organization_id)
      .eq('messenger_type', 'telegram')

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Telegram disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

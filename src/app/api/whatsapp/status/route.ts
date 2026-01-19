import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'whatsapp-service-secret-key'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with organization
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

    const orgId = profile.current_organization_id as string

    // Check if there's an existing connection in database
    const { data: connectionData } = await supabase
      .from('messenger_connections')
      .select('*')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = connectionData as any

    // Get QR code parameter to determine endpoint
    const { searchParams } = new URL(request.url)
    const includeQr = searchParams.get('qr') === 'true'

    // Call WhatsApp service for status
    const endpoint = includeQr ? 'qr' : 'status'
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions/${orgId}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_SERVICE_SECRET}`,
      },
    })

    const data = await response.json()

    // If service returns 404, check database connection
    if (response.status === 404 && connection?.is_active) {
      // Connection exists in DB but not in service - needs reconnect
      return NextResponse.json({
        success: true,
        status: 'disconnected',
        needsReconnect: true,
        phoneNumber: (connection.credentials as { phone_number?: string })?.phone_number,
      })
    }

    // Merge with database info
    if (connection && data.success) {
      const creds = connection.credentials as { phone_number?: string; pushname?: string }
      return NextResponse.json({
        ...data,
        phoneNumber: data.phoneNumber || creds?.phone_number,
        pushname: data.pushname || creds?.pushname,
        isConnected: connection.is_active && data.status === 'ready',
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('WhatsApp status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

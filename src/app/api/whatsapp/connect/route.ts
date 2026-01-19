import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET || 'whatsapp-service-secret-key'

export async function POST(request: NextRequest) {
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

    // Call WhatsApp service to start session
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions/${orgId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_SERVICE_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to start WhatsApp session' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('WhatsApp connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with organization
    const { data: profileData2 } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile2 = profileData2 as any

    if (!profile2?.current_organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = profile2.current_organization_id as string

    // Call WhatsApp service to stop session
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions/${orgId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_SERVICE_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to stop WhatsApp session' },
        { status: response.status }
      )
    }

    // Delete connection from database
    await supabase
      .from('messenger_connections')
      .delete()
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

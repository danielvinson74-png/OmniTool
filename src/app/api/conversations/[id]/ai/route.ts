import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH - Toggle AI for conversation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const aiEnabled = body.ai_enabled

    if (typeof aiEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'ai_enabled must be a boolean' },
        { status: 400 }
      )
    }

    // Get current organization
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

    // Update conversation
    const { data: conversationData, error: updateError } = await supabase
      .from('conversations')
      .update({ ai_enabled: aiEnabled } as never)
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('Update conversation error:', updateError)
      return NextResponse.json(
        { error: 'Conversation not found or update failed' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: conversationData,
    })
  } catch (error) {
    console.error('Toggle AI error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get AI status for conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current organization
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

    // Get conversation AI status
    const { data: conversationData } = await supabase
      .from('conversations')
      .select('id, ai_enabled')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversation = conversationData as any

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get organization AI settings to check if AI is enabled globally
    const { data: aiSettingsData } = await supabase
      .from('ai_settings')
      .select('is_enabled, has_api_key:api_key')
      .eq('organization_id', orgId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiSettings = aiSettingsData as any

    return NextResponse.json({
      success: true,
      ai_enabled: conversation.ai_enabled ?? true,
      global_ai_enabled: aiSettings?.is_enabled ?? false,
      has_api_key: !!aiSettings?.has_api_key,
    })
  } catch (error) {
    console.error('Get AI status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

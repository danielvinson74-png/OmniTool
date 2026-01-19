import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get AI settings for current organization
export async function GET() {
  try {
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

    // Get AI settings
    const { data: settingsData } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = settingsData as any

    // Don't return full API key, only masked version
    if (settings?.api_key) {
      settings.api_key_masked = `sk-...${settings.api_key.slice(-4)}`
      settings.has_api_key = true
      delete settings.api_key
    } else {
      settings && (settings.has_api_key = false)
    }

    return NextResponse.json({
      success: true,
      settings: settings || null,
    })
  } catch (error) {
    console.error('Get AI settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update AI settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

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

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    }

    // Only update fields that are provided
    if (typeof body.is_enabled === 'boolean') {
      updateData.is_enabled = body.is_enabled
    }
    if (body.model) {
      updateData.model = body.model
    }
    if (typeof body.temperature === 'number') {
      updateData.temperature = Math.min(2, Math.max(0, body.temperature))
    }
    if (typeof body.max_tokens === 'number') {
      updateData.max_tokens = Math.min(4096, Math.max(1, body.max_tokens))
    }
    if (typeof body.system_prompt === 'string') {
      updateData.system_prompt = body.system_prompt
    }
    if (typeof body.auto_reply_delay_seconds === 'number') {
      updateData.auto_reply_delay_seconds = Math.min(
        30,
        Math.max(0, body.auto_reply_delay_seconds)
      )
    }
    if (typeof body.context_messages_count === 'number') {
      updateData.context_messages_count = Math.min(
        50,
        Math.max(1, body.context_messages_count)
      )
    }
    // Only update API key if explicitly provided (not empty string)
    if (body.api_key && body.api_key.trim()) {
      updateData.api_key = body.api_key.trim()
    }

    // Upsert settings
    const { data: settingsData, error: upsertError } = await supabase
      .from('ai_settings')
      .upsert(updateData, { onConflict: 'organization_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = settingsData as any

    // Mask API key in response
    if (settings?.api_key) {
      settings.api_key_masked = `sk-...${settings.api_key.slice(-4)}`
      settings.has_api_key = true
      delete settings.api_key
    }

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Update AI settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

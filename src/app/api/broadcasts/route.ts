import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/broadcasts — list all broadcasts for the org
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const orgId = profile.current_organization_id

    const { data: broadcastsRaw, error } = await supabase
      .from('broadcasts')
      .select('*, broadcast_steps(count)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broadcasts = broadcastsRaw as any[]
    return NextResponse.json({ success: true, broadcasts })
  } catch (error) {
    console.error('GET /api/broadcasts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/broadcasts — create a new broadcast (draft status)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const orgId = profile.current_organization_id
    const body = await request.json()
    const { name, description, segment_filters, messenger_type, delay_between_sends, scheduled_at, steps } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!steps?.length) {
      return NextResponse.json({ error: 'At least one message step is required' }, { status: 400 })
    }

    // Create broadcast
    const { data: broadcastData2, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        organization_id: orgId,
        created_by: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        segment_filters: segment_filters ?? { statuses: [], tags: [] },
        messenger_type: messenger_type || null,
        delay_between_sends: delay_between_sends ?? 5,
        scheduled_at: scheduled_at || null,
      } as never)
      .select()
      .single()

    if (broadcastError) throw broadcastError
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broadcast = broadcastData2 as any

    // Create steps
    const stepsToInsert = steps.map((step: { step_order: number; message_text: string; delay_days: number }) => ({
      broadcast_id: broadcast.id,
      organization_id: orgId,
      step_order: step.step_order,
      message_text: step.message_text,
      delay_days: step.delay_days ?? 0,
    }))

    const { error: stepsError } = await supabase
      .from('broadcast_steps')
      .insert(stepsToInsert as never)

    if (stepsError) throw stepsError

    return NextResponse.json({ success: true, broadcast }, { status: 201 })
  } catch (error) {
    console.error('POST /api/broadcasts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

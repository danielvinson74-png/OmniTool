import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', userId)
    .single()
  return profile?.current_organization_id ?? null
}

// GET /api/broadcasts/[id] — full detail with per-step stats
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .select('*, broadcast_steps(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error || !broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }

    // Per-step stats
    const { data: recipientStats } = await supabase
      .from('broadcast_recipients')
      .select('step_id, status, has_replied')
      .eq('broadcast_id', id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepStats: Record<string, any> = {}
    for (const r of recipientStats ?? []) {
      if (!stepStats[r.step_id]) {
        stepStats[r.step_id] = { sent: 0, failed: 0, pending: 0, skipped: 0, replied: 0 }
      }
      stepStats[r.step_id][r.status] = (stepStats[r.step_id][r.status] ?? 0) + 1
      if (r.has_replied) stepStats[r.step_id].replied++
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepsWithStats = (broadcast as any).broadcast_steps.map((step: any) => ({
      ...step,
      stats: stepStats[step.id] ?? { sent: 0, failed: 0, pending: 0, skipped: 0, replied: 0 },
    }))

    return NextResponse.json({
      success: true,
      broadcast: { ...broadcast, broadcast_steps: stepsWithStats },
    })
  } catch (error) {
    console.error('GET /api/broadcasts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/broadcasts/[id] — update a draft broadcast
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    // Only allow editing drafts
    const { data: existing } = await supabase
      .from('broadcasts')
      .select('status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft broadcasts can be edited' }, { status: 409 })
    }

    const body = await request.json()
    const { name, description, segment_filters, messenger_type, delay_between_sends, scheduled_at, steps } = body

    // Update broadcast
    const { data: broadcast, error: updateError } = await supabase
      .from('broadcasts')
      .update({
        name: name?.trim(),
        description: description?.trim() ?? null,
        segment_filters: segment_filters ?? { statuses: [], tags: [] },
        messenger_type: messenger_type ?? null,
        delay_between_sends: delay_between_sends ?? 5,
        scheduled_at: scheduled_at ?? null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Replace steps if provided
    if (steps?.length) {
      await supabase.from('broadcast_steps').delete().eq('broadcast_id', id)

      const stepsToInsert = steps.map((step: { step_order: number; message_text: string; delay_days: number }) => ({
        broadcast_id: id,
        organization_id: orgId,
        step_order: step.step_order,
        message_text: step.message_text,
        delay_days: step.delay_days ?? 0,
      }))

      const { error: stepsError } = await supabase
        .from('broadcast_steps')
        .insert(stepsToInsert as never)

      if (stepsError) throw stepsError
    }

    return NextResponse.json({ success: true, broadcast })
  } catch (error) {
    console.error('PUT /api/broadcasts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/broadcasts/[id] — delete a draft broadcast
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { data: existing } = await supabase
      .from('broadcasts')
      .select('status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft broadcasts can be deleted' }, { status: 409 })
    }

    const { error } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/broadcasts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

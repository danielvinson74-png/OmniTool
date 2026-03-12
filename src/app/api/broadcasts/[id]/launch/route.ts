import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/broadcasts/[id]/launch
// Populates broadcast_recipients and transitions status to scheduled or sending
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Fetch broadcast with steps
    const { data: broadcastData } = await supabase
      .from('broadcasts')
      .select('*, broadcast_steps(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broadcast = broadcastData as any

    if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    if (broadcast.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft broadcasts can be launched' }, { status: 409 })
    }

    const steps = broadcast.broadcast_steps
    if (!steps?.length) {
      return NextResponse.json({ error: 'Broadcast has no steps' }, { status: 400 })
    }

    // Sort steps by order
    steps.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order)

    // Build segment query filters
    const segmentFilters = broadcast.segment_filters as { statuses: string[]; tags: string[] }
    const messengerType = broadcast.messenger_type

    // Query eligible conversations
    let query = supabase
      .from('conversations')
      .select('id, lead_id, messenger_type, leads!inner(status, tags)')
      .eq('organization_id', orgId)
      .not('status', 'in', '("spam","archived")')
      .not('lead_id', 'is', null)

    if (messengerType) {
      query = query.eq('messenger_type', messengerType)
    }

    if (segmentFilters.statuses?.length > 0) {
      query = query.in('leads.status', segmentFilters.statuses)
    }

    const { data: conversations, error: queryError } = await query

    if (queryError) throw queryError

    // Filter by tags (overlap) in JS since Supabase doesn't support array overlap on joined tables easily
    let eligible = conversations ?? []
    if (segmentFilters.tags?.length > 0) {
      eligible = eligible.filter((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leadTags: string[] = (c.leads as any)?.tags ?? []
        return segmentFilters.tags.some((tag) => leadTags.includes(tag))
      })
    }

    if (eligible.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No eligible contacts found for this segment'
      }, { status: 400 })
    }

    // Determine base time
    const baseTime = broadcast.scheduled_at
      ? new Date(broadcast.scheduled_at)
      : new Date()

    // Build recipients: one row per (conversation × step)
    // Accumulate delay_days across steps
    let accumulatedDays = 0
    const recipients = []

    for (const step of steps) {
      accumulatedDays += step.delay_days

      const scheduledSendAt = new Date(baseTime)
      scheduledSendAt.setDate(scheduledSendAt.getDate() + accumulatedDays)

      for (const conv of eligible) {
        recipients.push({
          broadcast_id: id,
          step_id: step.id,
          organization_id: orgId,
          lead_id: conv.lead_id,
          conversation_id: conv.id,
          scheduled_send_at: scheduledSendAt.toISOString(),
          status: 'pending',
        })
      }
    }

    // Bulk insert recipients
    const { error: insertError } = await supabase
      .from('broadcast_recipients')
      .insert(recipients as never)

    if (insertError) throw insertError

    // Determine new broadcast status
    const isScheduled = broadcast.scheduled_at && new Date(broadcast.scheduled_at) > new Date()
    const newStatus = isScheduled ? 'scheduled' : 'sending'

    const { data: updatedBroadcast, error: updateError } = await supabase
      .from('broadcasts')
      .update({
        status: newStatus,
        stats_total: eligible.length,
        started_at: isScheduled ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      broadcast: updatedBroadcast,
      recipients_created: recipients.length,
      contacts_count: eligible.length,
    })
  } catch (error) {
    console.error('POST /api/broadcasts/[id]/launch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

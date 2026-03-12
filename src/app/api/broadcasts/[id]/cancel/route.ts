import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/broadcasts/[id]/cancel
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

    const { data: existing } = await supabase
      .from('broadcasts')
      .select('status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

    if (!['scheduled', 'sending'].includes(existing.status)) {
      return NextResponse.json({ error: 'Only scheduled or sending broadcasts can be cancelled' }, { status: 409 })
    }

    // Mark all pending recipients as skipped
    await supabase
      .from('broadcast_recipients')
      .update({ status: 'skipped', updated_at: new Date().toISOString() } as never)
      .eq('broadcast_id', id)
      .eq('status', 'pending')

    // Update broadcast status
    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, broadcast })
  } catch (error) {
    console.error('POST /api/broadcasts/[id]/cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

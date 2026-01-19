import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = profileData as any

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { subscriptionId, planId } = body

    if (!subscriptionId || !planId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Update subscription using admin client
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', subscriptionId)

    if (error) {
      console.error('Update subscription error:', error)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subscription update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

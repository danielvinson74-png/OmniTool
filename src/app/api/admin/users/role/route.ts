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
    const { userId, role } = body

    if (!userId || !role || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Can't change own role
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot change own role' }, { status: 400 })
    }

    // Update role using admin client
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('profiles')
      .update({ role } as never)
      .eq('id', userId)

    if (error) {
      console.error('Update role error:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Role update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

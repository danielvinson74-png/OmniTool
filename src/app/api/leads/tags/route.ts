import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/leads/tags — returns all unique tags used across leads in the org
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

    const { data: leads, error } = await supabase
      .from('leads')
      .select('tags')
      .eq('organization_id', profile.current_organization_id)
      .not('tags', 'eq', '{}')

    if (error) throw error

    const allTags = [...new Set((leads ?? []).flatMap((l) => l.tags ?? []))].sort()

    return NextResponse.json({ success: true, tags: allTags })
  } catch (error) {
    console.error('GET /api/leads/tags error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

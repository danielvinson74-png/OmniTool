import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/broadcasts/preview-recipients
// Dry-run segment query — returns count + sample without creating any records
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)

    const statusesParam = searchParams.get('statuses')
    const tagsParam = searchParams.get('tags')
    const messengerType = searchParams.get('messenger_type')

    const statuses = statusesParam ? statusesParam.split(',').filter(Boolean) : []
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : []

    let query = supabase
      .from('conversations')
      .select('id, messenger_type, leads!inner(id, name, username, status, tags)')
      .eq('organization_id', orgId)
      .not('status', 'in', '("spam","archived")')
      .not('lead_id', 'is', null)

    if (messengerType && messengerType !== 'all') {
      query = query.eq('messenger_type', messengerType)
    }

    if (statuses.length > 0) {
      query = query.in('leads.status', statuses)
    }

    const { data: conversations, error } = await query

    if (error) throw error

    let eligible = conversations ?? []

    if (tags.length > 0) {
      eligible = eligible.filter((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leadTags: string[] = (c.leads as any)?.tags ?? []
        return tags.some((tag) => leadTags.includes(tag))
      })
    }

    // Build sample (up to 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sample = eligible.slice(0, 5).map((c: any) => ({
      name: c.leads?.name || c.leads?.username || 'Unknown',
      messenger_type: c.messenger_type,
      status: c.leads?.status,
      tags: c.leads?.tags ?? [],
    }))

    return NextResponse.json({
      success: true,
      count: eligible.length,
      sample,
    })
  } catch (error) {
    console.error('GET /api/broadcasts/preview-recipients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

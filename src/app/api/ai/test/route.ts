import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateResponse } from '@/lib/openai/client'

// POST - Test AI with current settings
export async function POST(request: NextRequest) {
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
    const testMessage = body.message || 'Привет! Расскажи о своих возможностях.'

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

    if (!settings) {
      return NextResponse.json(
        { error: 'AI настройки не найдены. Сначала сохраните настройки.' },
        { status: 400 }
      )
    }

    if (!settings.api_key) {
      return NextResponse.json(
        { error: 'API ключ не настроен' },
        { status: 400 }
      )
    }

    // Generate test response
    const result = await generateResponse({
      apiKey: settings.api_key,
      model: settings.model || 'gpt-4o-mini',
      systemPrompt: settings.system_prompt || 'Ты вежливый помощник.',
      messages: [{ role: 'user', content: testMessage }],
      temperature: settings.temperature || 0.7,
      maxTokens: settings.max_tokens || 500,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Ошибка генерации ответа' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      response: result.content,
      usage: result.usage,
    })
  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

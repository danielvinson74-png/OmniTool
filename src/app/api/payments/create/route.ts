import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getYooKassaClient } from '@/lib/yookassa/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем данные профиля
    const { data: profileData } = await supabase
      .from('profiles')
      .select('current_organization_id, email')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = profileData as any

    if (!profile?.current_organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const body = await request.json()
    const { planId, billingPeriod = 'monthly' } = body

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 })
    }

    // Получаем информацию о плане
    const adminSupabase = createAdminClient()
    const { data: planData } = await adminSupabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = planData as any

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Бесплатный план не требует оплаты
    if (plan.slug === 'free') {
      // Просто меняем план без оплаты
      const { error: updateError } = await adminSupabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          billing_period: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('organization_id', profile.current_organization_id)

      if (updateError) {
        console.error('Failed to update subscription:', updateError)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true, free: true })
    }

    // Определяем сумму платежа
    const amount = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid plan price' }, { status: 400 })
    }

    // Получаем текущую подписку
    const { data: subscriptionData } = await adminSupabase
      .from('subscriptions')
      .select('id')
      .eq('organization_id', profile.current_organization_id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = subscriptionData as any

    // Создаем платеж в YooKassa
    const yookassa = getYooKassaClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const payment = await yookassa.createSubscriptionPayment({
      organizationId: profile.current_organization_id,
      planId,
      planName: plan.name,
      amount,
      billingPeriod,
      returnUrl: `${appUrl}/payment/success`,
      customerEmail: profile.email || user.email,
    })

    // Сохраняем платеж в БД
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: paymentError } = await (adminSupabase as any)
      .from('payments')
      .insert({
        organization_id: profile.current_organization_id,
        subscription_id: subscription?.id || null,
        yookassa_payment_id: payment.id,
        amount,
        currency: 'RUB',
        status: payment.status,
        description: payment.description,
        metadata: {
          plan_id: planId,
          plan_name: plan.name,
          billing_period: billingPeriod,
        },
      })

    if (paymentError) {
      console.error('Failed to save payment:', paymentError)
      // Не блокируем — платеж уже создан в YooKassa
    }

    // Возвращаем URL для редиректа на оплату
    const confirmationUrl = payment.confirmation?.confirmation_url

    if (!confirmationUrl) {
      return NextResponse.json({ error: 'No confirmation URL' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      confirmationUrl,
    })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

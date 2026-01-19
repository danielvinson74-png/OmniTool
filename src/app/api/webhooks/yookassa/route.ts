import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WebhookEvent, PaymentResponse } from '@/lib/yookassa/types'

export async function POST(request: NextRequest) {
  try {
    const event: WebhookEvent = await request.json()
    const supabase = createAdminClient()

    console.log('YooKassa webhook received:', event.event, event.object?.id)

    // Обрабатываем разные типы событий
    switch (event.event) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(supabase, event.object)
        break

      case 'payment.canceled':
        await handlePaymentCanceled(supabase, event.object)
        break

      case 'payment.waiting_for_capture':
        await handlePaymentWaitingForCapture(supabase, event.object)
        break

      case 'refund.succeeded':
        await handleRefundSucceeded(supabase, event.object)
        break

      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('YooKassa webhook error:', error)
    // Всегда возвращаем 200, чтобы YooKassa не повторяла запросы
    return NextResponse.json({ success: true })
  }
}

async function handlePaymentSucceeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payment: PaymentResponse
) {
  const { id: paymentId, metadata } = payment

  // Обновляем статус платежа в БД
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      payment_method: payment.payment_method || null,
    } as never)
    .eq('yookassa_payment_id', paymentId)

  if (paymentError) {
    console.error('Failed to update payment status:', paymentError)
  }

  // Если есть метаданные о подписке — активируем её
  if (metadata?.organization_id && metadata?.plan_id) {
    const billingPeriod = metadata.billing_period || 'monthly'

    // Вычисляем дату окончания периода
    const periodEnd = new Date()
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // Обновляем подписку
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: metadata.plan_id,
        status: 'active',
        billing_period: billingPeriod,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('organization_id', metadata.organization_id)

    if (subError) {
      console.error('Failed to activate subscription:', subError)
    } else {
      console.log('Subscription activated for org:', metadata.organization_id)
    }
  }
}

async function handlePaymentCanceled(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payment: PaymentResponse
) {
  const { id: paymentId, cancellation_details } = payment

  // Обновляем статус платежа
  await supabase
    .from('payments')
    .update({
      status: 'canceled',
      metadata: {
        cancellation_reason: cancellation_details?.reason,
        cancellation_party: cancellation_details?.party,
      },
    } as never)
    .eq('yookassa_payment_id', paymentId)
}

async function handlePaymentWaitingForCapture(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payment: PaymentResponse
) {
  // Обновляем статус платежа (для двухстадийной оплаты)
  await supabase
    .from('payments')
    .update({
      status: 'waiting_for_capture',
    } as never)
    .eq('yookassa_payment_id', payment.id)
}

async function handleRefundSucceeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payment: PaymentResponse
) {
  // Обновляем статус платежа
  await supabase
    .from('payments')
    .update({
      status: 'refunded',
    } as never)
    .eq('yookassa_payment_id', payment.id)

  // Можно также деактивировать подписку при возврате
  if (payment.metadata?.organization_id) {
    // Получаем Free план
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'free')
      .single()

    if (freePlan) {
      await supabase
        .from('subscriptions')
        .update({
          plan_id: freePlan.id,
          status: 'active',
          current_period_end: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('organization_id', payment.metadata.organization_id)
    }
  }
}

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PricingGrid } from '@/components/billing/pricing-grid'
import Link from 'next/link'

export const metadata = {
  title: 'Подписка | OmniTool',
  description: 'Выберите тарифный план',
}

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any

  const { data: plansData } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans = (plansData as any[]) || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentSubscription: any = null
  if (profile?.current_organization_id) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('organization_id', profile.current_organization_id)
      .maybeSingle()
    currentSubscription = data
  }

  const currentPlanSlug = currentSubscription?.subscription_plans?.slug
  const currentPlan = currentSubscription?.subscription_plans

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Тарифные планы</h1>
        <p className="text-muted-foreground">
          Выберите план, который подходит вашему бизнесу
        </p>
      </div>

      {/* Текущий план */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ваш текущий план</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-xl">{currentPlan.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan.dialog_limit
                  ? `До ${currentPlan.dialog_limit} диалогов`
                  : 'Безлимитные диалоги'}
              </p>
              {currentSubscription.current_period_end && (
                <p className="text-sm text-muted-foreground mt-1">
                  Действует до: {new Date(currentSubscription.current_period_end).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
            <Link href="/account/payments">
              <Button variant="outline" className="w-full sm:w-auto">История платежей</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Сетка тарифов */}
      <PricingGrid plans={plans} currentPlanSlug={currentPlanSlug} />

      <Card>
        <CardHeader>
          <CardTitle>Нужно больше?</CardTitle>
          <CardDescription>
            Свяжитесь с нами для обсуждения индивидуальных условий
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Связаться с нами</Button>
        </CardContent>
      </Card>
    </div>
  )
}

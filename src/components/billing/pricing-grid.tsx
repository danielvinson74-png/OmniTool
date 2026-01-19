'use client'

import { useState } from 'react'
import { PlanCard } from './plan-card'
import { BillingPeriodToggle } from './billing-period-toggle'

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_yearly: number
  dialog_limit: number | null
  features: string[]
}

interface PricingGridProps {
  plans: Plan[]
  currentPlanSlug?: string
}

export function PricingGrid({ plans, currentPlanSlug }: PricingGridProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="space-y-6">
      <BillingPeriodToggle value={billingPeriod} onChange={setBillingPeriod} />

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.slug === currentPlanSlug}
            billingPeriod={billingPeriod}
          />
        ))}
      </div>
    </div>
  )
}

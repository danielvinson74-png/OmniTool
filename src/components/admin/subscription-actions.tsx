'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, CreditCard, Loader2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
}

interface SubscriptionActionsProps {
  subscriptionId: string
  currentPlanId: string
  plans: Plan[]
}

export function SubscriptionActions({ subscriptionId, currentPlanId, plans }: SubscriptionActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleChangePlan = async (planId: string) => {
    if (planId === currentPlanId) return

    const plan = plans.find(p => p.id === planId)
    if (!confirm(`Изменить план на "${plan?.name}"?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/subscriptions/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          planId
        })
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to change plan:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Действия</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CreditCard className="mr-2 h-4 w-4" />
            Изменить план
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {plans.map((plan) => (
              <DropdownMenuItem
                key={plan.id}
                onClick={() => handleChangePlan(plan.id)}
                disabled={plan.id === currentPlanId}
              >
                {plan.name}
                {plan.id === currentPlanId && ' (текущий)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

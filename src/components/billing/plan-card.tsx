'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  billingPeriod: 'monthly' | 'yearly'
}

export function PlanCard({ plan, isCurrent, billingPeriod }: PlanCardProps) {
  const [loading, setLoading] = useState(false)

  const price = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly
  const features = plan.features || []

  const handleSelectPlan = async () => {
    if (isCurrent) return

    setLoading(true)
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          billingPeriod,
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      // Для бесплатного плана просто перезагружаем страницу
      if (data.free) {
        window.location.reload()
        return
      }

      // Для платных планов редиректим на страницу оплаты YooKassa
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
      }
    } catch (error) {
      console.error('Failed to create payment:', error)
      alert('Ошибка при создании платежа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={cn(
        'relative',
        isCurrent && 'border-primary shadow-md',
        plan.slug === 'pro' && 'border-primary'
      )}
    >
      {plan.slug === 'pro' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary">Популярный</Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <Badge variant="outline" className="bg-background">
            Текущий
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">
            {price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Бесплатно'}
          </span>
          {price > 0 && (
            <span className="text-muted-foreground">
              /{billingPeriod === 'yearly' ? 'год' : 'мес'}
            </span>
          )}
        </div>

        {billingPeriod === 'yearly' && plan.price_monthly > 0 && (
          <p className="text-sm text-muted-foreground">
            Экономия {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%
          </p>
        )}

        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>
              {plan.dialog_limit ? `До ${plan.dialog_limit} диалогов` : 'Безлимитные диалоги'}
            </span>
          </li>
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrent ? 'outline' : plan.slug === 'pro' ? 'default' : 'secondary'}
          disabled={isCurrent || loading}
          onClick={handleSelectPlan}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Загрузка...
            </>
          ) : isCurrent ? (
            'Текущий план'
          ) : price > 0 ? (
            'Оплатить'
          ) : (
            'Выбрать'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Платёж успешен | OmniTool',
  description: 'Ваш платёж успешно обработан',
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Платёж успешен!</CardTitle>
          <CardDescription>
            Спасибо за оплату. Ваша подписка активирована.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ваш тарифный план был обновлён. Теперь вы можете пользоваться всеми возможностями выбранного плана.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard">
              <Button className="w-full">Перейти в дашборд</Button>
            </Link>
            <Link href="/account/subscription">
              <Button variant="outline" className="w-full">Управление подпиской</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

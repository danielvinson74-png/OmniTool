import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Платёж отменён | OmniTool',
  description: 'Платёж был отменён',
}

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Платёж отменён</CardTitle>
          <CardDescription>
            Оплата не была завершена
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Платёж был отменён или произошла ошибка. Ваш текущий тарифный план не изменился.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/account/subscription">
              <Button className="w-full">Попробовать снова</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Вернуться в дашборд</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

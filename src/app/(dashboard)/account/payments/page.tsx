import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CreditCard, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'История платежей | OmniTool',
  description: 'История ваших платежей',
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Ожидает', variant: 'secondary' },
  waiting_for_capture: { label: 'Ожидает подтверждения', variant: 'secondary' },
  succeeded: { label: 'Оплачен', variant: 'default' },
  canceled: { label: 'Отменён', variant: 'destructive' },
  refunded: { label: 'Возвращён', variant: 'outline' },
}

export default async function PaymentsPage() {
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

  if (!profile?.current_organization_id) return null

  // Получаем платежи организации
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('*')
    .eq('organization_id', profile.current_organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payments = (paymentsData as any[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/account/subscription">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">История платежей</h1>
          <p className="text-muted-foreground">
            Все ваши платежи и транзакции
          </p>
        </div>
      </div>

      {payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Платежи</CardTitle>
            <CardDescription>
              Последние 50 платежей
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const status = statusLabels[payment.status] || { label: payment.status, variant: 'secondary' as const }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const metadata = payment.metadata as any

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payment.description || metadata?.plan_name || 'Платёж'}
                          </p>
                          {metadata?.billing_period && (
                            <p className="text-sm text-muted-foreground">
                              {metadata.billing_period === 'yearly' ? 'Годовая подписка' : 'Месячная подписка'}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.amount.toLocaleString('ru-RU')} {payment.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Нет платежей</CardTitle>
            <CardDescription>
              Здесь будет отображаться история ваших платежей
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/account/subscription">
              <Button>Выбрать тариф</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

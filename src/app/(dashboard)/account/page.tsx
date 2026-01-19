import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import type { Tables } from '@/types/database'

export const metadata = {
  title: 'Профиль | OmniTool',
  description: 'Настройки профиля',
}

export default async function AccountPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as Tables<'profiles'> | null
  const orgId = profile?.current_organization_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscription: any = null
  if (orgId) {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('organization_id', orgId)
      .maybeSingle()
    subscription = subData
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0].toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground">
          Управляйте своим аккаунтом
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Личные данные</CardTitle>
            <CardDescription>Ваша информация профиля</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.full_name || 'Не указано'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Телефон</span>
                <span>{profile?.phone || 'Не указан'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Часовой пояс</span>
                <span>{profile?.timezone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Роль</span>
                <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                  {profile?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </Badge>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              Редактировать профиль
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Подписка</CardTitle>
            <CardDescription>Ваш текущий тарифный план</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">
                  {subscription?.subscription_plans?.name || 'Free'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription?.subscription_plans?.dialog_limit
                    ? `${subscription.subscription_plans.dialog_limit} диалогов/мес`
                    : 'Безлимитные диалоги'}
                </p>
              </div>
              <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                {subscription?.status === 'active' ? 'Активна' : 'Неактивна'}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Стоимость</span>
                <span>
                  {subscription?.subscription_plans?.price_monthly
                    ? `${subscription.subscription_plans.price_monthly} ₽/мес`
                    : 'Бесплатно'}
                </span>
              </div>
            </div>

            <Link href="/account/subscription">
              <Button className="w-full">Изменить план</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

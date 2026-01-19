import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { UserActions } from '@/components/admin/user-actions'

export const metadata = {
  title: 'Пользователи | Админ-панель',
  description: 'Управление пользователями',
}

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  // Get all users with their organizations and subscriptions
  const { data: usersData } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations!profiles_current_organization_id_fkey(
        id,
        name,
        subscriptions(
          status,
          subscription_plans(name, slug)
        )
      )
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = usersData as any[]

  // Get auth users for email
  const { data: authUsersData } = await supabase.auth.admin.listUsers()
  const authUsers = authUsersData?.users || []

  // Map auth data to profiles
  const usersWithEmail = users?.map(user => {
    const authUser = authUsers.find(au => au.id === user.id)
    return {
      ...user,
      email: authUser?.email || 'N/A'
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Пользователи</h1>
          <p className="text-muted-foreground">
            Управление пользователями системы
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все пользователи</CardTitle>
          <CardDescription>
            {users?.length || 0} пользователей в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Организация</TableHead>
                <TableHead>Подписка</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersWithEmail?.map((user) => {
                const org = user.organizations
                const subscription = org?.subscriptions?.[0]
                const plan = subscription?.subscription_plans

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Без имени'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                      </Badge>
                    </TableCell>
                    <TableCell>{org?.name || '—'}</TableCell>
                    <TableCell>
                      {plan ? (
                        <Badge variant="outline">{plan.name}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions userId={user.id} userRole={user.role} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!usersWithEmail || usersWithEmail.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Нет пользователей
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

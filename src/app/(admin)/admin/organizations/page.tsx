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

export const metadata = {
  title: 'Организации | Админ-панель',
  description: 'Управление организациями',
}

export default async function AdminOrganizationsPage() {
  const supabase = createAdminClient()

  // Get all organizations with their subscriptions and member counts
  const { data: orgsData } = await supabase
    .from('organizations')
    .select(`
      *,
      subscriptions(
        status,
        subscription_plans(name, slug)
      ),
      organization_members(count)
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizations = orgsData as any[]

  // Get conversation counts per organization
  const { data: convCounts } = await supabase
    .from('conversations')
    .select('organization_id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationsByOrg: Record<string, number> = {}
  convCounts?.forEach((c: any) => {
    conversationsByOrg[c.organization_id] = (conversationsByOrg[c.organization_id] || 0) + 1
  })

  // Get leads counts per organization
  const { data: leadCounts } = await supabase
    .from('leads')
    .select('organization_id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadsByOrg: Record<string, number> = {}
  leadCounts?.forEach((l: any) => {
    leadsByOrg[l.organization_id] = (leadsByOrg[l.organization_id] || 0) + 1
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Организации</h1>
        <p className="text-muted-foreground">
          Все организации в системе
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все организации</CardTitle>
          <CardDescription>
            {organizations?.length || 0} организаций в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Подписка</TableHead>
                <TableHead>Участники</TableHead>
                <TableHead>Диалоги</TableHead>
                <TableHead>Лиды</TableHead>
                <TableHead>Дата создания</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations?.map((org) => {
                const subscription = org.subscriptions?.[0]
                const plan = subscription?.subscription_plans
                const memberCount = org.organization_members?.[0]?.count || 0

                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      {org.name}
                    </TableCell>
                    <TableCell>
                      {plan ? (
                        <Badge
                          variant={plan.slug === 'free' ? 'secondary' : 'default'}
                        >
                          {plan.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Без подписки</Badge>
                      )}
                    </TableCell>
                    <TableCell>{memberCount}</TableCell>
                    <TableCell>{conversationsByOrg[org.id] || 0}</TableCell>
                    <TableCell>{leadsByOrg[org.id] || 0}</TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!organizations || organizations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет организаций
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

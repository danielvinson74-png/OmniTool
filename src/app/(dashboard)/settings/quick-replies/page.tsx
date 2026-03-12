import { QuickRepliesManager } from '@/components/settings/quick-replies-manager'

export const metadata = {
  title: 'Шаблоны ответов | OmniTool',
}

export default function QuickRepliesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Шаблоны ответов</h1>
        <p className="text-muted-foreground">
          Создайте готовые фразы для быстрых ответов клиентам
        </p>
      </div>
      <QuickRepliesManager />
    </div>
  )
}

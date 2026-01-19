import { AISettingsForm } from '@/components/ai/settings-form'

export const metadata = {
  title: 'AI Ассистент | OmniTool',
  description: 'Настройка AI ассистента для автоматических ответов',
}

export default function AISettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Ассистент</h1>
        <p className="text-muted-foreground">
          Настройте AI для автоматических ответов клиентам
        </p>
      </div>

      <AISettingsForm />
    </div>
  )
}

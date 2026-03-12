import { BroadcastWizard } from '@/components/broadcasts/broadcast-wizard'

export const metadata = {
  title: 'Новая рассылка | OmniTool',
}

export default function NewBroadcastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Новая рассылка</h1>
        <p className="text-muted-foreground">Настройте аудиторию, сообщения и расписание</p>
      </div>
      <BroadcastWizard />
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Loader2, Users } from 'lucide-react'

const LEAD_STATUSES = [
  { value: 'new',         label: 'Новый' },
  { value: 'contacted',   label: 'Contacted' },
  { value: 'qualified',   label: 'Qualified' },
  { value: 'negotiation', label: 'В переговорах' },
  { value: 'won',         label: 'Закрыт (выиграл)' },
  { value: 'lost',        label: 'Закрыт (проиграл)' },
]

interface Step {
  step_order: number
  message_text: string
  delay_days: number
}

export function BroadcastWizard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('audience')
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  // Step 1 — Audience
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [messengerType, setMessengerType] = useState('all')

  // Step 2 — Steps
  const [steps, setSteps] = useState<Step[]>([
    { step_order: 0, message_text: '', delay_days: 0 },
  ])

  // Step 3 — Settings
  const [name, setName] = useState('')
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('10:00')
  const [delayBetweenSends, setDelayBetweenSends] = useState(5)

  // Load available tags
  useEffect(() => {
    fetch('/api/leads/tags')
      .then((r) => r.json())
      .then((data) => { if (data.tags) setAvailableTags(data.tags) })
      .catch(() => {})
  }, [])

  // Preview recipients (debounced)
  const fetchPreview = useCallback(() => {
    setPreviewLoading(true)
    const params = new URLSearchParams()
    if (selectedStatuses.length) params.set('statuses', selectedStatuses.join(','))
    if (selectedTags.length) params.set('tags', selectedTags.join(','))
    if (messengerType !== 'all') params.set('messenger_type', messengerType)

    fetch(`/api/broadcasts/preview-recipients?${params}`)
      .then((r) => r.json())
      .then((data) => { if (data.count !== undefined) setPreviewCount(data.count) })
      .catch(() => {})
      .finally(() => setPreviewLoading(false))
  }, [selectedStatuses, selectedTags, messengerType])

  useEffect(() => {
    const timer = setTimeout(fetchPreview, 600)
    return () => clearTimeout(timer)
  }, [fetchPreview])

  // Step management
  function addStep() {
    setSteps((prev) => [
      ...prev,
      { step_order: prev.length, message_text: '', delay_days: 1 },
    ])
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i }))
    )
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function handleSubmit(launch: boolean) {
    if (!name.trim()) {
      toast.error('Введите название рассылки')
      setActiveTab('settings')
      return
    }
    if (steps.some((s) => !s.message_text.trim())) {
      toast.error('Заполните все сообщения в цепочке')
      setActiveTab('steps')
      return
    }

    setLoading(true)
    try {
      let scheduledAt: string | null = null
      if (scheduleType === 'later' && scheduleDate) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      }

      // Create broadcast
      const createRes = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          segment_filters: { statuses: selectedStatuses, tags: selectedTags },
          messenger_type: messengerType === 'all' ? null : messengerType,
          delay_between_sends: delayBetweenSends,
          scheduled_at: scheduledAt,
          steps,
        }),
      })

      const createData = await createRes.json()
      if (!createData.success) throw new Error(createData.error)

      const broadcastId = createData.broadcast.id

      if (launch) {
        const launchRes = await fetch(`/api/broadcasts/${broadcastId}/launch`, { method: 'POST' })
        const launchData = await launchRes.json()
        if (!launchData.success) throw new Error(launchData.error)
        toast.success(`Рассылка запущена для ${launchData.contacts_count} контактов`)
      } else {
        toast.success('Черновик сохранён')
      }

      router.push('/broadcasts')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при создании рассылки')
    } finally {
      setLoading(false)
    }
  }

  const canProceedFromAudience = previewCount !== null && previewCount > 0
  const canProceedFromSteps = steps.every((s) => s.message_text.trim().length > 0)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="audience">1. Аудитория</TabsTrigger>
        <TabsTrigger value="steps">2. Сообщения</TabsTrigger>
        <TabsTrigger value="settings">3. Настройки</TabsTrigger>
        <TabsTrigger value="review">4. Запуск</TabsTrigger>
      </TabsList>

      {/* Step 1: Audience */}
      <TabsContent value="audience" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Аудитория</CardTitle>
            <CardDescription>Выберите, кому отправить рассылку</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Мессенджер</Label>
              <Select value={messengerType} onValueChange={setMessengerType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все мессенджеры</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Статус лида</Label>
              <div className="flex flex-wrap gap-2">
                {LEAD_STATUSES.map((s) => (
                  <Badge
                    key={s.value}
                    variant={selectedStatuses.includes(s.value) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleStatus(s.value)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Не выбрано = все статусы</p>
            </div>

            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Теги</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Не выбрано = все теги</p>
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              {previewLoading ? (
                <span className="text-sm text-muted-foreground">Подсчёт контактов...</span>
              ) : previewCount !== null ? (
                <span className="text-sm font-medium">
                  {previewCount > 0
                    ? `${previewCount} контактов получат рассылку`
                    : 'Нет контактов по выбранным фильтрам'}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={() => setActiveTab('steps')} disabled={!canProceedFromAudience}>
            Далее →
          </Button>
        </div>
      </TabsContent>

      {/* Step 2: Message Chain */}
      <TabsContent value="steps" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Цепочка сообщений</CardTitle>
            <CardDescription>Добавьте одно или несколько сообщений с задержками</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Сообщение {index + 1}
                  </span>
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {index > 0 && (
                  <div className="flex items-center gap-3">
                    <Label className="whitespace-nowrap text-sm">Отправить через</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={step.delay_days}
                      onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">дней после предыдущего</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Textarea
                    placeholder="Текст сообщения..."
                    value={step.message_text}
                    onChange={(e) => updateStep(index, 'message_text', e.target.value)}
                    rows={3}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {step.message_text.length} символов
                  </p>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addStep} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Добавить следующее сообщение
            </Button>
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setActiveTab('audience')}>← Назад</Button>
          <Button onClick={() => setActiveTab('settings')} disabled={!canProceedFromSteps}>Далее →</Button>
        </div>
      </TabsContent>

      {/* Step 3: Settings */}
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Настройки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Название рассылки</Label>
              <Input
                placeholder="Например: Акция июль 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Когда отправить</Label>
              <div className="flex gap-3">
                <Button
                  variant={scheduleType === 'now' ? 'default' : 'outline'}
                  onClick={() => setScheduleType('now')}
                >
                  Сразу после запуска
                </Button>
                <Button
                  variant={scheduleType === 'later' ? 'default' : 'outline'}
                  onClick={() => setScheduleType('later')}
                >
                  Запланировать
                </Button>
              </div>
              {scheduleType === 'later' && (
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-44"
                  />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Задержка между отправками</Label>
                <span className="text-sm font-medium">{delayBetweenSends} сек</span>
              </div>
              <Slider
                min={0}
                max={30}
                step={1}
                value={[delayBetweenSends]}
                onValueChange={([v]) => setDelayBetweenSends(v)}
              />
              <p className="text-xs text-muted-foreground">
                Для WhatsApp рекомендуется 5–10 секунд во избежание блокировки аккаунта
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setActiveTab('steps')}>← Назад</Button>
          <Button onClick={() => setActiveTab('review')} disabled={!name.trim()}>Далее →</Button>
        </div>
      </TabsContent>

      {/* Step 4: Review */}
      <TabsContent value="review" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Проверка и запуск</CardTitle>
            <CardDescription>Убедитесь, что всё настроено правильно</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Название</span>
                <p className="font-medium">{name || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Мессенджер</span>
                <p className="font-medium">
                  {messengerType === 'all' ? 'Все' : messengerType === 'telegram' ? 'Telegram' : 'WhatsApp'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Аудитория</span>
                <p className="font-medium">{previewCount ?? '—'} контактов</p>
              </div>
              <div>
                <span className="text-muted-foreground">Расписание</span>
                <p className="font-medium">
                  {scheduleType === 'now'
                    ? 'Сразу'
                    : scheduleDate
                    ? `${scheduleDate} ${scheduleTime}`
                    : 'Не задано'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Задержка</span>
                <p className="font-medium">{delayBetweenSends} сек между получателями</p>
              </div>
              <div>
                <span className="text-muted-foreground">Сообщений в цепочке</span>
                <p className="font-medium">{steps.length}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Цепочка сообщений:</p>
              {steps.map((step, index) => (
                <div key={index} className="rounded-md bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">
                    {index === 0 ? 'Сразу' : `Через ${step.delay_days} дн. →`}{' '}
                  </span>
                  {step.message_text.slice(0, 80)}{step.message_text.length > 80 ? '...' : ''}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setActiveTab('settings')}>← Назад</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={loading}>
              Сохранить черновик
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={loading || !previewCount}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Запустить рассылку
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

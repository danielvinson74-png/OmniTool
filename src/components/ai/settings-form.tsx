'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Play, Bot, Key, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AISettings {
  id?: string
  is_enabled: boolean
  model: string
  temperature: number
  max_tokens: number
  system_prompt: string
  auto_reply_delay_seconds: number
  context_messages_count: number
  has_api_key?: boolean
  api_key_masked?: string
}

const defaultSettings: AISettings = {
  is_enabled: false,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 500,
  system_prompt: 'Ты вежливый помощник компании. Отвечай кратко и по делу на русском языке.',
  auto_reply_delay_seconds: 2,
  context_messages_count: 10,
}

const models = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Самая умная, дороже' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Оптимальный баланс' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Быстрая и умная' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Самая дешёвая' },
]

export function AISettingsForm() {
  const [settings, setSettings] = useState<AISettings>(defaultSettings)
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/ai/settings')
      const data = await response.json()

      if (data.success && data.settings) {
        setSettings({ ...defaultSettings, ...data.settings })
      }
    } catch (error) {
      console.error('Failed to fetch AI settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          api_key: apiKey || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSettings({ ...defaultSettings, ...data.settings })
        setApiKey('')
        toast.success('Настройки сохранены')
      } else {
        toast.error(data.error || 'Ошибка сохранения')
      }
    } catch (error) {
      toast.error('Ошибка сохранения настроек')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Привет! Кто ты?' }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult(data.response)
        toast.success('Тест успешен!')
      } else {
        toast.error(data.error || 'Ошибка теста')
      }
    } catch (error) {
      toast.error('Ошибка тестирования')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable AI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <Bot className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <CardTitle>AI Ассистент</CardTitle>
                <CardDescription>Автоматические ответы клиентам</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_enabled: checked })
              }
            />
          </div>
        </CardHeader>
        {settings.is_enabled && !settings.has_api_key && !apiKey && (
          <CardContent>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Введите API ключ для работы AI</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Key className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>API Ключ</CardTitle>
              <CardDescription>
                Получите ключ на{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com
                </a>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.has_api_key && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-600">
                Ключ сохранён: {settings.api_key_masked}
              </Badge>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              {settings.has_api_key ? 'Новый API ключ (опционально)' : 'API ключ'}
            </Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Настройки модели</CardTitle>
              <CardDescription>Выберите модель и параметры генерации</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Select */}
          <div className="space-y-2">
            <Label>Модель</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => setSettings({ ...settings, model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{model.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Креативность</Label>
              <span className="text-sm text-muted-foreground">
                {settings.temperature}
              </span>
            </div>
            <Slider
              value={[settings.temperature]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([value]) =>
                setSettings({ ...settings, temperature: value })
              }
            />
            <p className="text-xs text-muted-foreground">
              0 = точные ответы, 2 = креативные ответы
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Максимум токенов</Label>
              <span className="text-sm text-muted-foreground">
                {settings.max_tokens}
              </span>
            </div>
            <Slider
              value={[settings.max_tokens]}
              min={50}
              max={2000}
              step={50}
              onValueChange={([value]) =>
                setSettings({ ...settings, max_tokens: value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Ограничивает длину ответа AI
            </p>
          </div>

          {/* Context Messages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Сообщений в контексте</Label>
              <span className="text-sm text-muted-foreground">
                {settings.context_messages_count}
              </span>
            </div>
            <Slider
              value={[settings.context_messages_count]}
              min={1}
              max={30}
              step={1}
              onValueChange={([value]) =>
                setSettings({ ...settings, context_messages_count: value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Сколько предыдущих сообщений AI видит
            </p>
          </div>

          {/* Reply Delay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Задержка ответа (сек)</Label>
              <span className="text-sm text-muted-foreground">
                {settings.auto_reply_delay_seconds}
              </span>
            </div>
            <Slider
              value={[settings.auto_reply_delay_seconds]}
              min={0}
              max={10}
              step={1}
              onValueChange={([value]) =>
                setSettings({ ...settings, auto_reply_delay_seconds: value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Имитация набора текста
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Системный промпт</CardTitle>
          <CardDescription>
            Инструкции для AI как общаться с клиентами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.system_prompt}
            onChange={(e) =>
              setSettings({ ...settings, system_prompt: e.target.value })
            }
            rows={6}
            placeholder="Опишите, как AI должен общаться..."
          />
        </CardContent>
      </Card>

      {/* Test Result */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ответ AI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{testResult}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Сохранить
        </Button>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testing || !settings.has_api_key && !apiKey}
        >
          {testing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Тест
        </Button>
      </div>
    </div>
  )
}

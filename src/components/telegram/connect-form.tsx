'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ConnectFormProps {
  isConnected: boolean
  botUsername?: string
  onSuccess?: () => void
}

export function TelegramConnectForm({ isConnected, botUsername, onSuccess }: ConnectFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to connect')
        return
      }

      setSuccess(true)
      setToken('')

      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        router.refresh()
        onSuccess?.()
      }, 1500)
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Вы уверены, что хотите отключить Telegram бота?')) {
      return
    }

    setDisconnecting(true)

    try {
      const response = await fetch('/api/telegram/connect', {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch {
      console.error('Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }

  if (isConnected) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Бот: @{botUsername}
        </p>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Переподключить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Подключить Telegram бота</DialogTitle>
                <DialogDescription>
                  Введите токен бота, полученный от @BotFather
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConnect}>
                <div className="space-y-4 py-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="border-green-500 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>Бот успешно подключен!</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="token">Токен бота</Label>
                    <Input
                      id="token"
                      placeholder="123456789:ABC..."
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      disabled={loading || success}
                    />
                    <p className="text-xs text-muted-foreground">
                      Получите токен у @BotFather командой /newbot или /token
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={loading || !token || success}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {success ? 'Подключено!' : 'Подключить'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Отключить
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Подключить Telegram</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подключить Telegram бота</DialogTitle>
          <DialogDescription>
            Введите токен бота, полученный от @BotFather
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConnect}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-500 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Бот успешно подключен!</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="token-new">Токен бота</Label>
              <Input
                id="token-new"
                placeholder="123456789:ABC..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading || success}
              />
              <p className="text-xs text-muted-foreground">
                Получите токен у @BotFather командой /newbot или /token
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !token || success}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {success ? 'Подключено!' : 'Подключить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Phone, CheckCircle2, XCircle, RefreshCw, QrCode } from 'lucide-react'
import { toast } from 'sonner'

type SessionStatus = 'disconnected' | 'qr' | 'connecting' | 'ready'

interface WhatsAppConnectFormProps {
  initialConnection?: {
    is_active: boolean
    credentials?: {
      phone_number?: string
      pushname?: string
    }
  } | null
  onStatusChange?: (connected: boolean) => void
}

export function WhatsAppConnectForm({ initialConnection, onStatusChange }: WhatsAppConnectFormProps) {
  const [status, setStatus] = useState<SessionStatus>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(
    initialConnection?.credentials?.phone_number || null
  )
  const [pushname, setPushname] = useState<string | null>(
    initialConnection?.credentials?.pushname || null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  // Check initial status
  useEffect(() => {
    if (initialConnection?.is_active) {
      checkStatus()
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  const checkStatus = async (includeQr = false) => {
    try {
      const response = await fetch(`/api/whatsapp/status${includeQr ? '?qr=true' : ''}`)
      const data = await response.json()

      if (data.success) {
        setStatus(data.status)

        if (data.qrCode) {
          setQrCode(data.qrCode)
        }

        if (data.phoneNumber) {
          setPhoneNumber(data.phoneNumber)
        }

        if (data.pushname) {
          setPushname(data.pushname)
        }

        if (data.status === 'ready') {
          onStatusChange?.(true)
          // Stop polling when connected
          if (pollInterval) {
            clearInterval(pollInterval)
            setPollInterval(null)
          }
        }
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const startPolling = useCallback(() => {
    // Clear existing interval
    if (pollInterval) {
      clearInterval(pollInterval)
    }

    // Poll every 2 seconds
    const interval = setInterval(() => {
      checkStatus(true)
    }, 2000)

    setPollInterval(interval)
  }, [pollInterval])

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)
    setQrCode(null)

    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      setStatus(data.status)
      if (data.qrCode) {
        setQrCode(data.qrCode)
      }

      // Start polling for QR updates
      startPolling()

      toast.success('Сессия запущена. Отсканируйте QR-код.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      // Stop polling
      if (pollInterval) {
        clearInterval(pollInterval)
        setPollInterval(null)
      }

      setStatus('disconnected')
      setQrCode(null)
      setPhoneNumber(null)
      setPushname(null)
      onStatusChange?.(false)

      toast.success('WhatsApp отключён')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStatusBadge = () => {
    switch (status) {
      case 'ready':
        return (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Подключено</span>
          </div>
        )
      case 'qr':
        return (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <QrCode className="h-4 w-4" />
            <span>Ожидание сканирования</span>
          </div>
        )
      case 'connecting':
        return (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Подключение...</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span>Не подключено</span>
          </div>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Phone className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Подключение через QR-код</CardDescription>
            </div>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === 'ready' && phoneNumber && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Номер телефона</span>
                <span className="font-medium">+{phoneNumber}</span>
              </div>
              {pushname && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Имя профиля</span>
                  <span className="font-medium">{pushname}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(status === 'qr' || status === 'connecting') && qrCode && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border bg-white p-4">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="h-64 w-64"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Откройте WhatsApp на телефоне → Настройки → Связанные устройства → Привязать устройство
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkStatus(true)}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить QR-код
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {status === 'disconnected' && (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Подключение...
                </>
              ) : (
                'Подключить WhatsApp'
              )}
            </Button>
          )}

          {status === 'ready' && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отключение...
                </>
              ) : (
                'Отключить'
              )}
            </Button>
          )}

          {(status === 'qr' || status === 'connecting') && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              Отмена
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          После сканирования QR-кода все входящие сообщения будут автоматически сохраняться в системе.
          Вы сможете отвечать на сообщения прямо из интерфейса.
        </p>
      </CardContent>
    </Card>
  )
}

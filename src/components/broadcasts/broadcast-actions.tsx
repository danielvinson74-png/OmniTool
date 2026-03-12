'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle } from 'lucide-react'

interface BroadcastActionsProps {
  broadcastId: string
  status: string
}

export function BroadcastActions({ broadcastId, status }: BroadcastActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const canCancel = status === 'scheduled' || status === 'sending'

  async function handleCancel() {
    if (!confirm('Отменить рассылку? Все ожидающие сообщения будут пропущены.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/broadcasts/${broadcastId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Рассылка отменена')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при отмене')
    } finally {
      setLoading(false)
    }
  }

  if (!canCancel) return null

  return (
    <Button variant="outline" onClick={handleCancel} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
      Отменить
    </Button>
  )
}

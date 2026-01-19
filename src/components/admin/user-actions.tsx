'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Shield, ShieldOff, Trash2, Loader2 } from 'lucide-react'

interface UserActionsProps {
  userId: string
  userRole: string
}

export function UserActions({ userId, userRole }: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleToggleRole = async () => {
    if (!confirm(`Изменить роль пользователя на ${userRole === 'admin' ? 'user' : 'admin'}?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: userRole === 'admin' ? 'user' : 'admin'
        })
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить пользователя? Это действие нельзя отменить.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Действия</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleToggleRole}>
          {userRole === 'admin' ? (
            <>
              <ShieldOff className="mr-2 h-4 w-4" />
              Снять права админа
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Сделать админом
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

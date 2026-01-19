'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Send,
  Loader2,
  Phone,
  Mail,
  User,
  MessageCircle,
  Bot,
  BotOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  message_text: string
  message_type: string
  sender_type: 'user' | 'lead' | 'system' | 'ai'
  sender_id?: string
  status: string
  created_at: string
  attachments?: unknown[]
}

interface Lead {
  id: string
  name: string
  username?: string
  phone?: string
  email?: string
  status: string
}

interface Conversation {
  id: string
  title: string
  messenger_type: string
  external_chat_id: string
  status: string
  leads?: Lead
  ai_enabled?: boolean
}

interface ChatWindowProps {
  conversation: Conversation
  initialMessages: Message[]
  currentUserId: string
}

export function ChatWindow({ conversation, initialMessages, currentUserId }: ChatWindowProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(conversation.ai_enabled ?? true)
  const [togglingAi, setTogglingAi] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const lead = conversation.leads

  const handleToggleAi = async () => {
    setTogglingAi(true)
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/ai`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_enabled: !aiEnabled })
      })

      const data = await response.json()

      if (data.success) {
        setAiEnabled(data.ai_enabled)
        toast.success(data.ai_enabled ? 'AI включён' : 'AI выключен')
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch {
      toast.error('Ошибка переключения AI')
    } finally {
      setTogglingAi(false)
    }
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation.id, supabase])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      message_text: messageText,
      message_type: 'text',
      sender_type: 'user',
      sender_id: currentUserId,
      status: 'pending',
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: messageText
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send')
      }

      const data = await response.json()

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id
            ? { ...data.message, status: 'sent' }
            : m
        )
      )
    } catch {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id
            ? { ...m, status: 'failed' }
            : m
        )
      )
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера'
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ''

  messages.forEach((message) => {
    const messageDate = formatDate(message.created_at)
    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: messageDate, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  })

  const initials = lead?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || conversation.title?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-0 flex-col md:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-4 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/conversations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{conversation.title || lead?.name || 'Диалог'}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs shrink-0">
              <MessageCircle className="mr-1 h-3 w-3" />
              {conversation.messenger_type}
            </Badge>
            {lead?.username && <span className="truncate">@{lead.username}</span>}
          </div>
        </div>

        <div className="flex gap-1 sm:gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={aiEnabled ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-8 w-8 sm:h-9 sm:w-9',
                    aiEnabled && 'bg-violet-500 hover:bg-violet-600 text-white'
                  )}
                  onClick={handleToggleAi}
                  disabled={togglingAi}
                >
                  {togglingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : aiEnabled ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <BotOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{aiEnabled ? 'AI включён — нажмите чтобы выключить' : 'AI выключен — нажмите чтобы включить'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {lead && (
            <>
              {lead.phone && (
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9" asChild>
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => router.push(`/crm/${lead.id}`)}>
                <User className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {groupedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Нет сообщений
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center py-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {group.date}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.messages.map((message) => {
                    const isOutgoing = message.sender_type === 'user' || message.sender_type === 'ai'
                    const isAi = message.sender_type === 'ai'
                    const isFailed = message.status === 'failed'
                    const isPending = message.status === 'pending'

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex px-1',
                          isOutgoing ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <Card
                          className={cn(
                            'max-w-[85%] sm:max-w-[70%] px-3 py-2',
                            isAi
                              ? 'bg-violet-500 text-white'
                              : isOutgoing
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted',
                            isFailed && 'border-destructive bg-destructive/10'
                          )}
                        >
                          {isAi && (
                            <div className="flex items-center gap-1 mb-1 text-xs text-violet-200">
                              <Bot className="h-3 w-3" />
                              <span>AI</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm">
                            {message.message_text}
                          </p>
                          <div
                            className={cn(
                              'mt-1 flex items-center gap-1 text-xs',
                              isAi
                                ? 'text-violet-200'
                                : isOutgoing
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                            )}
                          >
                            <span>{formatTime(message.created_at)}</span>
                            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            {isFailed && <span className="text-destructive">Ошибка</span>}
                          </div>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 border-t pt-4">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Введите сообщение..."
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={!newMessage.trim() || sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}

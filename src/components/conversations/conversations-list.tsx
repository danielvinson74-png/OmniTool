'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MessageSquare, Search } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ConversationsList({ conversations }: { conversations: any[] }) {
  const [query, setQuery] = useState('')

  const filtered = conversations.filter((c) => {
    const name = (c.leads?.name || c.leads?.username || '').toLowerCase()
    const preview = (c.last_message_preview || '').toLowerCase()
    const q = query.toLowerCase()
    return name.includes(q) || preview.includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или сообщению..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((conversation) => (
            <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conversation.leads?.name || conversation.leads?.username || 'Без имени'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message_preview || 'Нет сообщений'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Ничего не найдено</CardTitle>
            <CardDescription>Попробуйте изменить запрос</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

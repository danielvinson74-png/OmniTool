'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'

interface QuickReply {
  id: string
  title: string
  text: string
}

export function QuickRepliesManager() {
  const [items, setItems] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/quick-replies')
      .then(r => r.json())
      .then(data => { setItems(data || []); setLoading(false) })
  }, [])

  const handleAdd = async () => {
    if (!newTitle.trim() || !newText.trim()) return
    setSaving(true)
    const res = await fetch('/api/quick-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, text: newText }),
    })
    const data = await res.json()
    setItems(prev => [...prev, data])
    setNewTitle('')
    setNewText('')
    setAdding(false)
    setSaving(false)
  }

  const handleEdit = (item: QuickReply) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditText(item.text)
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    const res = await fetch(`/api/quick-replies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, text: editText }),
    })
    const data = await res.json()
    setItems(prev => prev.map(i => i.id === id ? data : i))
    setEditingId(null)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <p className="text-muted-foreground">Загрузка...</p>

  return (
    <div className="space-y-4">
      {items.map(item => (
        <Card key={item.id}>
          <CardContent className="p-4">
            {editingId === item.id ? (
              <div className="space-y-2">
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Название шаблона"
                />
                <Textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  placeholder="Текст шаблона"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(item.id)} disabled={saving}>
                    <Check className="h-4 w-4 mr-1" /> Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4 mr-1" /> Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {adding ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Новый шаблон</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Название (напр. «Приветствие»)"
            />
            <Textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Текст шаблона..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={saving || !newTitle.trim() || !newText.trim()}>
                <Check className="h-4 w-4 mr-1" /> Добавить
              </Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setNewTitle(''); setNewText('') }}>
                <X className="h-4 w-4 mr-1" /> Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Добавить шаблон
        </Button>
      )}
    </div>
  )
}

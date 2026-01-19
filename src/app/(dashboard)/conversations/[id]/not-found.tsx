import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquareOff, MessageSquare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ConversationNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MessageSquareOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Диалог не найден</CardTitle>
          <CardDescription>
            Диалог не существует или был удалён
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/conversations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/conversations">
                <MessageSquare className="mr-2 h-4 w-4" />
                Все диалоги
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

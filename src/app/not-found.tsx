import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion, Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">404</CardTitle>
          <CardDescription className="text-base">
            Страница не найдена
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-sm text-muted-foreground">
            Запрашиваемая страница не существует или была перемещена
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              На главную
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

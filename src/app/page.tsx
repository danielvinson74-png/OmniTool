import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare, Users, Zap, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">OmniTool</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link href="/register">
              <Button>Начать бесплатно</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container flex flex-1 flex-col items-center justify-center gap-8 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Все мессенджеры.<br />
          <span className="text-primary">Один дашборд.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Объединяйте диалоги из Telegram, WhatsApp, Avito и других платформ.
          Управляйте клиентами с помощью встроенной CRM.
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <Button size="lg">Попробовать бесплатно</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">Войти в аккаунт</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Возможности</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Все диалоги</h3>
            <p className="text-sm text-muted-foreground">
              Telegram, WhatsApp, Avito, VK в одном месте
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Встроенная CRM</h3>
            <p className="text-sm text-muted-foreground">
              Карточки клиентов, статусы, история
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Быстрые ответы</h3>
            <p className="text-sm text-muted-foreground">
              Отвечайте клиентам прямо из дашборда
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Безопасность</h3>
            <p className="text-sm text-muted-foreground">
              Шифрование данных, RLS политики
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container text-center">
          <h2 className="mb-4 text-3xl font-bold">Начните прямо сейчас</h2>
          <p className="mb-8 text-muted-foreground">
            Бесплатный план включает 50 диалогов в месяц
          </p>
          <Link href="/register">
            <Button size="lg">Создать аккаунт</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>2024 OmniTool. Все права защищены.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground">Политика конфиденциальности</Link>
            <Link href="#" className="hover:text-foreground">Условия использования</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

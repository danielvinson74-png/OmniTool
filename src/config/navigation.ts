import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  User,
  CreditCard,
  Shield,
  Bot,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const mainNavigation: NavSection[] = [
  {
    items: [
      {
        title: 'Дашборд',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Диалоги',
        href: '/conversations',
        icon: MessageSquare,
      },
      {
        title: 'CRM',
        href: '/crm',
        icon: Users,
      },
    ],
  },
  {
    title: 'Настройки',
    items: [
      {
        title: 'Интеграции',
        href: '/settings/integrations',
        icon: Settings,
      },
      {
        title: 'AI Ассистент',
        href: '/settings/ai',
        icon: Bot,
      },
      {
        title: 'Профиль',
        href: '/account',
        icon: User,
      },
      {
        title: 'Подписка',
        href: '/account/subscription',
        icon: CreditCard,
      },
    ],
  },
]

export const adminNavigation: NavSection = {
  title: 'Администрирование',
  items: [
    {
      title: 'Админ-панель',
      href: '/admin',
      icon: Shield,
    },
  ],
}

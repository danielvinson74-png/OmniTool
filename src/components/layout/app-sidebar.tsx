'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { mainNavigation, adminNavigation, type NavSection } from '@/config/navigation'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'

interface AppSidebarProps {
  isAdmin?: boolean
}

function NavGroup({ section }: { section: NavSection }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {section.title && (
        <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold">OmniTool</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {mainNavigation.map((section, index) => (
          <NavGroup key={index} section={section} />
        ))}

        {isAdmin && <NavGroup section={adminNavigation} />}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground text-center">
          OmniTool v1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

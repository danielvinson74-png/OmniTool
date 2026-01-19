'use client'

import { Sparkles } from 'lucide-react'

interface WelcomeBannerProps {
  name: string
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl animate-pulse" />
        <div className="absolute right-10 top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5 blur-3xl animate-pulse delay-500" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white/80">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">Добро пожаловать</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Привет, {name}!
        </h1>
        <p className="mt-2 max-w-lg text-white/80">
          Управляйте диалогами из всех мессенджеров в одном месте.
          Вот обзор вашей активности на сегодня.
        </p>
      </div>

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

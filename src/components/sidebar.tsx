'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Home, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface SidebarProps {
  user?: {
    email?: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home,
      active: pathname === '/'
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname === '/settings'
    }
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <aside className="w-64 border-r" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Lookas</h1>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={item.active ? { 
                backgroundColor: 'var(--overlay-10)', 
                color: 'var(--color-text-primary)' 
              } : {
                color: 'var(--color-text-secondary)'
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
          {user?.email && (
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {user.email}
                </p>
              </div>
              <ThemeToggle />
            </div>
          )}
          
          {!user?.email && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Theme</span>
              <ThemeToggle />
            </div>
          )}
          
          {user?.email && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
} 
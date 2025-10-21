'use client'

import React from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function Navigation() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <nav aria-label="Huvudnavigering" className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Gå till startsidan"
            className="text-xl font-bold text-neutral-900 dark:text-neutral-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Riksdagsgranskning
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/medlemmar"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
            >
              Medlemmar
            </Link>
            <Link
              href="/partier"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
            >
              Partier
            </Link>
            <Link
              href="/motioner"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
            >
              Motioner
            </Link>
            <Link
              href="/analys"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
            >
              Analys
            </Link>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Växla till ljust läge' : 'Växla till mörkt läge'}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Öppna navigeringsmeny"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/medlemmar">Medlemmar</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/partier">Partier</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/motioner">Motioner</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/analys">Analys</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}

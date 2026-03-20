'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

/**
 * ThemeProvider
 *
 * Wraps next-themes with the right defaults:
 * - attribute="class"  → adds/removes .dark on <html>
 * - defaultTheme="system" → respects OS preference on first visit
 * - enableSystem       → syncs with prefers-color-scheme
 * - storageKey="ui-theme" → localStorage key
 * - disableTransitionOnChange={false} → keep our CSS transitions
 *
 * Drop this at the root of your app (e.g. app/layout.tsx):
 *
 *   <ThemeProvider>
 *     {children}
 *   </ThemeProvider>
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="ui-theme"
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
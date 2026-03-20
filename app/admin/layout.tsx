"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard, Settings, Users, Menu, X,
  LogOut, ChevronLeft, Calendar, Shield,
  ChevronRight, PanelLeftClose, PanelLeftOpen,
  Sun, Moon,
} from "lucide-react"
import { Toaster } from "@/components/ui/toaster"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Providers", href: "/admin/providers", icon: Users },
  { name: "Appointments", href: "/admin/appointments", icon: Calendar },
]

const COLLAPSED_KEY = "admin_sidebar_collapsed"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isDark = mounted && resolvedTheme === "dark"

  const toggleTheme = () => setTheme(isDark ? "light" : "dark")

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (saved !== null) setCollapsed(saved === "true")
    setMounted(true)
  }, [])

  // If login page — render children only, no shell
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  const toggleCollapse = () => {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSED_KEY, String(!v))
      return !v
    })
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push("/admin/login")
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex">
          {mobileOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={cn(
            "fixed top-0 left-0 z-50 h-full bg-card/95 backdrop-blur-sm border-r border-border shadow-xl",
            "transition-all duration-300 ease-in-out flex flex-col",
            "lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "w-64",
            mounted && collapsed ? "lg:w-[68px]" : "lg:w-64",
          )}>
            {/* Sidebar header */}
            <div className={cn(
              "flex items-center border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 shrink-0 transition-all duration-300",
              mounted && collapsed ? "lg:px-3 lg:py-4 lg:justify-center px-5 py-[18px] justify-between" : "px-5 py-[18px] justify-between",
            )}>

              {/* COLLAPSED (desktop only): logo button = click to expand */}
              {mounted && collapsed ? (
                <>
                  <button
                    onClick={toggleCollapse}
                    className="hidden lg:flex items-center justify-center group"
                    title="Expand sidebar"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-200">
                      <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </button>
                  {/* Mobile: show full header */}
                  <div className="flex items-center gap-3 lg:hidden">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                      <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-base whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Admin Panel
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                /* EXPANDED: logo + title + collapse button */
                <>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                      <Shield className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-base whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Admin Panel
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon"
                      className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      onClick={toggleCollapse}
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileOpen(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}

            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const btn = (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-10 font-medium transition-all duration-200 group",
                        collapsed ? "lg:justify-center lg:px-0 justify-start gap-3 px-3" : "justify-start gap-3 px-3",
                        isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary border border-primary/20"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className={cn(
                        "shrink-0",
                        collapsed ? "lg:w-5 lg:h-5 w-4 h-4" : "w-4 h-4",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )} />
                      <span className={cn("truncate", collapsed && "lg:hidden")}>
                        {item.name}
                      </span>
                      {isActive && !collapsed && (
                        <ChevronRight className="w-3 h-3 ml-auto text-primary/60" />
                      )}
                    </Button>
                  </Link>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild className="hidden lg:block">
                        <div>{btn}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">{item.name}</TooltipContent>
                    </Tooltip>
                  )
                }
                return <div key={item.name}>{btn}</div>
              })}
            </nav>

            {/* Expand button — shown only when collapsed, desktop only */}
            {mounted && collapsed && (
              <div className="hidden lg:flex justify-center py-2 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      onClick={toggleCollapse}
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand sidebar</TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Footer */}
            <div className={cn(
              "border-t border-border bg-muted/20 shrink-0 transition-all duration-300 flex flex-col gap-1.5",
              collapsed ? "p-2" : "p-3",
            )}>
              {/* Back to Chat */}
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/">
                      <Button variant="ghost" size="icon" className="w-full h-10 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Back to Chat</TooltipContent>
                </Tooltip>
              ) : (
                <Link href="/">
                  <Button variant="outline" className="w-full justify-start gap-3 h-10 font-medium hover:bg-accent transition-all duration-200 text-sm">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Chat
                  </Button>
                </Link>
              )}
              {/* Theme toggle */}
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="w-full h-10 text-muted-foreground hover:text-foreground"
                      onClick={toggleTheme}
                    >
                      {isDark
                        ? <Sun className="w-4 h-4 text-amber-400" />
                        : <Moon className="w-4 h-4" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{isDark ? "Light Mode" : "Dark Mode"}</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isDark
                      ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                      isDark ? "bg-amber-500/20 text-amber-400" : "bg-slate-800/10 text-slate-600",
                    )}>
                      {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </span>
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </span>
                  <span className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300",
                    isDark ? "bg-primary" : "bg-slate-300",
                  )}>
                    <span className={cn(
                      "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-300",
                      isDark ? "translate-x-4" : "translate-x-1",
                    )} />
                  </span>
                </button>
              )}
            </div>
          </aside>

          {/* Main */}
          <div className={cn(
            "flex-1 min-w-0 transition-all duration-300",
            mounted && collapsed ? "lg:pl-[68px]" : "lg:pl-64",
          )}>
            <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>/</span>
                  <span className="text-foreground font-medium">
                    {navigation.find((n) => n.href === pathname)?.name ?? "Admin"}
                  </span>
                </div>
                <div className="flex-1 lg:flex-none" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2.5 px-2.5 h-10 hover:bg-accent/50">
                      <Avatar className="w-8 h-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-xs">AD</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline-block font-medium text-sm">Admin</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm">Admin</span>
                        <span className="text-xs text-muted-foreground">admin@newflexai.com</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <main className="p-4 xl:px-10 h-[calc(100vh-72px)]">
              <div className="w-full mx-auto flex flex-col h-full">{children}</div>
            </main>
          </div>
        </div>
      </TooltipProvider>
      <Toaster />
    </>
  )
}

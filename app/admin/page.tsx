"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users, LayoutDashboard, MapPin, Monitor,
  Building2, Zap, ArrowRight, RefreshCw,
  Loader2, CheckCircle2, XCircle, TrendingUp,
  Stethoscope, Globe,
} from "lucide-react"

type ProviderStats = {
  total: number
  telemed: number
  inPerson: number
  workersComp: number
  pi: number
  bySpecialty: { name: string; count: number }[]
  byState: { name: string; count: number }[]
  recentProviders: { id: number; provider_name: string; specialty?: string; city?: string; state?: string; created_at?: string }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/providers")
      if (!res.ok) throw new Error()
      const data = await res.json()
      const providers: any[] = data.providers ?? []

      // Compute stats client-side
      const bySpecialtyMap: Record<string, number> = {}
      const byStateMap: Record<string, number> = {}

      providers.forEach((p) => {
        if (p.specialty) bySpecialtyMap[p.specialty] = (bySpecialtyMap[p.specialty] ?? 0) + 1
        if (p.state) byStateMap[p.state] = (byStateMap[p.state] ?? 0) + 1
      })

      setStats({
        total: providers.length,
        telemed: providers.filter((p) => p.telemed).length,
        inPerson: providers.filter((p) => p.in_person).length,
        workersComp: providers.filter((p) => p.workers_comp).length,
        pi: providers.filter((p) => p.pi).length,
        bySpecialty: Object.entries(bySpecialtyMap)
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([name, count]) => ({ name, count })),
        byState: Object.entries(byStateMap)
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([name, count]) => ({ name, count })),
        recentProviders: [...providers]
          .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
          .slice(0, 5),
      })
      setLastUpdated(new Date())
    } catch {
      // fail silently — show zeros
      setStats({ total: 0, telemed: 0, inPerson: 0, workersComp: 0, pi: 0, bySpecialty: [], byState: [], recentProviders: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl shrink-0">
            <LayoutDashboard className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Overview of your medical provider network.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      )}

      {stats && (
        <>
          {/* ── Top stat cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Providers"
              value={stats.total}
              icon={<Users className="w-5 h-5 text-primary" />}
              accent="primary"
              href="/admin/providers"
            />
            <StatCard
              title="Telemed Available"
              value={stats.telemed}
              icon={<Monitor className="w-5 h-5 text-blue-500" />}
              accent="blue"
            />
            <StatCard
              title="Workers Comp"
              value={stats.workersComp}
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              accent="amber"
            />
          </div>

          {/* ── Secondary stats row ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="In-Person" value={stats.inPerson} icon={<Building2 className="w-4 h-4 text-violet-500" />} />
            <MiniStat label="Personal Injury (PI)" value={stats.pi} icon={<TrendingUp className="w-4 h-4 text-rose-500" />} />
            <MiniStat label="States Covered" value={stats.byState.length} icon={<MapPin className="w-4 h-4 text-indigo-500" />} />
          </div>

          {/* ── Bottom section ── */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* By Specialty */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Top Specialties
                </CardTitle>
                <CardDescription>Providers by specialty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.bySpecialty.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
                {stats.bySpecialty.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                      <span className="text-sm truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Bar */}
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${Math.round((s.count / stats.total) * 100)}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[24px] justify-center">
                        {s.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* By State */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4 text-primary" />
                  Top States
                </CardTitle>
                <CardDescription>Providers by location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.byState.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
                {stats.byState.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-400/70"
                          style={{ width: `${Math.round((s.count / stats.total) * 100)}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[24px] justify-center">
                        {s.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recently added */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Recently Added
                    </CardTitle>
                    <CardDescription className="mt-0.5">Latest providers</CardDescription>
                  </div>
                  <Link href="/admin/providers">
                    <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground">
                      View all <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.recentProviders.length === 0 && (
                  <p className="text-sm text-muted-foreground">No providers yet</p>
                )}
                {stats.recentProviders.map((p) => (
                  <div key={p.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.provider_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[p.specialty, p.city, p.state].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card className="border-dashed">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">Quick Actions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Jump to the most used sections</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/admin/providers">
                    <Button variant="outline" size="sm" className="gap-2 h-9">
                      <Users className="w-4 h-4" /> Manage Providers
                    </Button>
                  </Link>
                  <Link href="/admin/appointments">
                    <Button variant="outline" size="sm" className="gap-2 h-9">
                      <Building2 className="w-4 h-4" /> Appointments
                    </Button>
                  </Link>
                  <Link href="/admin/ai-settings">
                    <Button variant="outline" size="sm" className="gap-2 h-9">
                      <TrendingUp className="w-4 h-4" /> AI Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon, accent, sub, href,
}: {
  title: string
  value: number
  icon: React.ReactNode
  accent: "primary" | "green" | "blue" | "amber"
  sub?: string
  href?: string
}) {
  const accentBg = {
    primary: "bg-primary/10",
    green: "bg-green-50 dark:bg-green-950/20",
    blue: "bg-blue-50 dark:bg-blue-950/20",
    amber: "bg-amber-50 dark:bg-amber-950/20",
  }[accent]

  const card = (
    <Card className={`hover:border-primary/40 hover:shadow-sm transition-all duration-200 ${href ? "cursor-pointer" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {href && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </p>
        )}
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{card}</Link> : card
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50 hover:border-border/80 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}
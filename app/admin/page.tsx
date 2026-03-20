"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent,
  TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Users, LayoutDashboard, MapPin, Monitor,
  Building2, Zap, ArrowRight, RefreshCw,
  Loader2, TrendingUp, Stethoscope, Globe,
  CalendarClock, CheckCircle2, Activity,
  Languages, Cpu, TriangleAlert, Scale,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react"

type Tab = "overview" | "providers" | "appointments"

const REQUIRED_SPECIALTIES = [
  "Pain Management", "Ortho Extremity", "Neurosurgery",
  "Chiropractic", "Physical Therapy", "Neurology",
  "Medical Doctor", "Radiology",
]

// ─── Provider stats type (unchanged) ─────────────────────────────────────────
type SpecialtyCoverage = {
  name: string; total: number; telemed: number
  inPerson: number; pi: number; wc: number
}
type ProviderStats = {
  total: number; telemed: number; inPerson: number
  workersComp: number; pi: number
  bySpecialty: { name: string; count: number }[]
  byState: { name: string; count: number }[]
  recentProviders: {
    id: number; provider_name: string; specialty?: string
    city?: string; state?: string; created_at?: string
    telemed?: boolean; in_person?: boolean; workers_comp?: boolean; pi?: boolean
  }[]
  piOnly: number; wcOnly: number; both: number
  byCoverage: SpecialtyCoverage[]
  byCity: { name: string; count: number }[]
  byModality: { name: string; count: number }[]
  byLanguage: { name: string; count: number }[]
  spanishCount: number; radiologyTotal: number
  withPhone: number; withEmail: number
  missingPhone: number; missingCoords: number
}

// ─── NEW appointment stats type — matches the new stats API ──────────────────
type ApptStats = {
  total: number
  today: number
  yesterday: number
  thisWeek: number
  lastWeek: number

  // visit format
  telemed: number
  inPerson: number

  // charts
  last7: { date: string; count: number }[]
  byServiceType: { name: string; count: number }[]
  byProvider: { name: string; specialty?: string; count: number }[]
  byLawFirm: { name: string; count: number }[]
}

// ─── Trend helper ─────────────────────────────────────────────────────────────
function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return <span className="text-[10px] text-green-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />New</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="w-3 h-3" />Flat</span>
  if (pct > 0) return <span className="text-[10px] text-green-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />+{pct}% vs last wk</span>
  return <span className="text-[10px] text-red-400 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" />{pct}% vs last wk</span>
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null)
  const [apptStats, setApptStats] = useState<ApptStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [provRes, apptRes] = await Promise.all([
        fetch("/api/admin/providers"),
        fetch("/api/admin/appointments/stats"),
      ])

      // ── Providers (unchanged logic) ──────────────────────────────────────
      if (provRes.ok) {
        const data = await provRes.json()
        const providers: any[] = data.providers ?? []

        const bySpecialtyMap: Record<string, number> = {}
        const byStateMap: Record<string, number> = {}
        const byCityMap: Record<string, number> = {}
        const modalityMap: Record<string, number> = {}
        const langMap: Record<string, number> = {}

        const specMap: Record<string, SpecialtyCoverage> = {}
        REQUIRED_SPECIALTIES.forEach(s => {
          specMap[s] = { name: s, total: 0, telemed: 0, inPerson: 0, pi: 0, wc: 0 }
        })

        providers.forEach((p) => {
          if (p.specialty) bySpecialtyMap[p.specialty] = (bySpecialtyMap[p.specialty] ?? 0) + 1
          if (p.state) byStateMap[p.state] = (byStateMap[p.state] ?? 0) + 1
          if (p.city) byCityMap[p.city] = (byCityMap[p.city] ?? 0) + 1
            ; (p.modality ?? []).forEach((m: string) => { modalityMap[m] = (modalityMap[m] ?? 0) + 1 })
            ; (p.languages ?? []).forEach((l: string) => { langMap[l] = (langMap[l] ?? 0) + 1 })
          const sp = p.specialty?.trim()
          if (sp && specMap[sp]) {
            specMap[sp].total++
            if (p.telemed) specMap[sp].telemed++
            if (p.in_person) specMap[sp].inPerson++
            if (p.pi) specMap[sp].pi++
            if (p.workers_comp) specMap[sp].wc++
          }
        })

        setProviderStats({
          total: providers.length,
          telemed: providers.filter(p => p.telemed).length,
          inPerson: providers.filter(p => p.in_person).length,
          workersComp: providers.filter(p => p.workers_comp).length,
          pi: providers.filter(p => p.pi).length,
          bySpecialty: Object.entries(bySpecialtyMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
          byState: Object.entries(byStateMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
          recentProviders: [...providers].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 5),
          piOnly: providers.filter(p => p.pi && !p.workers_comp).length,
          wcOnly: providers.filter(p => !p.pi && p.workers_comp).length,
          both: providers.filter(p => p.pi && p.workers_comp).length,
          byCoverage: REQUIRED_SPECIALTIES.map(s => specMap[s]),
          byCity: Object.entries(byCityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
          byModality: Object.entries(modalityMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
          byLanguage: Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
          spanishCount: providers.filter(p => (p.languages ?? []).some((l: string) => /spanish|español/i.test(l))).length,
          radiologyTotal: providers.filter(p => /radiology/i.test(p.specialty ?? '')).length,
          withPhone: providers.filter(p => p.intake_phone).length,
          withEmail: providers.filter(p => p.intake_email).length,
          missingPhone: providers.filter(p => !p.intake_phone).length,
          missingCoords: providers.filter(p => !p.latitude || !p.longitude).length,
        })
      }

      // ── Appointments (NEW) ───────────────────────────────────────────────
      if (apptRes.ok) {
        const data = await apptRes.json()
        setApptStats(data)
      }

      setLastUpdated(new Date())
    } catch { /* fail silently */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const ps = providerStats
  const as = apptStats

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl shrink-0">
            <LayoutDashboard className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-lg text-muted-foreground mt-1">Overview of your medical provider network.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && <p className="text-xs text-muted-foreground hidden sm:block">Updated {lastUpdated.toLocaleTimeString()}</p>}
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl w-fit">
        {([
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "providers", label: "Providers", icon: Users },
          { id: "appointments", label: "Appointments", icon: CalendarClock },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && !ps && !as && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      )}

      {(ps || as) && (
        <>
          {/* ════════════════ OVERVIEW ════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ps && <StatCard title="Total Providers" value={ps.total} icon={<Users className="w-5 h-5 text-primary" />} accent="primary" href="/admin/providers" />}
                {ps && <StatCard title="Telemed Available" value={ps.telemed} icon={<Monitor className="w-5 h-5 text-blue-500" />} accent="blue" />}
                {as && <StatCard title="Total Appointments" value={as.total} icon={<CalendarClock className="w-5 h-5 text-primary" />} accent="primary" href="/admin/appointments" sub={as.today > 0 ? `+${as.today} today` : "0 today"} />}
                {as && <StatCard title="This Week" value={as.thisWeek} icon={<Activity className="w-5 h-5 text-violet-500" />} accent="blue" sub={as.lastWeek > 0 ? `vs ${as.lastWeek} last week` : undefined} />}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ps && <MiniStat label="In-Person" value={ps.inPerson} icon={<Building2 className="w-4 h-4 text-violet-500" />} />}
                {ps && <MiniStat label="Workers Comp" value={ps.workersComp} icon={<Zap className="w-4 h-4 text-amber-500" />} />}
                {as && <MiniStat label="Telemed" value={as.telemed} icon={<Monitor className="w-4 h-4 text-blue-500" />} />}
                {as && <MiniStat label="In-Person" value={as.inPerson} icon={<Building2 className="w-4 h-4 text-violet-500" />} />}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {as && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-primary" /> Last 7 Days</CardTitle>
                          <CardDescription>Daily new appointments</CardDescription>
                        </div>
                        <span className="text-2xl font-bold tabular-nums">{as.last7.reduce((s, d) => s + d.count, 0)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 pt-0 h-[180px]">
                      <AppointmentBarChart data={as.last7} />
                    </CardContent>
                  </Card>
                )}
                {as && as.byProvider?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-primary" /> Top Providers</CardTitle>
                          <CardDescription>By appointment volume</CardDescription>
                        </div>
                        <Link href="/admin/providers">
                          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground hover:text-foreground">
                            View all <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <ProviderRankList items={as.byProvider} total={as.total} />
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card className="border-dashed">
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm">Quick Actions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Jump to the most used sections</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/admin/appointments"><Button variant="outline" size="sm" className="gap-2 h-9"><CalendarClock className="w-4 h-4" /> Appointments</Button></Link>
                      <Link href="/admin/providers"><Button variant="outline" size="sm" className="gap-2 h-9"><Users className="w-4 h-4" /> Providers</Button></Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ════════════════ PROVIDERS ════════════════ */}
          {activeTab === "providers" && ps && (
            <TooltipProvider delayDuration={100}>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard title="Total Providers" value={ps.total} icon={<Users className="w-5 h-5 text-primary" />} accent="primary" href="/admin/providers" />
                  <StatCard title="PI Providers" value={ps.pi} icon={<Scale className="w-5 h-5 text-rose-500" />} accent="amber" sub={`${Math.round(ps.pi / Math.max(ps.total, 1) * 100)}% of network`} />
                  <StatCard title="Workers Comp" value={ps.workersComp} icon={<Zap className="w-5 h-5 text-amber-500" />} accent="amber" sub={`${Math.round(ps.workersComp / Math.max(ps.total, 1) * 100)}% of network`} />
                  <StatCard title="Telemed" value={ps.telemed} icon={<Monitor className="w-5 h-5 text-blue-500" />} accent="blue" sub={`${ps.inPerson} in-person`} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniStat label="In-Person" value={ps.inPerson} icon={<Building2 className="w-4 h-4 text-violet-500" />} />
                  <MiniStat label="Both PI + WC" value={ps.both} icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} />
                  <MiniStat label="States Covered" value={ps.byState.length} icon={<MapPin className="w-4 h-4 text-indigo-500" />} />
                  <MiniStat label="Cities" value={ps.byCity.length} icon={<Globe className="w-4 h-4 text-teal-500" />} />
                </div>

                {/* PI / WC breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><Scale className="w-4 h-4 text-rose-500" /> PI / Workers Comp Coverage</CardTitle>
                    <CardDescription>Case type acceptance across the network</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {[
                        { label: "PI only", value: ps.piOnly, color: "bg-rose-400", pct: Math.round(ps.piOnly / Math.max(ps.total, 1) * 100) },
                        { label: "Workers Comp only", value: ps.wcOnly, color: "bg-amber-400", pct: Math.round(ps.wcOnly / Math.max(ps.total, 1) * 100) },
                        { label: "Both PI + WC", value: ps.both, color: "bg-primary", pct: Math.round(ps.both / Math.max(ps.total, 1) * 100) },
                      ].map(item => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-bold">{item.value} <span className="text-xs font-normal text-muted-foreground">({item.pct}%)</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Specialty coverage matrix */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><Stethoscope className="w-4 h-4 text-primary" /> Coverage & Capacity by Specialty</CardTitle>
                    <CardDescription>All 8 required specialties — gaps shown in red</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ps.byCoverage.map((s) => (
                        <div key={s.name} className="flex items-center gap-3">
                          <div className="w-4 shrink-0 flex items-center justify-center">
                            {s.total === 0
                              ? <TriangleAlert className="w-3.5 h-3.5 text-destructive" />
                              : <div className="w-2 h-2 rounded-full bg-green-500/60" />}
                          </div>
                          <span className={`text-sm w-36 shrink-0 truncate font-medium ${s.total === 0 ? "text-destructive" : ""}`}>{s.name}</span>
                          <Badge variant={s.total === 0 ? "destructive" : "secondary"} className="text-xs px-2 py-0 h-5 min-w-[28px] justify-center shrink-0">{s.total}</Badge>
                          {s.total > 0 && (
                            <>
                              <div className="h-1.5 rounded-full bg-muted flex-1 overflow-hidden">
                                <div className="h-full rounded-full bg-primary/60 transition-all duration-700" style={{ width: `${Math.round((s.total / ps.total) * 100)}%` }} />
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {s.telemed > 0 && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium cursor-default">{s.telemed}T</span></TooltipTrigger><TooltipContent side="top"><p>{s.telemed} Telemed</p></TooltipContent></Tooltip>}
                                {s.inPerson > 0 && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 font-medium cursor-default">{s.inPerson}P</span></TooltipTrigger><TooltipContent side="top"><p>{s.inPerson} In-Person</p></TooltipContent></Tooltip>}
                                {s.pi > 0 && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-medium cursor-default">PI</span></TooltipTrigger><TooltipContent side="top"><p>{s.pi} accept PI</p></TooltipContent></Tooltip>}
                                {s.wc > 0 && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-medium cursor-default">WC</span></TooltipTrigger><TooltipContent side="top"><p>{s.wc} accept WC</p></TooltipContent></Tooltip>}
                              </div>
                            </>
                          )}
                          {s.total === 0 && <span className="text-xs text-destructive font-medium">No providers — bot will escalate</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Geographic + Modalities + Languages */}
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4 text-indigo-500" /> Geographic Coverage</CardTitle>
                      <CardDescription>{ps.byState.length} states · {ps.byCity.length} cities</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {ps.byState.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
                      {ps.byState.map((s) => (
                        <div key={s.name} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            <span className="text-sm font-medium">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-400/70" style={{ width: `${Math.round((s.count / ps.total) * 100)}%` }} />
                            </div>
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[24px] justify-center">{s.count}</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base"><Cpu className="w-4 h-4 text-violet-500" /> Radiology Modalities</CardTitle>
                      <CardDescription>{ps.radiologyTotal} Radiology providers total</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {ps.byModality.length === 0
                        ? <p className="text-sm text-muted-foreground">No modality data filled in</p>
                        : ps.byModality.map((m) => (
                          <div key={m.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                              <span className="text-sm truncate">{m.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-violet-400/70" style={{ width: `${ps.radiologyTotal > 0 ? Math.round((m.count / ps.radiologyTotal) * 100) : 0}%` }} />
                              </div>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[24px] justify-center">{m.count}</Badge>
                            </div>
                          </div>
                        ))
                      }
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base"><Languages className="w-4 h-4 text-teal-500" /> Language Coverage</CardTitle>
                      <CardDescription>
                        {ps.byLanguage.length} language{ps.byLanguage.length !== 1 ? "s" : ""} across network
                        {ps.spanishCount === 0 && <span className="text-destructive font-medium ml-1">· ⚠ No Spanish speakers</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {ps.byLanguage.length === 0
                        ? <p className="text-sm text-muted-foreground">No language data filled in</p>
                        : ps.byLanguage.map((l) => {
                          const isSpanish = /spanish|español/i.test(l.name)
                          return (
                            <div key={l.name} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-teal-400" />
                                <span className="text-sm truncate">{l.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-teal-400/70" style={{ width: `${Math.round((l.count / ps.total) * 100)}%` }} />
                                </div>
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[24px] justify-center">{l.count}</Badge>
                              </div>
                            </div>
                          )
                        })
                      }
                    </CardContent>
                  </Card>
                </div>

                {/* Recently added */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-primary" /> Recently Added</CardTitle>
                        <CardDescription className="mt-0.5">Latest providers</CardDescription>
                      </div>
                      <Link href="/admin/providers">
                        <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground">View all <ArrowRight className="w-3 h-3" /></Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ps.recentProviders.length === 0 && <p className="text-sm text-muted-foreground">No providers yet</p>}
                    {ps.recentProviders.map((p) => (
                      <div key={p.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.provider_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{[p.specialty, p.city, p.state].filter(Boolean).join(" · ")}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {p.pi && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-medium cursor-default">PI</span></TooltipTrigger><TooltipContent side="top">Accepts Personal Injury</TooltipContent></Tooltip>}
                            {p.workers_comp && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-medium cursor-default">WC</span></TooltipTrigger><TooltipContent side="top">Accepts Workers Comp</TooltipContent></Tooltip>}
                            {p.telemed && <Tooltip><TooltipTrigger asChild><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium cursor-default">Telemed</span></TooltipTrigger><TooltipContent side="top">Telemed available</TooltipContent></Tooltip>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TooltipProvider>
          )}

          {/* ════════════════ APPOINTMENTS TAB ════════════════ */}
          {activeTab === "appointments" && as && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">All appointment statistics</p>
                <Link href="/admin/appointments">
                  <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground">
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>

              {/* KPI row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Appointments" value={as.total}
                  icon={<CalendarClock className="w-5 h-5 text-primary" />}
                  accent="primary" href="/admin/appointments"
                  sub={as.today > 0 ? `+${as.today} today` : "0 today"}
                />
                <StatCard
                  title="This Week" value={as.thisWeek}
                  icon={<Activity className="w-5 h-5 text-violet-500" />}
                  accent="blue"
                  sub={as.lastWeek > 0 ? `vs ${as.lastWeek} last week` : undefined}
                />
                <StatCard
                  title="Telemed" value={as.telemed}
                  icon={<Monitor className="w-5 h-5 text-blue-500" />}
                  accent="blue"
                />
                <StatCard
                  title="In-Person" value={as.inPerson}
                  icon={<Building2 className="w-5 h-5 text-violet-500" />}
                  accent="blue"
                />
              </div>

              {/* Mini stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <MiniStatWithTrend label="This Week" value={as.thisWeek} prev={as.lastWeek} icon={<Activity className="w-4 h-4 text-primary" />} />
                <MiniStat label="Today" value={as.today} icon={<CalendarClock className="w-4 h-4 text-primary" />} />
                <MiniStat label="Yesterday" value={as.yesterday} icon={<CalendarClock className="w-4 h-4 text-muted-foreground" />} />
              </div>

              {/* Charts row — bar chart full width + by service */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Bar chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-primary" /> Last 7 Days</CardTitle>
                        <CardDescription>Daily new appointments</CardDescription>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold tabular-nums">{as.last7.reduce((s, d) => s + d.count, 0)}</span>
                        <Trend current={as.thisWeek} previous={as.lastWeek} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0 h-[200px]">
                    <AppointmentBarChart data={as.last7} />
                  </CardContent>
                </Card>

                {/* Visit format breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><Monitor className="w-4 h-4 text-blue-500" /> Visit Format</CardTitle>
                    <CardDescription>Telemed vs In-Person breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Telemed", value: as.telemed, color: "bg-blue-400" },
                      { label: "In-Person", value: as.inPerson, color: "bg-violet-400" },
                    ].map(row => {
                      const pct = as.total > 0 ? Math.round((row.value / as.total) * 100) : 0
                      return (
                        <div key={row.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-semibold tabular-nums">{row.value} <span className="text-xs font-normal text-muted-foreground">({pct}%)</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${row.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* By service type */}
                {as.byServiceType.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base"><Stethoscope className="w-4 h-4 text-primary" /> By Service Type</CardTitle>
                      <CardDescription>Appointment volume per specialty</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {as.byServiceType.map((s, i) => {
                        const maxCount = as.byServiceType[0]?.count ?? 1
                        const pct = Math.round((s.count / maxCount) * 100)
                        return (
                          <div key={s.name} className="flex items-center gap-2.5">
                            <span className={`text-xs font-bold tabular-nums w-4 shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground/50"}`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-medium truncate">{s.name}</span>
                                <span className="text-xs font-semibold tabular-nums shrink-0">{s.count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-primary" : "bg-primary/40"}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* By law firm */}
                {as.byLawFirm.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4 text-primary" /> Top Law Firms</CardTitle>
                      <CardDescription>Referral sources by appointment count</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <ProviderRankList
                        items={as.byLawFirm.map(f => ({ name: f.name, count: f.count }))}
                        total={as.total}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ title, value, icon, accent, sub, href }: {
  title: string; value: number; icon: React.ReactNode
  accent: "primary" | "green" | "blue" | "amber"; sub?: string; href?: string
}) {
  const accentBg = { primary: "bg-primary/10", green: "bg-green-50 dark:bg-green-950/20", blue: "bg-blue-50 dark:bg-blue-950/20", amber: "bg-amber-50 dark:bg-amber-950/20" }[accent]
  const card = (
    <Card className={`hover:border-primary/40 hover:shadow-sm transition-all duration-200 ${href ? "cursor-pointer" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center shrink-0`}>{icon}</div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
        <div className="flex items-center justify-between mt-1.5 min-h-[16px]">
          {sub
            ? <p className="text-xs text-muted-foreground">{sub}</p>
            : <span />
          }
          {href && (
            <p className="text-xs text-primary flex items-center gap-1 ml-auto">
              View all <ArrowRight className="w-3 h-3" />
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50 hover:border-border/80 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function MiniStatWithTrend({ label, value, prev, icon }: { label: string; value: number; prev: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50 hover:border-border/80 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        <Trend current={value} previous={prev} />
      </div>
    </div>
  )
}

function ProviderRankList({ items, total }: { items: { name: string; specialty?: string; count: number }[]; total: number }) {
  return (
    <>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
      {items.map((p, i) => {
        const maxCount = items[0]?.count ?? 1
        const pct = Math.round((p.count / maxCount) * 100)
        return (
          <div key={p.name + p.specialty + i} className="flex items-center gap-2.5">
            <span className={`text-xs font-bold tabular-nums w-4 shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground/50"}`}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate">{p.name}</span>
                <span className="text-xs font-semibold tabular-nums shrink-0">{p.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-primary" : "bg-primary/40"}`} style={{ width: `${pct}%` }} />
              </div>
              {p.specialty && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.specialty}</p>}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ─── Bar chart (unchanged logic, dark/light aware) ────────────────────────────
function AppointmentBarChart({ data }: { data: { date: string; count: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const todayStr = new Date().toISOString().slice(0, 10)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const isDark = resolvedTheme === "dark"
    const primaryColor = isDark ? "hsl(217 91% 60%)" : "hsl(221 83% 53%)"
    const primaryFaded = isDark ? "hsla(217,91%,60%,0.4)" : "hsla(221,83%,53%,0.35)"
    const emptyColor = isDark ? "hsla(217,91%,60%,0.12)" : "hsla(221,83%,53%,0.10)"
    const gridColor = isDark ? "hsla(217,91%,60%,0.10)" : "hsla(221,83%,53%,0.08)"
    const labelColor = isDark ? "hsl(215 14% 55%)" : "hsl(220 9% 46%)"

    ctx.clearRect(0, 0, W, H)
    if (isDark) { ctx.fillStyle = "hsl(222 16% 14%)"; ctx.fillRect(0, 0, W, H) }

    const PAD = { top: 20, right: 8, bottom: 28, left: 28 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    const maxVal = Math.max(1, ...data.map(d => d.count))
    const yMax = maxVal <= 1 ? 2 : maxVal <= 5 ? 5 : maxVal <= 10 ? 10 : Math.ceil(maxVal / 5) * 5
    const slotW = chartW / data.length
    const barW = Math.min(slotW * 0.55, 36)

      ;[0, Math.round(yMax / 2), yMax].forEach(tick => {
        const y = PAD.top + chartH - (tick / yMax) * chartH
        ctx.beginPath(); ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
        ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = labelColor; ctx.globalAlpha = 0.7; ctx.font = "10px system-ui"
        ctx.textAlign = "right"; ctx.fillText(String(tick), PAD.left - 4, y + 4); ctx.globalAlpha = 1
      })

    data.forEach((d, i) => {
      const isToday = d.date === todayStr
      const cx = PAD.left + slotW * i + slotW / 2
      const bx = cx - barW / 2
      const bh = d.count === 0 ? 4 : Math.max(6, (d.count / yMax) * chartH)
      const by = PAD.top + chartH - bh
      const r = 4

      ctx.beginPath()
      ctx.moveTo(bx + r, by); ctx.lineTo(bx + barW - r, by); ctx.quadraticCurveTo(bx + barW, by, bx + barW, by + r)
      ctx.lineTo(bx + barW, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + r); ctx.quadraticCurveTo(bx, by, bx + r, by)
      ctx.closePath()
      ctx.fillStyle = isToday ? primaryColor : d.count > 0 ? primaryFaded : emptyColor
      ctx.fill()

      if (d.count > 0) {
        ctx.fillStyle = isToday ? primaryColor : labelColor
        ctx.globalAlpha = isToday ? 1 : 0.85
        ctx.font = isToday ? "bold 11px system-ui" : "10px system-ui"
        ctx.textAlign = "center"; ctx.fillText(String(d.count), cx, by - 4); ctx.globalAlpha = 1
      }

      const day = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })
      ctx.fillStyle = isToday ? primaryColor : labelColor
      ctx.globalAlpha = isToday ? 1 : 0.6
      ctx.font = isToday ? "bold 10px system-ui" : "10px system-ui"
      ctx.textAlign = "center"; ctx.fillText(day, cx, PAD.top + chartH + 16); ctx.globalAlpha = 1
    })
  }, [data, resolvedTheme])

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
}

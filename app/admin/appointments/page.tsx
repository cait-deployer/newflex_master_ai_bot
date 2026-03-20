"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar, Search, RefreshCw, Loader2,
  AlertCircle, Trash2, X, CheckSquare, SlidersHorizontal,
} from "lucide-react"
import { AppointmentTable } from "./appointment-table"
import { AppointmentDetail } from "./appointment-detail"
import PaginationComponent from "@/components/shared/pagination-component"

// Types

export interface MedicalProvider {
  id: number
  provider_name: string
  doctor_name: string | null
  specialty: string | null
  address: string
  address_line_2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  intake_phone: string | null
  intake_email: string | null
  records_email: string | null
  billing_email: string | null
  negotiations_email: string | null
  website_url: string | null
  logo_url: string | null
  telemed: boolean | null
  in_person: boolean | null
  pi: boolean | null
  workers_comp: boolean | null
  languages: string[] | null
  modality: string[] | null
  machine_description: string[] | null
  hours_of_operation: string | null
  latitude: number | null
  longitude: number | null
}

export interface Appointment {
  id: number
  session_id: string
  status: string

  // Patient
  patient_name: string
  phone: string | null
  date_of_birth: string | null
  date_of_injury: string | null

  // Legal
  legal_firm: string | null
  attorney_name: string | null
  attorney_phone: string | null
  attorney_email: string | null

  // Provider FK + text fallbacks
  provider_id: number | null
  provider_name: string | null
  provider_specialty: string | null
  provider_address: string | null
  visit_format: string | null

  // Service
  service_type: string | null
  availability: string | null
  additional_notes: string | null

  created_at: string | null
  updated_at: string | null

  // Joined from medical_providers
  medical_providers: MedicalProvider | null
  document_uploads?: Array<{
    id: number
    session_id: string
    document_type: string
    file_url: string
    file_name: string
    uploaded_at?: string | null
  }>
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { toast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [search, setSearch] = useState("")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [visitFilter, setVisitFilter] = useState("all")   // 'all' | 'telemed' | 'in_person'
  const [showFilters, setShowFilters] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/appointments?limit=1000")
      if (!res.ok) throw new Error("Failed to fetch appointments")
      const data = await res.json()
      setAppointments(data.appointments ?? [])
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])
  useEffect(() => { setCurrentPage(1) }, [search, serviceFilter, visitFilter, itemsPerPage])
  useEffect(() => { setSelectedIds(new Set()) }, [search, serviceFilter, visitFilter, currentPage, itemsPerPage])

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = appointments
    if (serviceFilter !== "all") list = list.filter(a => a.service_type === serviceFilter)
    if (visitFilter !== "all") list = list.filter(a => a.visit_format === visitFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        [
          a.patient_name,
          a.attorney_name,
          a.legal_firm,
          a.provider_name,
          a.medical_providers?.provider_name,
          a.service_type,
        ].some(v => v?.toLowerCase().includes(q))
      )
    }
    return list
  }, [appointments, search, serviceFilter, visitFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  const from = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const to = Math.min(currentPage * itemsPerPage, filtered.length)

  // ── Selection ────────────────────────────────────────────────────────────
  const pageIds = useMemo(() => paginated.map(a => a.id), [paginated])
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const somePageSelected = pageIds.some(id => selectedIds.has(id))

  const toggleOne = (id: number) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const togglePage = () => {
    if (allPageSelected) setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n })
    else setSelectedIds(prev => new Set([...prev, ...pageIds]))
  }
  const selectAll = () => setSelectedIds(new Set(filtered.map(a => a.id)))
  const clearSelect = () => setSelectedIds(new Set())

  // ── Patch ────────────────────────────────────────────────────────────────
  const patchRow = (id: number, patch: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    setActiveAppt(prev => prev?.id === id ? { ...prev, ...patch } : prev)
  }

  // ── Notes change ──────────────────────────────────────────────────────────
  const handleNotesChange = async (id: number, additional_notes: string) => {
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ additional_notes }),
    })
    if (!res.ok) { toast({ title: "Failed to save notes", variant: "destructive" }); return }
    patchRow(id, { additional_notes })
    toast({ title: "Notes saved", variant: "success" })
  }

  // ── Single delete ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return
    const name = appointments.find(a => a.id === deletingId)?.patient_name ?? "Appointment"
    try {
      const res = await fetch(`/api/admin/appointments/${deletingId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setAppointments(prev => prev.filter(a => a.id !== deletingId))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deletingId); return n })
      if (activeAppt?.id === deletingId) setActiveAppt(null)
      setDeletingId(null)
      if (paginated.length === 1 && currentPage > 1) setCurrentPage(p => p - 1)
      toast({ title: "Appointment deleted", description: `${name} has been removed.`, variant: "success" })
    } catch (e: any) {
      setDeletingId(null)
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" })
    }
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/appointments/${id}`, { method: "DELETE" })
      ))
      setAppointments(prev => prev.filter(a => !selectedIds.has(a.id)))
      if (activeAppt && selectedIds.has(activeAppt.id)) setActiveAppt(null)
      const remaining = filtered.length - ids.length
      const maxPage = Math.max(1, Math.ceil(remaining / itemsPerPage))
      if (currentPage > maxPage) setCurrentPage(maxPage)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      toast({ title: `${ids.length} appointment${ids.length !== 1 ? "s" : ""} deleted`, variant: "success" })
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" })
    } finally {
      setBulkDeleting(false)
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const telemedCount = appointments.filter(a => a.visit_format === "telemed").length
  const inPersonCount = appointments.filter(a => a.visit_format === "in_person").length

  const serviceTypes = useMemo(() =>
    Array.from(new Set(appointments.map(a => a.service_type).filter(Boolean))) as string[],
    [appointments]
  )

  const hasFilters = serviceFilter !== "all" || visitFilter !== "all"

  const bulkNames = appointments.filter(a => selectedIds.has(a.id)).slice(0, 5).map(a => a.patient_name)
  const bulkExtra = selectedIds.size > 5 ? selectedIds.size - 5 : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden -m-4 sm:-m-6 lg:-m-8 xl:-mx-10">

      {/* ── Left panel ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── TOP: fixed header ── */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6 lg:pt-8 space-y-4 pb-3 border-b border-border bg-background">

          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                <Calendar className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Appointments</h1>
                <p className="text-lg text-muted-foreground mt-1">
                  Manage all incoming appointment requests.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {lastUpdated && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
              <Button
                variant="outline"
                onClick={fetchAppointments}
                disabled={loading}
                className="gap-2 h-10"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="px-3 py-1.5 text-sm rounded-lg font-medium">
              {appointments.length} total
            </Badge>
            <Badge className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
              {telemedCount} telemed
            </Badge>
            <Badge className="px-3 py-1.5 text-sm rounded-lg bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800">
              {inPersonCount} in-person
            </Badge>
            {(search || hasFilters) && (
              <Badge variant="outline" className="px-3 py-1.5 text-sm rounded-lg">
                {filtered.length} found
              </Badge>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patient, attorney, provider…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="h-10 gap-2"
                onClick={() => setShowFilters(v => !v)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </Button>
            </div>
          </div>

          {/* Filter selects */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-in slide-in-from-top-1 duration-150">
              <Select value={serviceFilter} onValueChange={v => { setServiceFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue placeholder="Service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {serviceTypes.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={visitFilter} onValueChange={v => { setVisitFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Visit format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All formats</SelectItem>
                  <SelectItem value="telemed">Telemed</SelectItem>
                  <SelectItem value="in_person">In-Person</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost" size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => { setServiceFilter("all"); setVisitFilter("all") }}
                >
                  <X className="w-3.5 h-3.5" /> Clear filters
                </Button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" onClick={fetchAppointments} className="ml-auto">Retry</Button>
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">
                    {selectedIds.size} selected
                  </span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-border" />
                {selectedIds.size < filtered.length ? (
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap"
                  >
                    Select all {filtered.length}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    All {filtered.length} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={clearSelect}>
                  <X className="w-3.5 h-3.5" /><span className="hidden sm:inline">Clear</span>
                </Button>
                <Button
                  variant="destructive" size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── MIDDLE: scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4">

          {/* Skeleton */}
          {loading && !error && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-muted/50 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-4">
              <div className="p-5 bg-muted/50 rounded-2xl">
                <Calendar className="w-12 h-12 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {search || hasFilters ? "No appointments match" : "No appointments yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || hasFilters
                    ? "Try different keywords or clear the filters."
                    : "Appointments will appear here once patients submit requests."}
                </p>
              </div>
              {(search || hasFilters) && (
                <Button
                  variant="outline"
                  onClick={() => { setSearch(""); setServiceFilter("all"); setVisitFilter("all") }}
                  className="gap-2"
                >
                  <X className="w-4 h-4" /> Clear filters
                </Button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && !error && filtered.length > 0 && (
            <AppointmentTable
              appointments={paginated}
              selectedIds={selectedIds}
              allPageSelected={allPageSelected}
              somePageSelected={somePageSelected}
              onToggleOne={toggleOne}
              onTogglePage={togglePage}
              onOpen={a => setActiveAppt(prev => prev?.id === a.id ? null : a)}
              onDelete={id => setDeletingId(id)}
              activeId={activeAppt?.id}
            />
          )}
        </div>

        {/* ── BOTTOM: pinned pagination ── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-4 sm:px-6 lg:px-8 xl:px-10 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Showing{" "}
                <span className="font-semibold text-foreground">{from}–{to}</span>
                {" "}of{" "}
                <span className="font-semibold text-foreground">{filtered.length}</span>
                {" "}appointments
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Per page</span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}
                  >
                    <SelectTrigger className="h-8 w-[70px] text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PER_PAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden sm:block w-px h-5 bg-border" />
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={page => { if (page >= 1 && page <= totalPages) setCurrentPage(page) }}
                />
              </div>
            </div>
          </div>
        )}

      </div>{/* end left panel */}

      {/* ── Right panel: detail ── */}
      {activeAppt && (
        <div className="w-[380px] shrink-0 border-l border-border overflow-y-auto bg-card mt-4">
          <AppointmentDetail
            appointment={activeAppt}
            onClose={() => setActiveAppt(null)}
            onNotesChange={handleNotesChange}
          />
        </div>
      )}

      {/* Single delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={open => { if (!open) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The appointment will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={open => { if (!open && !bulkDeleting) setBulkDeleteOpen(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="p-1.5 bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4 text-destructive" />
              </span>
              Delete {selectedIds.size} Appointment{selectedIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. The following appointments will be permanently removed:
                </p>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                  {bulkNames.map(name => (
                    <div key={name} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                  {bulkExtra > 0 && (
                    <div className="text-xs text-muted-foreground pt-0.5 pl-3.5">
                      …and {bulkExtra} more appointment{bulkExtra !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/90 gap-2 min-w-[120px]"
            >
              {bulkDeleting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                : <><Trash2 className="w-4 h-4" /> Delete {selectedIds.size}</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

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
  Users, Plus, Search, RefreshCw, Loader2,
  AlertCircle, LayoutGrid, Table2, FileSpreadsheet,
  Trash2, X, CheckSquare,
} from "lucide-react"
import { ProviderCard } from "./provider-card"
import { ProviderTable } from "./provider-table"
import { ProviderForm } from "./provider-form"
import { ProviderDetail } from "./provider-detail"
import { ImportProvidersDialog } from "./import-providers-dialog"
import PaginationComponent from "@/components/shared/pagination-component"

export type Provider = {
  id: number
  provider_name: string
  doctor_name?: string
  specialty?: string
  city?: string
  state?: string
  zip_code?: string
  address?: string
  address_line_2?: string
  intake_phone?: string
  intake_email?: string
  records_email?: string
  billing_email?: string
  negotiations_email?: string
  website_url?: string
  logo_url?: string
  latitude?: number
  longitude?: number
  modality?: string[]
  machine_description?: string[]
  languages?: string[]
  hours_of_operation?: string
  workers_comp?: boolean
  pi?: boolean
  telemed?: boolean
  in_person?: boolean
  rating?: number
  created_at?: string
}

type ViewMode = "list" | "create" | "edit"
type DisplayMode = "cards" | "table"

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

export default function ProvidersPage() {
  const { toast } = useToast()

  const [providers, setProviders] = useState<Provider[]>([])
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("cards")
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [importOpen, setImportOpen] = useState(false)

  const fetchProviders = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/providers")
      if (!res.ok) throw new Error("Failed to fetch providers")
      const data = await res.json()
      setProviders(data.providers ?? [])
      setLastUpdated(new Date())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProviders() }, [fetchProviders])
  useEffect(() => { setCurrentPage(1) }, [search, itemsPerPage])
  // Clear selection when page / search changes
  useEffect(() => { setSelectedIds(new Set()) }, [search, currentPage, itemsPerPage])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return providers
    return providers.filter((p) =>
      [p.provider_name, p.doctor_name, p.specialty, p.city, p.state, ...(p.modality ?? [])]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    )
  }, [search, providers])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  // Selection helpers
  const pageIds = useMemo(() => paginated.map((p) => p.id), [paginated])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))

  const toggleOne = (id: number) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const togglePage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...pageIds]))
    }
  }

  const selectAll = () => setSelectedIds(new Set(filtered.map((p) => p.id)))
  const clearSelect = () => setSelectedIds(new Set())

  // CRUD
  const handleCreate = async (data: Omit<Provider, "id" | "created_at">) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create provider")
      await fetchProviders(); setViewMode("list")
      toast({ title: "Provider created", description: `${data.provider_name} has been added successfully.`, variant: "success" })
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (data: Omit<Provider, "id" | "created_at">) => {
    if (!editingProvider) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/providers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, id: editingProvider.id }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to update provider")
      await fetchProviders(); setViewMode("list"); setEditingProvider(null)
      toast({ title: "Provider updated", description: `${data.provider_name} has been saved.`, variant: "success" })
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    const name = providers.find((p) => p.id === deletingId)?.provider_name ?? "Provider"
    try {
      const res = await fetch(`/api/admin/providers?id=${deletingId}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to delete provider")
      setProviders((prev) => prev.filter((p) => p.id !== deletingId))
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(deletingId); return n })
      setDeletingId(null)
      if (paginated.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1)
      toast({ title: "Provider deleted", description: `${name} has been removed.`, variant: "success" })
    } catch (e: any) {
      setDeletingId(null)
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" })
    }
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/admin/providers/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to delete providers")
      setProviders((prev) => prev.filter((p) => !selectedIds.has(p.id)))
      const remaining = filtered.length - ids.length
      const maxPage = Math.max(1, Math.ceil(remaining / itemsPerPage))
      if (currentPage > maxPage) setCurrentPage(maxPage)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      toast({ title: `${ids.length} provider${ids.length !== 1 ? "s" : ""} deleted`, description: "Selected providers have been permanently removed.", variant: "success" })
    } catch (e: any) { toast({ title: "Failed to delete", description: e.message, variant: "destructive" }) }
    finally { setBulkDeleting(false) }
  }

  const handleImportSuccess = useCallback(async () => {
    await fetchProviders()
    toast({ title: "Import complete", description: "Providers have been imported successfully.", variant: "success" })
  }, [fetchProviders, toast])

  const openEdit = (p: Provider) => { setEditingProvider(p); setViewMode("edit") }
  const handleBack = () => { setViewMode("list"); setEditingProvider(null) }

  if (viewMode === "create")
    return <ProviderForm mode="create" onSubmit={handleCreate} onCancel={handleBack} saving={saving} />
  if (viewMode === "edit" && editingProvider)
    return <ProviderForm mode="edit" initialData={editingProvider} onSubmit={handleUpdate} onCancel={handleBack} saving={saving} />

  const telemedCount = providers.filter((p) => p.telemed).length
  const inPersonCount = providers.filter((p) => p.in_person).length
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const to = Math.min(currentPage * itemsPerPage, filtered.length)

  // Names preview for bulk confirm dialog (max 5)
  const bulkNames = providers.filter((p) => selectedIds.has(p.id)).slice(0, 5).map((p) => p.provider_name)
  const bulkExtra = selectedIds.size > 5 ? selectedIds.size - 5 : 0

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden -m-4 sm:-m-6 lg:-m-8 xl:-mx-10">

      {/* ── Left panel ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── TOP: fixed header zone (header + stats + toolbar + error) ── */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6 lg:pt-8 space-y-4 pb-3 border-b border-border bg-background">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Providers</h1>
                <p className="text-lg text-muted-foreground mt-1">Manage medical providers available in the chat search.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="lg" className="gap-2" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="w-5 h-5" /> Import Excel
              </Button>
              <Button onClick={() => setViewMode("create")} size="lg" className="gap-2">
                <Plus className="w-5 h-5" /> Add Provider
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="px-3 py-1.5 text-sm rounded-lg font-medium">{providers.length} total</Badge>
            <Badge className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">{telemedCount} telemed</Badge>
            <Badge className="px-3 py-1.5 text-sm rounded-lg bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800">{inPersonCount} in-person</Badge>
            {search && <Badge variant="outline" className="px-3 py-1.5 text-sm rounded-lg">{filtered.length} found</Badge>}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 h-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, doctor, specialty, city, modality…"
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 !h-10 py-1" />
            </div>
            <div className="flex gap-2 shrink-0 items-start">
              <div className="hidden sm:flex rounded-lg border border-border overflow-hidden">
                <Button variant={displayMode === "cards" ? "secondary" : "ghost"} size="sm"
                className="rounded-none h-10 px-3 gap-1.5 border-r border-border" onClick={() => setDisplayMode("cards")}>
                  <LayoutGrid className="w-4 h-4" /><span className="hidden md:inline">Cards</span>
                </Button>
                <Button variant={displayMode === "table" ? "secondary" : "ghost"} size="sm" className="rounded-none h-10 px-3 gap-1.5" onClick={() => setDisplayMode("table")}>
                  <Table2 className="w-4 h-4" /><span className="hidden md:inline">Table</span>
                </Button>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <Button variant="outline" onClick={fetchProviders} disabled={loading} className="gap-2 h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {lastUpdated && (
                  <p className="text-[11px] text-muted-foreground hidden sm:block whitespace-nowrap">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" onClick={fetchProviders} className="ml-auto">Retry</Button>
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
                  <button onClick={selectAll} className="text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap">
                    Select all {filtered.length}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">All {filtered.length} selected</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={clearSelect}>
                  <X className="w-3.5 h-3.5" /><span className="hidden sm:inline">Clear</span>
                </Button>
                <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── MIDDLE: scrollable content area ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4">

          {/* Skeleton */}
          {loading && !error && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 70}ms` }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-4">
              <div className="p-5 bg-muted/50 rounded-2xl"><Users className="w-12 h-12 text-muted-foreground/40" /></div>
              <div>
                <p className="text-lg font-semibold">{search ? "No providers match" : "No providers yet"}</p>
                <p className="text-sm text-muted-foreground mt-1">{search ? "Try different keywords." : "Click «Add Provider» to get started."}</p>
              </div>
              {!search && (
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Import Excel</Button>
                  <Button onClick={() => setViewMode("create")} className="gap-2"><Plus className="w-4 h-4" /> Add Provider</Button>
                </div>
              )}
            </div>
          )}

          {/* Content: cards or table */}
          {!loading && !error && filtered.length > 0 && (
            <>
              {/* Mobile — always cards */}
              <div className="sm:hidden grid gap-4">
                {paginated.map((p) => (
                  <ProviderCard
                    key={p.id} provider={p}
                    selected={selectedIds.has(p.id)}
                    onSelect={() => toggleOne(p.id)}
                    isActive={activeProvider?.id === p.id}
                    onEdit={() => openEdit(p)}
                    onDelete={() => setDeletingId(p.id)}
                    onOpen={() => setActiveProvider(prev => prev?.id === p.id ? null : p)}
                  />
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block">
                {displayMode === "cards" ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginated.map((p) => (
                      <ProviderCard
                        key={p.id} provider={p}
                        selected={selectedIds.has(p.id)}
                        isActive={activeProvider?.id === p.id}
                        onSelect={() => toggleOne(p.id)}
                        onEdit={() => openEdit(p)}
                        onDelete={() => setDeletingId(p.id)}
                        onOpen={() => setActiveProvider(prev => prev?.id === p.id ? null : p)}
                      />
                    ))}
                  </div>
                ) : (
                  <ProviderTable
                    providers={paginated}
                    selectedIds={selectedIds}
                    allPageSelected={allPageSelected}
                    somePageSelected={somePageSelected}
                    onToggleOne={toggleOne}
                    onTogglePage={togglePage}
                    onEdit={openEdit}
                    onDelete={(id) => setDeletingId(id)}
                    onOpen={(p) => setActiveProvider(prev => prev?.id === p.id ? null : p)}
                    activeId={activeProvider?.id}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* ── BOTTOM: pinned pagination ── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-4 sm:px-6 lg:px-8 xl:px-10 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
                <span className="font-semibold text-foreground">{filtered.length}</span> providers
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Per page</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                    <SelectTrigger className="h-8 w-[70px] text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PER_PAGE_OPTIONS.map((opt) => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden sm:block w-px h-5 bg-border" />
                <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </div>
          </div>
        )}

      </div>{/* end left panel */}

      {/* ── Right panel: provider detail ── */}
      {activeProvider && (
        <div className="w-[380px] shrink-0 border-l border-border overflow-y-auto bg-card mt-4">
          <ProviderDetail
            provider={activeProvider}
            onClose={() => setActiveProvider(null)}
            onEdit={() => { openEdit(activeProvider); setActiveProvider(null) }}
            onDelete={() => { setDeletingId(activeProvider.id); setActiveProvider(null) }}
          />
        </div>
      )}

      {/* Import Dialog */}
      <ImportProvidersDialog open={importOpen} onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />

      {/* Single delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The provider will be permanently removed and won't appear in chat search.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => { if (!open && !bulkDeleting) setBulkDeleteOpen(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="p-1.5 bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4 text-destructive" />
              </span>
              Delete {selectedIds.size} Provider{selectedIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. The following providers will be permanently removed from the database and chat search:
                </p>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                  {bulkNames.map((name) => (
                    <div key={name} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                  {bulkExtra > 0 && (
                    <div className="text-xs text-muted-foreground pt-0.5 pl-3.5">
                      …and {bulkExtra} more provider{bulkExtra !== 1 ? "s" : ""}
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

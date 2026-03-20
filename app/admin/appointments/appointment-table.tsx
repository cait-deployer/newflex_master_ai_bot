"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Trash2, ChevronRight, User, Monitor,
  Building2, Stethoscope, CheckCircle2,
} from "lucide-react"
import type { Appointment } from "./page"

type Props = {
  appointments: Appointment[]
  selectedIds: Set<number>
  allPageSelected: boolean
  somePageSelected: boolean
  onToggleOne: (id: number) => void
  onTogglePage: () => void
  onOpen: (a: Appointment) => void
  onDelete: (id: number) => void
  activeId?: number | null
}

export function AppointmentTable({
  appointments, selectedIds, allPageSelected, somePageSelected,
  onToggleOne, onTogglePage, onOpen, onDelete, activeId,
}: Props) {

  const fmtDate = (d?: string | null) => {
    if (!d) return "—"
    return new Date(d + (d.length === 10 ? "T12:00:00" : ""))
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 px-3">
              <Checkbox
                checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                onCheckedChange={onTogglePage}
                aria-label="Select all"
                className="translate-y-[1px] cursor-pointer"
              />
            </TableHead>
            <TableHead className="font-semibold w-[190px]">Patient</TableHead>
            <TableHead className="font-semibold">Service</TableHead>
            <TableHead className="font-semibold">Provider</TableHead>
            <TableHead className="font-semibold">Attorney</TableHead>
            <TableHead className="font-semibold">Visit</TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((a) => {
            const isSelected = selectedIds.has(a.id)
            const isActive   = activeId === a.id

            // Prefer real joined provider data, fall back to text fields
            const mp = a.medical_providers
            const providerName = mp?.provider_name ?? a.provider_name ?? null
            const providerSpec = mp?.specialty ?? a.provider_specialty ?? null
            const visitFormat = a.visit_format ?? (mp?.telemed ? "telemed" : mp?.in_person ? "in_person" : null)
            const isVerified = !!mp   // has a real FK link

            return (
              <TableRow
                key={a.id}
                onClick={() => onOpen(a)}
                className={`group transition-colors cursor-pointer ${isActive ? "bg-primary/8 hover:bg-primary/10 border-l-2 border-primary"
                  : isSelected ? "bg-primary/5 hover:bg-primary/[0.07]"
                    : "hover:bg-muted/30"
                  }`}
              >
                {/* Checkbox */}
                <TableCell className="px-3 w-10" onClick={e => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggleOne(a.id)} className="translate-y-[1px] cursor-pointer" />
                </TableCell>

                {/* Patient */}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{a.patient_name || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">#{a.id}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Service type */}
                <TableCell>
                  {a.service_type ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Stethoscope className="w-3 h-3" />{a.service_type}
                    </span>
                  ) : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>

                {/* Provider — shows real data + verified badge */}
                <TableCell>
                  {providerName ? (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm truncate max-w-[140px] font-medium">{providerName}</p>
                      </div>
                      {providerSpec && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{providerSpec}</p>
                      )}
                      {mp?.city && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{[mp.city, mp.state].filter(Boolean).join(", ")}</p>
                      )}
                    </div>
                  ) : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>

                {/* Attorney */}
                <TableCell>
                  <div className="space-y-0.5 text-xs text-muted-foreground min-w-0">
                    {a.attorney_name && <p className="truncate max-w-[130px] font-medium text-foreground">{a.attorney_name}</p>}
                    {a.legal_firm && <p className="truncate max-w-[130px]">{a.legal_firm}</p>}
                    {!a.attorney_name && !a.legal_firm && <span>—</span>}
                  </div>
                </TableCell>

                {/* Visit format */}
                <TableCell>
                  {visitFormat ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                      {visitFormat === "telemed" || visitFormat === "remote"
                        ? <Monitor className="w-3 h-3" />
                        : <Building2 className="w-3 h-3" />}
                      {visitFormat.replace("_", " ")}
                    </span>
                  ) : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>

                {/* Date */}
                <TableCell>
                  <span className="text-sm tabular-nums text-muted-foreground">{fmtDate(a.created_at)}</span>
                </TableCell>

                {/* Actions */}
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                      onClick={e => { e.stopPropagation(); onDelete(a.id) }} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary hover:bg-primary/10"
                      onClick={() => onOpen(a)} title="Open details">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

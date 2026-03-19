"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pencil, Trash2, Monitor, Building2,
  Zap, CheckCircle2, XCircle,
} from "lucide-react"
import type { Provider } from "./page"

type Props = {
  providers: Provider[]
  onEdit: (p: Provider) => void
  onDelete: (id: number) => void
}

export function ProviderTable({ providers, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="font-semibold w-[220px]">Provider</TableHead>
            <TableHead className="font-semibold">Specialty</TableHead>
            <TableHead className="font-semibold">Location</TableHead>
            <TableHead className="font-semibold">Phone</TableHead>
            <TableHead className="font-semibold">Modality</TableHead>
            <TableHead className="font-semibold">Services</TableHead>
            {/* <TableHead className="font-semibold w-[90px]">Status</TableHead> */}
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((p) => {
            const location = [p.city, p.state].filter(Boolean).join(", ")
            // const accepting = p.accepting_patients !== false

            return (
              <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm leading-tight">{p.provider_name}</p>
                    {p.doctor_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.doctor_name}</p>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm">{p.specialty ?? "—"}</span>
                </TableCell>

                <TableCell>
                  <div className="text-sm">
                    {p.address && <p className="truncate max-w-[160px]">{p.address}</p>}
                    {location && (
                      <p className="text-muted-foreground text-xs">
                        {location}{p.zip_code ? ` ${p.zip_code}` : ""}
                      </p>
                    )}
                    {!p.address && !location && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm tabular-nums">{p.intake_phone ?? "—"}</span>
                </TableCell>

                <TableCell>
                  {p.modality && p.modality.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.modality.slice(0, 2).map((m) => (
                        <Badge key={m} variant="secondary"
                          className="text-[11px] px-1.5 py-0 h-5 rounded font-normal">
                          {m}
                        </Badge>
                      ))}
                      {p.modality.length > 2 && (
                        <Badge variant="outline"
                          className="text-[11px] px-1.5 py-0 h-5 rounded font-normal">
                          +{p.modality.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {p.telemed && (
                      <span title="Telemed"
                        className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        <Monitor className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {p.in_person && (
                      <span title="In-Person"
                        className="inline-flex items-center justify-center w-6 h-6 rounded bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                        <Building2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {p.workers_comp && (
                      <span title="Workers Comp"
                        className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                        <Zap className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {!p.telemed && !p.in_person && !p.workers_comp && (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                </TableCell>

                {/* <TableCell>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${accepting
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                      : "bg-muted text-muted-foreground border-border"
                    }`}>
                    {accepting
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <XCircle className="w-3 h-3" />}
                    {accepting ? "Open" : "Closed"}
                  </span>
                </TableCell> */}

                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 hover:text-primary hover:bg-primary/10"
                      onClick={() => onEdit(p)} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(p.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
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
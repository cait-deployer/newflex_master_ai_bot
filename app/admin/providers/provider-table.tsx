"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2, Monitor, Building2, Zap, Users, Scale, ChevronRight } from "lucide-react"
import type { Provider } from "./page"

type Props = {
  providers: Provider[]
  selectedIds: Set<number>
  allPageSelected: boolean
  somePageSelected: boolean
  onToggleOne: (id: number) => void
  onTogglePage: () => void
  onEdit: (p: Provider) => void
  onDelete: (id: number) => void
  onOpen: (p: Provider) => void
  activeId?: number | null
}

export function ProviderTable({
  providers, selectedIds, allPageSelected, somePageSelected,
  onToggleOne, onTogglePage, onEdit, onDelete, onOpen, activeId,
}: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                  onCheckedChange={onTogglePage}
                  aria-label="Select all on page"
                  className="translate-y-[1px] cursor-pointer"
                />
              </TableHead>
              <TableHead className="font-semibold w-[220px]">Provider</TableHead>
              <TableHead className="font-semibold">Specialty</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Modality</TableHead>
              <TableHead className="font-semibold">Services</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p) => {
              const location = [p.city, p.state].filter(Boolean).join(", ")
              const isSelected = selectedIds.has(p.id)
              const isActive = activeId === p.id
              return (
                <TableRow
                  key={p.id}
                  onClick={() => onOpen(p)}
                  className={`transition-colors cursor-pointer ${isActive
                      ? "bg-primary/5 border-l-2 border-primary"
                      : isSelected
                        ? "bg-primary/5 hover:bg-primary/[0.07]"
                        : "hover:bg-muted/30"
                    }`}
                >
                  <TableCell className="px-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleOne(p.id)}
                      aria-label={`Select ${p.provider_name}`}
                      className="translate-y-[1px] cursor-pointer"
                    />
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="font-medium text-sm leading-tight">{p.provider_name}</p>
                      {p.doctor_name && <p className="text-xs text-muted-foreground mt-0.5">{p.doctor_name}</p>}
                    </div>
                  </TableCell>

                  <TableCell><span className="text-sm">{p.specialty ?? "—"}</span></TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {p.address && <p className="truncate max-w-[160px]">{p.address}</p>}
                      {location && <p className="text-muted-foreground text-xs">{location}{p.zip_code ? ` ${p.zip_code}` : ""}</p>}
                      {!p.address && !location && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>

                  <TableCell><span className="text-sm tabular-nums">{p.intake_phone ?? "—"}</span></TableCell>

                  <TableCell>
                    {p.modality && p.modality.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.modality.slice(0, 2).map((m) => (
                          <Tooltip key={m}>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-5 rounded font-normal cursor-default">{m}</Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Modality: {m}</p></TooltipContent>
                          </Tooltip>
                        ))}
                        {p.modality.length > 2 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 rounded font-normal cursor-default">
                                +{p.modality.length - 2}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{p.modality.slice(2).join(", ")}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {p.telemed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 cursor-default">
                              <Monitor className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>Telemed available</p></TooltipContent>
                        </Tooltip>
                      )}
                      {p.in_person && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 cursor-default">
                              <Building2 className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>In-Person visits</p></TooltipContent>
                        </Tooltip>
                      )}
                      {p.workers_comp && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 cursor-default">
                              <Zap className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>Accepts Workers Comp</p></TooltipContent>
                        </Tooltip>
                      )}
                      {p.pi && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 cursor-default">
                              <Users className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>Accepts Personal Injury</p></TooltipContent>
                        </Tooltip>
                      )}
                      {!p.telemed && !p.in_person && !p.workers_comp && !p.pi && (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary hover:bg-primary/10" onClick={() => onEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Edit provider</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Delete provider</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary hover:bg-primary/10" onClick={() => onOpen(p)}>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>View details</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
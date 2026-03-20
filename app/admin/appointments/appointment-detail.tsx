"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  X, User, Phone, Mail, MapPin, Calendar, Stethoscope,
  FileText, Building2, Gavel, Monitor, Clock, Loader2,
  UserCircle, Globe, CheckCircle2, ExternalLink, Download,
} from "lucide-react"
import type { Appointment } from "./page"

type Props = {
  appointment: Appointment
  onClose: () => void
  onNotesChange: (id: number, notes: string) => Promise<void>
}

export function AppointmentDetail({ appointment: appt, onClose, onNotesChange }: Props) {
  const [savingNotes, setSavingNotes] = useState(false)
  const [notes, setNotes]             = useState(appt.additional_notes ?? "")
  const [notesDirty, setNotesDirty]   = useState(false)

  const mp = appt.medical_providers

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    await onNotesChange(appt.id, notes)
    setSavingNotes(false)
    setNotesDirty(false)
  }

  const fmtDate = (d?: string | null) => {
    if (!d) return "—"
    return new Date(d + (d.length === 10 ? "T12:00:00" : ""))
      .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }
  const fmtDateTime = (d?: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-card">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{appt.patient_name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">#{appt.id} · {fmtDate(appt.created_at)}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 -mr-1 -mt-0.5" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* ── Patient ── */}
          <Section title="Patient" icon={<User className="w-3.5 h-3.5" />}>
            <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={appt.patient_name || "—"} />
            {appt.date_of_birth && <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="DOB" value={fmtDate(appt.date_of_birth)} />}
            {appt.date_of_injury && <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="DOI" value={fmtDate(appt.date_of_injury)} />}
            {appt.phone && (
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={
                <a href={`tel:${appt.phone}`} className="hover:text-primary transition-colors">{appt.phone}</a>
              } />
            )}
          </Section>

          {/* ── Service & Visit ── */}
          {(appt.service_type || appt.visit_format || appt.availability) && (
            <>
              <Separator />
              <Section title="Service Details" icon={<Stethoscope className="w-3.5 h-3.5" />}>
                {appt.service_type && (
                  <InfoRow icon={<Stethoscope className="w-3.5 h-3.5" />} label="Service" value={
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {appt.service_type}
                    </span>
                  } />
                )}
                {appt.visit_format && (
                  <InfoRow icon={<Monitor className="w-3.5 h-3.5" />} label="Format" value={
                    <span className="capitalize">{appt.visit_format.replace("_", " ")}</span>
                  } />
                )}
                {appt.availability && (
                  <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Availability" value={appt.availability} />
                )}
              </Section>
            </>
          )}

          {/* ── Provider — full data from medical_providers join ── */}
          {(mp || appt.provider_name) && (
            <>
              <Separator />
              <Section
                title={mp ? "Provider (verified)" : "Provider (unverified)"}
                icon={<Building2 className="w-3.5 h-3.5" />}
                badge={mp
                  ? <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400"><CheckCircle2 className="w-3 h-3" />Linked</span>
                  : <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">Text only</span>
                }
              >
                {/* Name */}
                <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Clinic" value={
                  <span className="font-medium">{mp?.provider_name ?? appt.provider_name}</span>
                } />

                {/* Doctor name */}
                {mp?.doctor_name && (
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Doctor" value={mp.doctor_name} />
                )}

                {/* Specialty */}
                {(mp?.specialty ?? appt.provider_specialty) && (
                  <InfoRow icon={<Stethoscope className="w-3.5 h-3.5" />} label="Specialty" value={mp?.specialty ?? appt.provider_specialty!} />
                )}

                {/* Address */}
                {(mp?.address ?? appt.provider_address) && (
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Address" value={
                    <span>
                      {mp
                        ? [mp.address, mp.address_line_2, mp.city, mp.state, mp.zip_code].filter(Boolean).join(", ")
                        : appt.provider_address
                      }
                    </span>
                  } />
                )}

                {/* Contact info from real record */}
                {mp?.intake_phone && (
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Intake ph." value={
                    <a href={`tel:${mp.intake_phone}`} className="hover:text-primary transition-colors">{mp.intake_phone}</a>
                  } />
                )}
                {mp?.intake_email && (
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Intake email" value={
                    <a href={`mailto:${mp.intake_email}`} className="hover:text-primary transition-colors truncate">{mp.intake_email}</a>
                  } />
                )}
                {mp?.records_email && (
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Records" value={
                    <a href={`mailto:${mp.records_email}`} className="hover:text-primary transition-colors truncate">{mp.records_email}</a>
                  } />
                )}
                {mp?.billing_email && (
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Billing" value={
                    <a href={`mailto:${mp.billing_email}`} className="hover:text-primary transition-colors truncate">{mp.billing_email}</a>
                  } />
                )}
                {mp?.negotiations_email && (
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Negotiations" value={
                    <a href={`mailto:${mp.negotiations_email}`} className="hover:text-primary transition-colors truncate">{mp.negotiations_email}</a>
                  } />
                )}

                {/* Hours */}
                {mp?.hours_of_operation && (
                  <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Hours" value={mp.hours_of_operation} />
                )}

                {/* Website */}
                {mp?.website_url && (
                  <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Website" value={
                    <a href={mp.website_url} target="_blank" rel="noopener noreferrer"
                      className="hover:text-primary transition-colors flex items-center gap-1 truncate">
                      {mp.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  } />
                )}

                {/* Capabilities tags */}
                {mp && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
                    {mp.pi && <Tag color="rose" label="PI" />}
                    {mp.workers_comp && <Tag color="amber" label="Workers Comp" />}
                    {mp.telemed && <Tag color="blue" label="Telemed" />}
                    {mp.in_person && <Tag color="violet" label="In-Person" />}
                    {(mp.languages ?? []).map(l => <Tag key={l} color="teal" label={l} />)}
                    {(mp.modality ?? []).map(m => <Tag key={m} color="slate" label={m} />)}
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ── Attorney / Legal ── */}
          {(appt.attorney_name || appt.legal_firm || appt.attorney_email || appt.attorney_phone) && (
            <>
              <Separator />
              <Section title="Attorney" icon={<Gavel className="w-3.5 h-3.5" />}>
                {appt.legal_firm && <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Firm" value={appt.legal_firm} />}
                {appt.attorney_name && <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Attorney" value={appt.attorney_name} />}
                {appt.attorney_email && (
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={
                    <a href={`mailto:${appt.attorney_email}`} className="hover:text-primary transition-colors truncate">{appt.attorney_email}</a>
                  } />
                )}
                {appt.attorney_phone && (
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={
                    <a href={`tel:${appt.attorney_phone}`} className="hover:text-primary transition-colors">{appt.attorney_phone}</a>
                  } />
                )}
              </Section>
            </>
          )}

          {appt.document_uploads && appt.document_uploads.length > 0 && (
            <>
              <Separator />
              <Section title="Documents" icon={<FileText className="w-3.5 h-3.5" />}>
                <div className="space-y-2">
                  {appt.document_uploads.map((doc: any) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/30 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground group-hover:text-primary transition-colors">
                          {doc.file_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                          {doc.document_type.replace('_', ' ')}
                          {doc.uploaded_at && ` · ${new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        </p>
                      </div>
                      <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ── Internal Notes ── */}
          <Separator />
          <Section title="Internal Notes" icon={<FileText className="w-3.5 h-3.5" />}>
            <Textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesDirty(true) }}
              placeholder="Add notes about this appointment…"
              className="text-sm min-h-[80px] resize-none"
              rows={3}
            />
            {notesDirty && (
              <Button size="sm" className="mt-2 h-7 text-xs gap-1.5" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes && <Loader2 className="w-3 h-3 animate-spin" />}Save Notes
              </Button>
            )}
          </Section>

          {/* ── Timestamps ── */}
          <div className="pt-1 space-y-1">
            <p className="text-[11px] text-muted-foreground/70">Created: {fmtDateTime(appt.created_at)}</p>
            <p className="text-[11px] text-muted-foreground/70">Updated: {fmtDateTime(appt.updated_at)}</p>
            <p className="text-[11px] text-muted-foreground/70 truncate">Session: {appt.session_id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, icon, badge, children }: {
  title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {badge}
      </div>
      <div className="space-y-2 pl-0.5">{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground/60 mt-0.5 shrink-0">{icon}</span>
      <span className="text-muted-foreground shrink-0 w-24 text-xs pt-0.5">{label}</span>
      <span className="text-foreground text-xs leading-relaxed min-w-0 flex-1">{value}</span>
    </div>
  )
}

function Tag({ color, label }: { color: "rose" | "amber" | "blue" | "violet" | "green" | "teal" | "slate"; label: string }) {
  const cls = {
    rose: "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400",
    green: "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400",
    teal: "bg-teal-100 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400",
    slate: "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400",
  }[color]
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  )
}

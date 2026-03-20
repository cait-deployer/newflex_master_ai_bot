"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  X, Phone, Mail, MapPin, Stethoscope,
  Globe, User, Monitor, Building2, Zap, Users,
  Pencil, Trash2, ExternalLink, Clock, Languages, Cpu,
} from "lucide-react"
import type { Provider } from "./page"

type Props = {
  provider: Provider
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

export function ProviderDetail({ provider, onClose, onEdit, onDelete }: Props) {
  const location = [provider.address, provider.address_line_2, provider.city, provider.state, provider.zip_code]
    .filter(Boolean).join(", ")

  return (
    <div className="flex flex-col h-full bg-card">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {provider.logo_url ? (
              <img
                src={provider.logo_url}
                alt={provider.provider_name}
                className="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{provider.provider_name}</p>
              {provider.specialty && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{provider.specialty}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Service tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {provider.telemed && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <Monitor className="w-3 h-3" /> Telemed
            </span>
          )}
          {provider.in_person && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
              <Building2 className="w-3 h-3" /> In-Person
            </span>
          )}
          {provider.workers_comp && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <Zap className="w-3 h-3" /> Workers Comp
            </span>
          )}
          {provider.pi && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              <Users className="w-3 h-3" /> PI
            </span>
          )}
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Basic info */}
        <div className="space-y-3">
          <Row icon={<User className="w-3.5 h-3.5 text-muted-foreground" />} label="Doctor" value={provider.doctor_name} />
          <Row icon={<MapPin className="w-3.5 h-3.5 text-muted-foreground" />} label="Address" value={location} />
          <Row icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />} label="Hours" value={provider.hours_of_operation} />
        </div>

        <Separator />

        {/* Contact */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
          <Row icon={<Phone className="w-3.5 h-3.5 text-muted-foreground" />} label="Intake Phone" value={provider.intake_phone} />
          <Row icon={<Mail className="w-3.5 h-3.5 text-muted-foreground" />} label="Intake Email" value={provider.intake_email} />
          <Row icon={<Mail className="w-3.5 h-3.5 text-muted-foreground" />} label="Records Email" value={provider.records_email} />
          <Row icon={<Mail className="w-3.5 h-3.5 text-muted-foreground" />} label="Billing Email" value={provider.billing_email} />
          <Row icon={<Mail className="w-3.5 h-3.5 text-muted-foreground" />} label="Negotiations Email" value={provider.negotiations_email} />
          {provider.website_url && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Website</p>
                <a
                  href={provider.website_url.startsWith("http") ? provider.website_url : `https://${provider.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline underline-offset-2 mt-0.5 flex items-center gap-1 truncate"
                >
                  {provider.website_url}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modalities */}
        {provider.modality && provider.modality.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Modalities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {provider.modality.map((m) => (
                  <Badge key={m} variant="secondary" className="text-[11px] px-2 py-0.5 rounded-md font-normal">{m}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Machine descriptions */}
        {provider.machine_description && provider.machine_description.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipment</p>
            <div className="flex flex-wrap gap-1.5">
              {provider.machine_description.map((m) => (
                <Badge key={m} variant="outline" className="text-[11px] px-2 py-0.5 rounded-md font-normal">{m}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {provider.languages && provider.languages.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" /> Languages
              </p>
              <div className="flex flex-wrap gap-1.5">
                {provider.languages.map((l) => (
                  <Badge key={l} variant="secondary" className="text-[11px] px-2 py-0.5 rounded-md font-normal">{l}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* GPS */}
        {provider.latitude && provider.longitude && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coordinates</p>
              <p className="text-xs text-muted-foreground font-mono">
                {provider.latitude.toFixed(6)}, {provider.longitude.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${provider.latitude},${provider.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2 mt-1"
              >
                <MapPin className="w-3 h-3" /> Open in Google Maps
              </a>
            </div>
          </>
        )}

      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 shrink-0 flex gap-2">
        <Button
          variant="outline" size="sm"
          className="flex-1 gap-1.5 h-9 hover:text-primary hover:border-primary/50 transition-colors"
          onClick={onEdit}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
        <Button
          variant="outline" size="sm"
          className="flex-1 gap-1.5 h-9 hover:text-destructive hover:border-destructive/50 transition-colors"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  MapPin, Phone, Mail, Pencil, Trash2,
  Stethoscope, Globe, User, Monitor, Building2,
  CheckCircle2, XCircle, Zap, Users,
} from "lucide-react"
import type { Provider } from "./page"

type Props = { provider: Provider; onEdit: () => void; onDelete: () => void }

export function ProviderCard({ provider, onEdit, onDelete }: Props) {
  const location = [provider.city, provider.state].filter(Boolean).join(", ")
  const modalities = provider.modality ?? []
  const hasLogo = !!provider.logo_url

  return (
    <Card className="group !p-0 gap-3 flex flex-col hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top accent bar based on specialty */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

      <CardContent className="flex-1 pt-4 pb-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {hasLogo ? (
              <img
                src={provider.logo_url}
                alt={provider.provider_name}
                className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{provider.provider_name}</p>
              {provider.specialty && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{provider.specialty}</p>
              )}
            </div>
          </div>

          {/* Status badges */}
          {/* <div className="flex flex-col gap-1 shrink-0">
            <StatusBadge active={provider.accepting_patients !== false} activeLabel="Open" inactiveLabel="Closed" />
          </div> */}
        </div>

        {/* Doctor name */}
        {provider.doctor_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{provider.doctor_name}</span>
          </div>
        )}

        {/* Location */}
        {(location || provider.address) && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              {provider.address && <p className="truncate">{provider.address}{provider.address_line_2 ? `, ${provider.address_line_2}` : ""}</p>}
              {location && <p className="truncate">{location}{provider.zip_code ? ` ${provider.zip_code}` : ""}</p>}
            </div>
          </div>
        )}

        {/* Contact */}
        {provider.intake_phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{provider.intake_phone}</span>
          </div>
        )}
        {provider.intake_email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{provider.intake_email}</span>
          </div>
        )}
        {provider.website_url && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <a
              href={provider.website_url.startsWith("http") ? provider.website_url : `https://${provider.website_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {provider.website_url}
            </a>
          </div>
        )}

        {/* Service tags */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
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

        {/* Modalities */}
        {modalities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {modalities.map((m) => (
              <Badge key={m} variant="secondary" className="text-[11px] px-2 py-0 h-5 rounded-md font-normal">
                {m}
              </Badge>
            ))}
          </div>
        )}

        {/* Languages */}
        {provider.languages && provider.languages.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            🌐 {provider.languages.join(", ")}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-3 px-4 flex gap-2 border-t border-border/50 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 h-8 hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={onEdit}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
        <div className="w-px h-5 bg-border/60" />
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 h-8 hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </CardFooter>
    </Card>
  )
}

function StatusBadge({ active, activeLabel, inactiveLabel }: { active: boolean; activeLabel: string; inactiveLabel: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${active
      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
      : "bg-muted text-muted-foreground border-border"
      }`}>
      {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

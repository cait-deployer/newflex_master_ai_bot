"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MapPin, Phone, Mail, Pencil, Trash2,
  Stethoscope, Globe, User, Monitor, Building2, Zap, Users,
} from "lucide-react"
import type { Provider } from "./page"

type Props = {
  provider: Provider
  selected: boolean
  isActive?: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onOpen: () => void
}

export function ProviderCard({ provider, selected, isActive, onSelect, onEdit, onDelete, onOpen }: Props) {
  const location = [provider.city, provider.state].filter(Boolean).join(", ")
  const modalities = provider.modality ?? []
  const hasLogo = !!provider.logo_url

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        onClick={onOpen}
        className={`
        group !p-0 gap-3 flex flex-col transition-all duration-200 overflow-hidden cursor-pointer
        ${isActive
            ? "border-primary shadow-md ring-2 ring-primary/30"
            : selected
              ? "border-primary/60 shadow-md ring-2 ring-primary/20"
              : "hover:border-primary/40 hover:shadow-md"
          }
      `}>
        {/* Top accent bar */}
        <div className={`h-1 w-full transition-all duration-200 ${isActive ? "bg-primary" : selected ? "bg-primary" : "bg-gradient-to-r from-primary/60 via-primary/30 to-transparent"}`} />

        <CardContent className="flex-1 pt-3 pb-3 space-y-3">
          {/* Header row — name + checkbox */}
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
            <div className="shrink-0 -mt-0.5 -mr-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelect()}
                aria-label={`Select ${provider.provider_name}`}
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Doctor name */}
          {provider.doctor_name && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{provider.doctor_name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left"><p>Doctor / Physician</p></TooltipContent>
            </Tooltip>
          )}

          {/* Location */}
          {(location || provider.address) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground cursor-default">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {provider.address && (
                      <p className="truncate">{provider.address}{provider.address_line_2 ? `, ${provider.address_line_2}` : ""}</p>
                    )}
                    {location && (
                      <p className="truncate">{location}{provider.zip_code ? ` ${provider.zip_code}` : ""}</p>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left"><p>Address</p></TooltipContent>
            </Tooltip>
          )}

          {/* Contact */}
          {provider.intake_phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{provider.intake_phone}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left"><p>Intake phone</p></TooltipContent>
            </Tooltip>
          )}
          {provider.intake_email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{provider.intake_email}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left"><p>Intake email</p></TooltipContent>
            </Tooltip>
          )}
          {provider.website_url && (
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent side="left"><p>Website</p></TooltipContent>
            </Tooltip>
          )}

          {/* Service tags */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {provider.telemed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 cursor-default">
                    <Monitor className="w-3 h-3" /> Telemed
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Remote consultations available</p></TooltipContent>
              </Tooltip>
            )}
            {provider.in_person && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 cursor-default">
                    <Building2 className="w-3 h-3" /> In-Person
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Physical visits available</p></TooltipContent>
              </Tooltip>
            )}
            {provider.workers_comp && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 cursor-default">
                    <Zap className="w-3 h-3" /> Workers Comp
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Accepts Workers Compensation</p></TooltipContent>
              </Tooltip>
            )}
            {provider.pi && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 cursor-default">
                    <Users className="w-3 h-3" /> PI
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Accepts Personal Injury cases</p></TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Modalities */}
          {modalities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {modalities.map((m) => (
                <Tooltip key={m}>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[11px] px-2 py-0 h-5 rounded-md font-normal cursor-default">{m}</Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>Modality: {m}</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {/* Languages */}
          {provider.languages && provider.languages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[11px] text-muted-foreground cursor-default">🌐 {provider.languages.join(", ")}</p>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Languages spoken at this facility</p></TooltipContent>
            </Tooltip>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-3 px-4 flex gap-2 border-t border-border/50 bg-muted/20" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className="flex-1 gap-1.5 h-8 hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Edit provider</p></TooltipContent>
          </Tooltip>
          <div className="w-px h-5 bg-border/60" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className="flex-1 gap-1.5 h-8 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Delete provider</p></TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>
    </TooltipProvider>
  )
}

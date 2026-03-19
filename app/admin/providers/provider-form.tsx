"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft, Loader2, UserPlus, Pencil,
  MapPin, Phone, Mail, Stethoscope,
  Building2, Globe, User, Monitor, Zap, Users,
} from "lucide-react"
import { GoogleLocationPicker, type LocationResult } from "@/components/location-picker"
import type { Provider } from "./page"

type FormData = Omit<Provider, "id" | "created_at">

type Props =
  | { mode: "create"; initialData?: undefined; onSubmit: (d: FormData) => void; onCancel: () => void; saving: boolean }
  | { mode: "edit"; initialData: Provider; onSubmit: (d: FormData) => void; onCancel: () => void; saving: boolean }

const EMPTY: FormData = {
  provider_name: "", doctor_name: "", specialty: "",
  address: "", address_line_2: "",
  city: "", state: "", zip_code: "",
  latitude: undefined, longitude: undefined,
  intake_phone: "", intake_email: "",
  records_email: "", billing_email: "", negotiations_email: "",
  website_url: "", logo_url: "", hours_of_operation: "",
  modality: [], machine_description: [], languages: [],
  workers_comp: false, pi: false, telemed: false,
  in_person: true,
  rating: undefined,
}

export function ProviderForm({ mode, initialData, onSubmit, onCancel, saving }: Props) {
  const [form, setForm] = useState<FormData>(initialData ? { ...initialData } : EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  useEffect(() => { if (initialData) setForm({ ...initialData }) }, [initialData])

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const setArr = (key: "modality" | "machine_description" | "languages", raw: string) =>
    set(key, raw.split(",").map((s) => s.trim()).filter(Boolean))
  const getArr = (key: "modality" | "machine_description" | "languages") =>
    (form[key] ?? []).join(", ")

  // ── Google Maps → auto-fill fields ───────────────────────────────────────
  const handleLocationSelected = (loc: LocationResult) => {
    setForm((prev) => ({
      ...prev,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address || prev.address,
      city: loc.city || prev.city,
      state: loc.state || prev.state,
      zip_code: loc.zip_code || prev.zip_code,
    }))
    setErrors((p) => ({ ...p, address: undefined, city: undefined }))
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: typeof errors = {}
    if (!form.provider_name.trim()) e.provider_name = "Required"
    if (!form.specialty?.trim()) e.specialty = "Required"
    if (!form.address?.trim()) e.address = "Required"
    if (!form.city?.trim()) e.city = "Required"
    if (form.intake_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.intake_email))
      e.intake_email = "Invalid email"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => { if (validate()) onSubmit(form) }
  const isEdit = mode === "edit"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b-2">
        <Button variant="ghost" size="icon" onClick={onCancel} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            {isEdit ? <Pencil className="w-8 h-8 text-primary" /> : <UserPlus className="w-8 h-8 text-primary" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEdit ? "Edit Provider" : "Add Provider"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? `Editing: ${initialData?.provider_name}` : "Fill in details for the new provider."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="w-4 h-4 text-primary" /> Basic Information
            </CardTitle>
            <CardDescription>Provider identity and specialty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Provider / Clinic Name *" error={errors.provider_name}>
              <Input placeholder="Dallas MRI Center" value={form.provider_name}
                onChange={(e) => set("provider_name", e.target.value)}
                className={errors.provider_name ? "border-destructive" : ""} />
            </Field>
            <Field label="Doctor Name">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Dr. Jane Smith" value={form.doctor_name ?? ""}
                  onChange={(e) => set("doctor_name", e.target.value)} className="pl-9" />
              </div>
            </Field>
            <Field label="Specialty *" error={errors.specialty}>
              <Input placeholder="Radiology, Pain Management…" value={form.specialty ?? ""}
                onChange={(e) => set("specialty", e.target.value)}
                className={errors.specialty ? "border-destructive" : ""} />
            </Field>
            <Field label="Website">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="https://clinic.com" value={form.website_url ?? ""}
                  onChange={(e) => set("website_url", e.target.value)} className="pl-9" />
              </div>
            </Field>
            <Field label="Logo URL">
              <Input placeholder="https://…/logo.png" value={form.logo_url ?? ""}
                onChange={(e) => set("logo_url", e.target.value)} />
            </Field>
            <Field label="Hours of Operation">
              <Input placeholder="Mon–Fri 8am–6pm" value={form.hours_of_operation ?? ""}
                onChange={(e) => set("hours_of_operation", e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="w-4 h-4 text-primary" /> Contacts
            </CardTitle>
            <CardDescription>Phones and emails by department</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Intake Phone">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="+1 (555) 000-0000" value={form.intake_phone ?? ""}
                  onChange={(e) => set("intake_phone", e.target.value)} className="pl-9" />
              </div>
            </Field>
            <Field label="Intake Email" error={errors.intake_email}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="intake@clinic.com" value={form.intake_email ?? ""}
                  onChange={(e) => set("intake_email", e.target.value)}
                  className={`pl-9 ${errors.intake_email ? "border-destructive" : ""}`} />
              </div>
            </Field>
            <Field label="Records Email">
              <Input type="email" placeholder="records@clinic.com" value={form.records_email ?? ""}
                onChange={(e) => set("records_email", e.target.value)} />
            </Field>
            <Field label="Billing Email">
              <Input type="email" placeholder="billing@clinic.com" value={form.billing_email ?? ""}
                onChange={(e) => set("billing_email", e.target.value)} />
            </Field>
            <Field label="Negotiations Email">
              <Input type="email" placeholder="negotiations@clinic.com" value={form.negotiations_email ?? ""}
                onChange={(e) => set("negotiations_email", e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* ── Location ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" /> Location
          </CardTitle>
          <CardDescription>
            Search address or click the map — fields fill automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="grid gap-4 sm:grid-cols-2">

            {/* Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Address *</Label>
              <GoogleLocationPicker
                onLocationSelected={handleLocationSelected}
                defaultLat={form.latitude}
                defaultLng={form.longitude}
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>

            {/* Address Line 2 */}
            {/* <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Additional Address</Label>
              <GoogleLocationPicker
                onLocationSelected={handleLocationSelected}
                onLine2Changed={(val) => set("address_line_2", val)}
                defaultLat={form.latitude}
                defaultLng={form.longitude}
                line2Value={form.address_line_2}
              />
            </div> */}

            <Field label="City *" error={errors.city}>
              <Input placeholder="Dallas" value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                className={errors.city ? "border-destructive" : ""} />
            </Field>

            <Field label="State">
              <Input placeholder="TX" maxLength={2} value={form.state ?? ""}
                onChange={(e) => set("state", e.target.value.toUpperCase())} />
            </Field>

            <Field label="ZIP Code">
              <Input placeholder="77001" value={form.zip_code ?? ""}
                onChange={(e) => set("zip_code", e.target.value)} />
            </Field>

            {/* Latitude & Longitude — приховані від юзера, передаються в БД через form state */}
            <input type="hidden" value={form.latitude ?? ""} />
            <input type="hidden" value={form.longitude ?? ""} />

          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" /> Services & Features
          </CardTitle>
          <CardDescription>Modalities, languages and service types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* <SwitchRow label="Accepting Patients" desc="Visible in chat search"
              checked={form.accepting_patients !== false}
              onCheckedChange={(v) => set("accepting_patients", v)} />
            <Separator /> */}
            <SwitchRow label="Telemed" desc="Remote consultations"
              icon={<Monitor className="w-4 h-4 text-blue-500" />}
              checked={!!form.telemed} onCheckedChange={(v) => set("telemed", v)} />
            <SwitchRow label="In-Person" desc="Physical visits"
              icon={<Building2 className="w-4 h-4 text-violet-500" />}
              checked={!!form.in_person} onCheckedChange={(v) => set("in_person", v)} />
            <SwitchRow label="Workers Comp" desc="Accepts workers compensation"
              icon={<Zap className="w-4 h-4 text-amber-500" />}
              checked={!!form.workers_comp} onCheckedChange={(v) => set("workers_comp", v)} />
            <SwitchRow label="Personal Injury (PI)" desc="Accepts PI cases"
              icon={<Users className="w-4 h-4 text-rose-500" />}
              checked={!!form.pi} onCheckedChange={(v) => set("pi", v)} />
          </div>
          <Separator />
          <Field label="Modalities (comma-separated)">
            <Input placeholder="MRI, CT Scan, X-Ray" value={getArr("modality")}
              onChange={(e) => setArr("modality", e.target.value)} />
          </Field>
          <Field label="Machine Models (comma-separated)">
            <Input placeholder="Somation, Siemens 3T" value={getArr("machine_description")}
              onChange={(e) => setArr("machine_description", e.target.value)} />
          </Field>
          <Field label="Languages (comma-separated)">
            <Input placeholder="English, Spanish" value={getArr("languages")}
              onChange={(e) => setArr("languages", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-2 pb-6">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving} className="min-w-[140px] gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Provider"}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, error, children, className }: {
  label: string; error?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function SwitchRow({ label, desc, checked, onCheckedChange, icon }: {
  label: string; desc?: string; checked: boolean
  onCheckedChange: (v: boolean) => void; icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

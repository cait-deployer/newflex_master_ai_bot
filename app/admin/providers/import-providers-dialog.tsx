"use client"

import { useRef, useState, useCallback } from "react"
import * as XLSX from "xlsx"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Upload, FileSpreadsheet, X, CheckCircle2,
  AlertTriangle, Loader2, Download, Info,
  ArrowRight, SkipForward, Check,
} from "lucide-react"
import type { ImportRow } from "@/app/api/admin/providers/import/route"

// DB fields
export type DbField = keyof ImportRow

const DB_FIELDS: { value: DbField; label: string; required?: boolean; hint?: string }[] = [
  { value: "provider_name", label: "Provider Name", required: true },
  { value: "doctor_name", label: "Doctor Name" },
  { value: "specialty", label: "Specialty" },
  { value: "address", label: "Address", required: true },
  { value: "address_line_2", label: "Address Line 2" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip_code", label: "Zip Code" },
  { value: "intake_phone", label: "Intake Phone" },
  { value: "intake_email", label: "Intake Email" },
  { value: "records_email", label: "Records Email" },
  { value: "billing_email", label: "Billing Email" },
  { value: "negotiations_email", label: "Negotiations Email" },
  { value: "website_url", label: "Website URL" },
  { value: "logo_url", label: "Logo URL" },
  { value: "modality", label: "Modality", hint: "comma-separated" },
  { value: "machine_description", label: "Machine Description", hint: "comma-separated" },
  { value: "languages", label: "Languages", hint: "comma-separated" },
  { value: "hours_of_operation", label: "Hours of Operation" },
  { value: "latitude", label: "Latitude" },
  { value: "longitude", label: "Longitude" },
  { value: "workers_comp", label: "Workers Comp", hint: "true/false" },
  { value: "pi", label: "PI", hint: "true/false" },
  { value: "telemed", label: "Telemed", hint: "true/false" },
  { value: "in_person", label: "In-Person", hint: "true/false" },
]

const REQUIRED_FIELDS = new Set<DbField>(["provider_name", "address"])
const ARRAY_FIELDS = new Set<DbField>(["modality", "machine_description", "languages"])
const BOOL_FIELDS = new Set<DbField>(["workers_comp", "pi", "telemed", "in_person"])
const NUM_FIELDS = new Set<DbField>(["latitude", "longitude"])

// Fuzzy auto-mapper 
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function normalize(s: string) {
  // strip spaces, underscores, dashes, dots, slashes
  return s.toLowerCase().replace(/[\s_\-\.\/\\]+/g, "")
}

const ALIASES: Record<string, DbField> = {
  // provider_name
  "name": "provider_name", "clinic": "provider_name", "practicename": "provider_name",
  "providername": "provider_name", "facilityname": "provider_name", "facility": "provider_name",
  "organization": "provider_name", "org": "provider_name", "practice": "provider_name",
  // doctor_name
  "doctor": "doctor_name", "physician": "doctor_name", "md": "doctor_name", "dr": "doctor_name",
  "provider": "doctor_name", "clinician": "doctor_name", "doctorname": "doctor_name",
  // specialty
  "type": "specialty", "category": "specialty", "field": "specialty",
  "specialization": "specialty", "discipline": "specialty", "dept": "specialty",
  "department": "specialty", "service": "specialty",
  // address
  "street": "address", "addr": "address", "streetaddress": "address",
  "address1": "address", "addr1": "address",
  // address_line_2
  "suite": "address_line_2", "suitefloor": "address_line_2", "address2": "address_line_2",
  "addr2": "address_line_2", "unit": "address_line_2", "apt": "address_line_2",
  "floor": "address_line_2", "room": "address_line_2", "ste": "address_line_2",
  // state
  "st": "state", "province": "state", "region": "state",
  // zip_code
  "zip": "zip_code", "postal": "zip_code", "postalcode": "zip_code", "zipcode": "zip_code",
  // intake_phone
  "phone": "intake_phone", "tel": "intake_phone", "telephone": "intake_phone",
  "contactphone": "intake_phone", "phonenumber": "intake_phone", "mobile": "intake_phone",
  "cell": "intake_phone",
  // intake_email
  "email": "intake_email", "mail": "intake_email", "contactemail": "intake_email",
  "intakeemail": "intake_email",
  // billing_email
  "billing": "billing_email", "billingemail": "billing_email",
  // records_email
  "records": "records_email", "recordsemail": "records_email", "medicalrecords": "records_email",
  // negotiations_email
  "negotiations": "negotiations_email", "negotiation": "negotiations_email",
  // website_url
  "website": "website_url", "url": "website_url", "web": "website_url", "site": "website_url",
  "webpage": "website_url", "homepage": "website_url",
  // logo_url
  "logo": "logo_url", "logourl": "logo_url", "image": "logo_url",
  // coordinates
  "lat": "latitude", "lng": "longitude", "lon": "longitude", "long": "longitude",
  // workers_comp
  "wc": "workers_comp", "workerscomp": "workers_comp", "workercomp": "workers_comp",
  "workerscompensation": "workers_comp",
  // pi
  "pi": "pi", "personalinjury": "pi", "injury": "pi",
  // telemed
  "telemed": "telemed", "telehealth": "telemed", "virtual": "telemed",
  "online": "telemed", "remote": "telemed", "telemedicine": "telemed",
  // in_person
  "inperson": "in_person", "onsite": "in_person", "walkin": "in_person",
  "office": "in_person", "inoffice": "in_person", "physical": "in_person",
  // modality
  "modality": "modality", "modalities": "modality", "equipment": "modality",
  "services": "modality", "imaging": "modality",
  // machine_description
  "machines": "machine_description", "machinedescription": "machine_description",
  "machinedetails": "machine_description", "scanners": "machine_description",
  "devices": "machine_description",
  // languages
  "language": "languages", "lang": "languages", "spokenlanguages": "languages",
  // hours_of_operation
  "hours": "hours_of_operation", "schedule": "hours_of_operation",
  "businesshours": "hours_of_operation", "operatinghours": "hours_of_operation",
  "workinghours": "hours_of_operation",
}

function autoMapColumn(excelHeader: string): DbField | null {
  const norm = normalize(excelHeader)
  if (ALIASES[norm]) return ALIASES[norm]
  const exact = DB_FIELDS.find(
    (f) => normalize(f.value) === norm || normalize(f.label) === norm
  )
  if (exact) return exact.value
  let best: DbField | null = null
  let bestScore = Infinity
  for (const f of DB_FIELDS) {
    const score = Math.min(
      levenshtein(norm, normalize(f.value)),
      levenshtein(norm, normalize(f.label))
    )
    if (score < bestScore) { bestScore = score; best = f.value }
  }
  const threshold = Math.max(3, Math.floor(norm.length * 0.4))
  return bestScore <= threshold ? best : null
}

// Value parser
function parseValue(field: DbField, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === "") return undefined
  const str = String(raw).trim()
  if (ARRAY_FIELDS.has(field))
    return str.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
  if (BOOL_FIELDS.has(field))
    return ["1", "true", "yes", "✓", "y"].includes(str.toLowerCase())
  if (NUM_FIELDS.has(field)) {
    const n = parseFloat(str)
    return isNaN(n) ? undefined : n
  }
  return str
}

// Template download 
function downloadTemplate() {
  // Uses "human-friendly" column names to show how flexible the mapper is
  const headers = [
    "Clinic Name", "Physician", "Type",
    "Street Address", "Suite / Floor", "City", "ST", "ZIP",
    "Phone Number", "Email", "Records Email", "Billing",
    "Website", "Equipment", "Machines", "Languages",
    "Telehealth", "Walk-In", "WC", "Personal Injury",
  ]

  const sampleRows = [
    [
      "Dallas Spine & Ortho MRI", "Dr. Sarah Mitchell", "Orthopedics",
      "4521 Medical District Dr", "Suite 200", "Dallas", "TX", "75235",
      "214-555-0181", "intake@dallasspinemri.com", "records@dallasspinemri.com", "billing@dallasspinemri.com",
      "https://dallasspinemri.com", "MRI,CT,X-Ray", "Siemens MAGNETOM 3T,GE Revolution CT", "English,Spanish",
      "Yes", "Yes", "Yes", "Yes",
    ],
    [
      "Houston Neuro Imaging Center", "Dr. James Patel", "Neurology",
      "1200 Binz St", "", "Houston", "TX", "77004",
      "713-555-0294", "intake@houstonneuro.com", "records@houstonneuro.com", "",
      "https://houstonneuro.com", "MRI,PET Scan,EEG", "Philips Ingenia 3T", "English,Hindi,Urdu",
      "Yes", "Yes", "No", "Yes",
    ],
    [
      "Austin Physical Rehab & Sports", "Dr. Emily Nguyen", "Physical Therapy",
      "3003 Bee Caves Rd", "Bldg C", "Austin", "TX", "78746",
      "512-555-0377", "intake@austinrehab.com", "records@austinrehab.com", "billing@austinrehab.com",
      "https://austinrehab.com", "Ultrasound,X-Ray", "GE Logiq Ultrasound", "English,Spanish,Vietnamese",
      "Yes", "Yes", "Yes", "Yes",
    ],
    [
      "San Antonio Advanced Radiology", "Dr. Carlos Rivera", "Radiology",
      "8711 Village Dr", "Suite 101", "San Antonio", "TX", "78217",
      "210-555-0462", "intake@saradiology.com", "records@saradiology.com", "billing@saradiology.com",
      "https://saradiology.com", "MRI,CT,Mammography", "Canon Aquilion CT,Hologic Selenia", "English,Spanish",
      "No", "Yes", "Yes", "No",
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
  // Column widths
  ws["!cols"] = [32, 20, 16, 26, 14, 14, 6, 8, 16, 28, 28, 26, 28, 22, 30, 22, 12, 10, 8, 14].map((w) => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Providers")
  XLSX.writeFile(wb, "providers_import_sample.xlsx")
}

// Types
type Mapping = Record<string, DbField | "__skip__">
type DuplicateStrategy = 'upsert' | 'skip' | 'insert'
type ImportResult = { inserted: number; updated: number; skipped: number; errors: { row: number; message: string }[] }
type Step = "idle" | "reading" | "mapping" | "preview" | "importing" | "done"

interface Props { open: boolean; onClose: () => void; onSuccess: () => void }

// Step indicator
const WIZARD_STEPS = [
  { key: "mapping", label: "Map Columns", short: "Map" },
  { key: "preview", label: "Preview", short: "Preview" },
  { key: "done", label: "Done", short: "Done" },
] as const

function StepIndicator({ current }: { current: Step }) {
  const curIdx = WIZARD_STEPS.findIndex((s) => s.key === current)
  // treat "importing" as same visual position as "preview"
  const activeIdx = current === "importing" ? 1 : curIdx

  return (
    <div className="flex items-center gap-0 mt-4">
      {WIZARD_STEPS.map((s, i) => {
        const isDone = activeIdx > i
        const isActive = activeIdx === i

        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            {/* node */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`
                  relative flex items-center justify-center rounded-full
                  w-8 h-8 text-xs font-bold border-2 transition-all duration-300
                  ${isDone
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : isActive
                      ? "bg-primary/10 border-primary text-primary shadow-sm shadow-primary/20"
                      : "bg-muted border-border text-muted-foreground"
                  }
                `}
              >
                {isDone
                  ? <Check className="w-3.5 h-3.5" />
                  : <span>{i + 1}</span>
                }
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-primary/20 -z-10" />
                )}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap hidden sm:block ${isActive ? "text-primary" : isDone ? "text-primary/70" : "text-muted-foreground"
                  }`}
              >
                {s.label}
              </span>
            </div>

            {/* connector line — not after last */}
            {i < WIZARD_STEPS.length - 1 && (
              <div className="flex-1 mx-1.5 mb-3.5 sm:mb-[22px] h-0.5 rounded-full overflow-hidden bg-border">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: isDone ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Component
export function ImportProvidersDialog({ open, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("idle")
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [rows, setRows] = useState<ImportRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [strategy, setStrategy] = useState<DuplicateStrategy>('upsert')
  const [apiError, setApiError] = useState<string | null>(null)

  const reset = () => {
    setStep("idle"); setFileName(""); setExcelHeaders([])
    setRawData([]); setMapping({}); setRows([])
    setResult(null); setApiError(null); setStrategy('upsert')
    if (inputRef.current) inputRef.current.value = ""
  }
  const handleClose = () => { reset(); onClose() }

  const processFile = useCallback((file: File) => {
    setFileName(file.name)
    setStep("reading")  // show loader immediately
    setApiError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
        if (!raw.length) { setApiError("The file appears to be empty."); return }
        const headers = Object.keys(raw[0])
        const autoMapping: Mapping = {}
        for (const h of headers) autoMapping[h] = autoMapColumn(h) ?? "__skip__"
        setExcelHeaders(headers); setRawData(raw); setMapping(autoMapping)
        setApiError(null); setStep("mapping")
      } catch {
        setApiError("Failed to parse file. Make sure it's a valid .xlsx or .csv file.")
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) processFile(file)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]; if (file) processFile(file)
  }

  // ── TS FIX: build a properly-typed ImportRow using explicit field assignment ──
  const applyMapping = () => {
    const mapped: ImportRow[] = rawData.map((rawRow) => {
      // Start with a partial object, fill only mapped fields
      const partial: Partial<ImportRow> = {}

      for (const [excelKey, dbField] of Object.entries(mapping)) {
        if (dbField === "__skip__") continue
        const parsed = parseValue(dbField as DbField, rawRow[excelKey])
        if (parsed === undefined) continue

        // Assign each field with the correct type — avoids TS2352
        switch (dbField as DbField) {
          case "provider_name": partial.provider_name = parsed as string; break
          case "doctor_name": partial.doctor_name = parsed as string; break
          case "specialty": partial.specialty = parsed as string; break
          case "address": partial.address = parsed as string; break
          case "address_line_2": partial.address_line_2 = parsed as string; break
          case "city": partial.city = parsed as string; break
          case "state": partial.state = parsed as string; break
          case "zip_code": partial.zip_code = parsed as string; break
          case "intake_phone": partial.intake_phone = parsed as string; break
          case "intake_email": partial.intake_email = parsed as string; break
          case "records_email": partial.records_email = parsed as string; break
          case "billing_email": partial.billing_email = parsed as string; break
          case "negotiations_email": partial.negotiations_email = parsed as string; break
          case "website_url": partial.website_url = parsed as string; break
          case "logo_url": partial.logo_url = parsed as string; break
          case "hours_of_operation": partial.hours_of_operation = parsed as string; break
          case "modality": partial.modality = parsed as string[]; break
          case "machine_description": partial.machine_description = parsed as string[]; break
          case "languages": partial.languages = parsed as string[]; break
          case "latitude": partial.latitude = parsed as number; break
          case "longitude": partial.longitude = parsed as number; break
          case "workers_comp": partial.workers_comp = parsed as boolean; break
          case "pi": partial.pi = parsed as boolean; break
          case "telemed": partial.telemed = parsed as boolean; break
          case "in_person": partial.in_person = parsed as boolean; break
        }
      }

      // Default: must have at least in_person = true if neither mode set
      if (!partial.in_person && !partial.telemed) partial.in_person = true
      if (partial.in_person === undefined) partial.in_person = true

      // Cast is safe: API route validates required fields server-side
      return partial as ImportRow
    })

    setRows(mapped)
    setStep("preview")
  }

  const handleImport = async () => {
    setStep("importing"); setApiError(null)
    try {
      const res = await fetch("/api/admin/providers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, strategy }),
      })
      const json = await res.json()
      if (!res.ok && !json.inserted) {
        setApiError(json.error ?? "Import failed"); setStep("preview"); return
      }
      setResult(json); setStep("done")
      if ((json.inserted ?? 0) + (json.updated ?? 0) > 0) onSuccess()
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Unknown error")
      setStep("preview")
    }
  }

  const mappedFields = Object.values(mapping).filter((v) => v !== "__skip__")
  const missingRequired = [...REQUIRED_FIELDS].filter((f) => !mappedFields.includes(f))
  const duplicates = mappedFields.filter((v, i) => mappedFields.indexOf(v) !== i)
  const previewCols = [...new Set(mappedFields)] as DbField[]

  return (
    <>
      <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    `}</style>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        {/*
        max-w-2xl on mobile → max-w-3xl sm → max-w-4xl lg
        max-h-[95vh] on mobile, 90vh on sm+
      */}
        <DialogContent className="
        w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl
        max-h-[95vh] sm:max-h-[90vh]
        flex flex-col gap-0 p-0 overflow-hidden
      ">

          {/* Header */}
          <DialogHeader className="px-4 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg leading-tight">
                    Import Providers from Excel
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm mt-0.5 truncate">
                    {step === "idle" && "Upload an .xlsx or .csv — any column names work"}
                    {step === "mapping" && "Match your columns to provider fields"}
                    {step === "preview" && `Preview ${rows.length} rows before importing`}
                    {step === "importing" && "Importing providers…"}
                    {step === "done" && "Import complete"}
                  </DialogDescription>
                </div>
              </div>
              {/* <Button
              variant="ghost" size="icon"
              className="h-8 w-8 shrink-0 mt-0.5"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button> */}
            </div>

            {/* Step wizard — only show after file is uploaded */}
            {step !== "idle" && <StepIndicator current={step} />}
          </DialogHeader>

          {/* ── Body  */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-4">

            {/* reading */}
            {step === "reading" && (
              <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted/20" />
                    <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="48 122" className="text-primary" style={{ animation: "spin 0.9s linear infinite", transformOrigin: "center" }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">Reading file…</p>
                  <p className="text-sm text-muted-foreground">
                    {fileName
                      ? <span className="font-medium text-foreground">{fileName}</span>
                      : <span>Parsing your spreadsheet</span>
                    }
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50"
                      style={{ animation: "bounce 0.7s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* idle */}
            {step === "idle" && (
              <div className="space-y-4">
                {/* Drop zone */}
                <div
                  className={`
                  relative border-2 border-dashed rounded-2xl
                  py-12 sm:py-16 text-center cursor-pointer
                  transition-all duration-200
                  ${dragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }
                `}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef} type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <div className="flex flex-col items-center gap-4">
                    <div className={`p-4 rounded-2xl transition-colors ${dragging ? "bg-primary/20" : "bg-muted"}`}>
                      <Upload className={`w-9 h-9 transition-colors ${dragging ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm sm:text-base">
                        {dragging ? "Drop your file here" : "Drag & drop your Excel or CSV file"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        .xlsx · .xls · .csv &nbsp;—&nbsp; any column names, you'll map them in the next step
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 mt-1 pointer-events-none">
                      <Upload className="w-3.5 h-3.5" /> Browse files
                    </Button>
                  </div>
                </div>

                {/* Info + template */}
                <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border flex-col sm:flex-row">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-xs text-muted-foreground">
                      Column names don't need to match exactly — after upload you'll see a mapping step where you can connect each column to the right field.
                    </p>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="gap-1.5 shrink-0 h-8 text-xs w-full sm:w-auto"
                    onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Template
                  </Button>
                </div>

                {apiError && <ErrorBanner message={apiError} />}
              </div>
            )}

            {/* mapping */}
            {step === "mapping" && (
              <div className="space-y-4">
                {/* File info bar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1.5 text-xs px-2.5 py-1 font-normal">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span className="max-w-[160px] sm:max-w-none truncate">{fileName}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2.5 py-1 font-normal">
                      {rawData.length} rows · {excelHeaders.length} columns
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={reset}>
                    <X className="w-3 h-3" /> Change file
                  </Button>
                </div>

                {/* Mapping table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Header row */}
                  <div className="px-4 py-2.5 bg-muted/50 border-b border-border grid grid-cols-[1fr_20px_1fr] sm:grid-cols-[1fr_28px_1fr] gap-2 sm:gap-3 items-center">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your column</p>
                    <div />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Maps to</p>
                  </div>

                  <div className="divide-y divide-border max-h-[280px] sm:max-h-[340px] overflow-y-auto">
                    {excelHeaders.map((header) => {
                      const mapped = mapping[header]
                      const isDup = mapped !== "__skip__" && mappedFields.filter(v => v === mapped).length > 1
                      const isMappedField = mapped !== "__skip__"

                      return (
                        <div
                          key={header}
                          className={`
                          grid grid-cols-[1fr_20px_1fr] sm:grid-cols-[1fr_28px_1fr]
                          items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5
                          transition-colors
                          ${isDup
                              ? "bg-amber-50 dark:bg-amber-950/10"
                              : isMappedField
                                ? "bg-primary/[0.02] hover:bg-primary/[0.04]"
                                : "hover:bg-muted/30"
                            }
                        `}
                        >
                          {/* Left: excel column name + sample */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isMappedField && !isDup && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                              )}
                              <p className="text-sm font-medium truncate">{header}</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5 pl-3">
                              {String(rawData[0]?.[header] ?? "—").slice(0, 40)}
                            </p>
                          </div>

                          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/40 shrink-0" />

                          {/* Right: dropdown */}
                          <Select
                            value={mapped}
                            onValueChange={(val) =>
                              setMapping((prev) => ({ ...prev, [header]: val as DbField | "__skip__" }))
                            }
                          >
                            <SelectTrigger
                              className={`
                              h-8 text-xs
                              ${mapped === "__skip__"
                                  ? "text-muted-foreground border-dashed"
                                  : isDup
                                    ? "border-amber-400 dark:border-amber-600"
                                    : "border-primary/30 bg-primary/[0.03]"
                                }
                            `}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="__skip__">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <SkipForward className="w-3 h-3" /> Skip this column
                                </span>
                              </SelectItem>
                              {DB_FIELDS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                  <span className="flex items-center gap-1.5">
                                    {f.label}
                                    {f.required && (
                                      <span className="text-destructive text-[10px] font-bold">*</span>
                                    )}
                                    {f.hint && (
                                      <span className="text-muted-foreground text-[10px]">({f.hint})</span>
                                    )}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Warnings */}
                {missingRequired.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Required fields not mapped:{" "}
                      <strong>{missingRequired.map(f =>
                        DB_FIELDS.find(d => d.value === f)?.label ?? f
                      ).join(", ")}</strong>
                    </span>
                  </div>
                )}
                {duplicates.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Duplicate mapping:{" "}
                      <strong>{[...new Set(duplicates)].map(f =>
                        DB_FIELDS.find(d => d.value === f)?.label ?? f
                      ).join(", ")}</strong>{" "}
                      — used more than once
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* preview */}
            {step === "preview" && rows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1.5 text-xs px-2.5 py-1 font-normal">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span className="max-w-[160px] truncate">{fileName}</span>
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs px-2.5 py-1 font-normal">
                      <Check className="w-3 h-3 mr-1" />
                      {rows.length} row{rows.length !== 1 ? "s" : ""} ready
                    </Badge>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => setStep("mapping")}
                    disabled={(step as string) === "importing"}
                  >
                    ← Edit mapping
                  </Button>
                </div>

                {/* Duplicate strategy selector */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-start gap-3">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-950/30 rounded-md shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">How to handle duplicates?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Matched by <span className="font-medium text-foreground">Provider Name + Address</span>
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {([
                      { value: 'upsert' as DuplicateStrategy, label: 'Update existing + add new', badge: 'Recommended', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400', desc: 'If a provider already exists — update all fields. New providers are added.' },
                      { value: 'skip' as DuplicateStrategy, label: 'Skip duplicates', badge: null, badgeColor: '', desc: 'Insert only new providers. Existing ones are left unchanged.' },
                      { value: 'insert' as DuplicateStrategy, label: 'Always insert (allow duplicates)', badge: null, badgeColor: '', desc: 'Insert all rows as new records. May create duplicates.' },
                    ] as const).map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${strategy === opt.value ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${strategy === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                            {strategy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <input type="radio" className="sr-only" value={opt.value} checked={strategy === opt.value} onChange={() => setStrategy(opt.value)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{opt.label}</span>
                            {opt.badge && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${opt.badgeColor}`}>{opt.badge}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] sm:max-h-[380px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="w-8 text-center text-xs text-muted-foreground">#</TableHead>
                          {previewCols.map((c) => (
                            <TableHead key={c} className="text-xs font-semibold whitespace-nowrap">
                              {DB_FIELDS.find((f) => f.value === c)?.label ?? c}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.slice(0, 20).map((row, i) => (
                          <TableRow key={i} className="hover:bg-muted/20">
                            <TableCell className="text-center text-xs text-muted-foreground">{i + 2}</TableCell>
                            {previewCols.map((col) => {
                              const val = row[col]
                              return (
                                <TableCell key={col} className="text-xs max-w-[160px] truncate">
                                  {Array.isArray(val)
                                    ? val.join(", ")
                                    : val === true
                                      ? <span className="text-emerald-600 font-medium">✓</span>
                                      : val === false
                                        ? <span className="text-muted-foreground">✗</span>
                                        : (val as string | undefined) ?? (
                                          <span className="text-muted-foreground/50">—</span>
                                        )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {rows.length > 20 && (
                    <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground text-center">
                      Showing first 20 of {rows.length} rows
                    </div>
                  )}
                </div>

                {apiError && <ErrorBanner message={apiError} />}
              </div>
            )}

            {/* ── importing: full loading screen ── */}
            {step === "importing" && (
              <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
                {/* Animated spinner ring */}
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="currentColor" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="60 154"
                      className="text-primary animate-spin"
                      style={{ animationDuration: "1s", transformOrigin: "center" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-semibold">Importing providers…</p>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    Geocoding addresses and saving to database.
                    <br />This may take a few seconds.
                  </p>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* done */}
            {step === "done" && result && (
              <div className="space-y-5">
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 gap-4 text-center">
                  <div className="relative">
                    <div className="p-5 bg-emerald-100 dark:bg-emerald-950/30 rounded-full">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Import complete</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.errors.length > 0
                        ? `${result.errors.length} row${result.errors.length !== 1 ? "s" : ""} skipped due to errors`
                        : "All rows processed successfully"}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className={`grid gap-3 ${(result.updated ?? 0) > 0 || (result.skipped ?? 0) > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.inserted}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5 font-medium">Added</p>
                  </div>
                  {(result.updated ?? 0) > 0 && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.updated}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5 font-medium">Updated</p>
                    </div>
                  )}
                  {(result.skipped ?? 0) > 0 && (
                    <div className="rounded-xl border border-muted bg-muted/30 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">Skipped</p>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{result.errors.length}</p>
                      <p className="text-xs text-destructive/70 mt-0.5 font-medium">Errors</p>
                    </div>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Skipped rows ({result.errors.length})
                      </p>
                    </div>
                    <div className="divide-y divide-border max-h-40 overflow-y-auto">
                      {result.errors.map((err) => (
                        <div key={err.row} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0 font-mono">Row {err.row}</Badge>
                          <span className="text-muted-foreground">{err.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-4 sm:px-7 py-4 border-t border-border shrink-0 bg-muted/10 flex-row justify-end gap-2">
            {(step === "idle" || step === "reading") && (
              <Button variant="outline" onClick={handleClose} disabled={step === "reading"}>Cancel</Button>
            )}

            {step === "mapping" && (
              <>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={applyMapping}
                  disabled={missingRequired.length > 0 || duplicates.length > 0}
                  className="gap-2"
                >
                  Preview data <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {step === "preview" && (
              <>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleImport} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import {rows.length} Provider{rows.length !== 1 ? "s" : ""}
                </Button>
              </>
            )}

            {step === "importing" && (
              <Button disabled className="gap-2 min-w-[180px]">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving to database…
              </Button>
            )}

            {step === "done" && (
              <>
                <Button variant="outline" onClick={reset}>Import Another File</Button>
                <Button onClick={handleClose}>Done</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Small reusable error banner
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

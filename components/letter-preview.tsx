'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Check, Edit2, ChevronLeft, X, CalendarIcon, Loader2, AlertCircle } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LetterData {
  output?: string
  patient_name?: string
  phone?: string
  dob?: string
  doi?: string
  legal_firm?: string
  attorney_name?: string
  attorney_phone?: string
  attorney_email?: string
  service_type?: string
  provider_id?: number | null      // ← ДОБАВИЛИ
  provider_name?: string
  provider_specialty?: string
  provider_address?: string
  doctor_name?: string             // ← ДОБАВИЛИ (для n8n email, не пишется в БД)
  format?: string
  availability?: string
  additional_notes?: string
}

export interface SessionDocument {
  document_type: string
  file_url: string
  file_name: string
}

export interface LetterPreviewProps {
  data: LetterData
  sessionId: string
  sessionDocuments?: SessionDocument[]
  attachmentFile?: File | null
  onConfirm: (updatedData: LetterData) => void
  onCancel: () => void
  isLoading?: boolean
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseAnyDate(str: string): Date | undefined {
  if (!str?.trim()) return undefined
  const fmts = [
    'MM/dd/yyyy', 'M/d/yyyy', 'MM-dd-yyyy', 'M-d-yyyy',
    'yyyy-MM-dd', 'dd.MM.yyyy', 'd.M.yyyy',
    'MMMM d, yyyy', 'MMMM dd, yyyy',
    'MMM d, yyyy', 'MMM dd, yyyy',
    'MMMM d yyyy', 'MMM d yyyy',
  ]
  for (const fmt of fmts) {
    try {
      const d = parse(str.trim(), fmt, new Date())
      if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) return d
    } catch { }
  }
  const native = new Date(str)
  if (isValid(native) && native.getFullYear() > 1900) return native
  return undefined
}

function formatDate(d: Date | undefined): string {
  if (!d || !isValid(d)) return ''
  return format(d, 'MM/dd/yyyy')
}

// ─── Validation ───────────────────────────────────────────────────────────────

function getValidationErrors(data: LetterData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (data.phone && !/^[\d\s\-\+\(\)]{7,}$/.test(data.phone)) {
    errors.phone = 'Invalid phone format'
  }
  if (data.attorney_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.attorney_email)) {
    errors.attorney_email = 'Invalid email format'
  }
  return errors
}

// ─── Save to Supabase ─────────────────────────────────────────────────────────

async function saveAppointment(
  data: LetterData,
  sessionId: string,
  documents: SessionDocument[],
  attachmentFile?: File | null,
): Promise<void> {
  const payload = {
    session_id: sessionId,
    patient_name: data.patient_name ?? '',
    phone: data.phone,
    date_of_birth: data.dob,
    date_of_injury: data.doi,
    legal_firm: data.legal_firm,
    attorney_name: data.attorney_name,
    attorney_phone: data.attorney_phone,
    attorney_email: data.attorney_email,
    provider_id: data.provider_id ?? undefined,
    provider_name: data.provider_name,
    provider_specialty: data.provider_specialty,
    provider_address: data.provider_address,
    visit_format: data.format,
    service_type: data.service_type,
    availability: data.availability,
    additional_notes: data.additional_notes,
    documents,
  }

  console.log('[LetterPreview] saveAppointment payload:', JSON.stringify({
    provider_id: payload.provider_id,
    provider_name: payload.provider_name,
    patient_name: payload.patient_name,
  }))

  let res: Response

  if (attachmentFile) {
    const fd = new FormData()
    fd.append('payload', JSON.stringify(payload))
    fd.append('file', attachmentFile, attachmentFile.name)
    res = await fetch('/api/appointment', { method: 'POST', body: fd })
  } else {
    res = await fetch('/api/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `HTTP ${res.status}`)
  }
}

// ─── DatePickerField ──────────────────────────────────────────────────────────

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const parsed = parseAnyDate(value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="mt-1 w-full flex items-center gap-2 px-2 py-1 border border-gray-300 rounded text-base font-medium text-gray-900 hover:border-gray-400 transition-colors bg-white text-left"
      >
        <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Select date…'}
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={day => { if (day) { onChange(formatDate(day)); setOpen(false) } }}
            defaultMonth={parsed}
            captionLayout="dropdown"
            fromYear={1920}
            toYear={new Date().getFullYear()}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LetterPreview({
  data,
  sessionId,
  sessionDocuments = [],
  attachmentFile,
  onConfirm,
  onCancel,
  isLoading: externalLoading,
}: LetterPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<LetterData>(() => ({
    ...data,
    dob: data.dob ? (formatDate(parseAnyDate(data.dob)) || data.dob) : '',
    doi: data.doi ? (formatDate(parseAnyDate(data.doi)) || data.doi) : '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOnce, setSavedOnce] = useState(false)

  const isLoading = externalLoading || isSaving

  console.log('DATA', data, editData)

  const handleInputChange = useCallback((field: keyof LetterData, value: string) => {
    setEditData(prev => {
      const next = { ...prev, [field]: value }
      setErrors(getValidationErrors(next))
      return next
    })
  }, [])

  const handleSaveEdit = () => {
    const errs = getValidationErrors(editData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setIsEditing(false)
  }

  const handleSendEmail = async () => {
    if (isSaving || savedOnce) return
    setSaveError(null)
    setIsSaving(true)

    try {
      await new Promise<void>((resolve, reject) => {
        Promise.resolve(onConfirm(editData)).then(resolve).catch(reject)
      })

      setSavedOnce(true)

      saveAppointment(editData, sessionId, sessionDocuments, attachmentFile).catch(err => {
        console.error('[LetterPreview] Supabase save failed (email was sent OK):', err)
      })

    } catch (err: any) {
      console.error('[LetterPreview] handleSendEmail failed:', err)
      setSaveError('Could not send email. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderInput = (field: keyof LetterData, type = 'text') => (
    <div className="w-full">
      <input
        type={type}
        value={(editData[field] as string) || ''}
        onChange={e => handleInputChange(field, e.target.value)}
        className={`text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border rounded transition-colors ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  )

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      <div className="bg-gray-50 border-b border-gray-200 p-6 relative">
        <button onClick={onCancel} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Close preview">
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 pr-10">Appointment Request Preview</h3>
        <p className="text-sm text-gray-500 mt-1">Review the information below before sending</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {saveError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        {(editData.patient_name || editData.phone || editData.dob || editData.doi ||
          data.patient_name || data.phone || data.dob || data.doi) && (
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Patient Information</h4>
              <div className="space-y-3">
                {(editData.patient_name || data.patient_name) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Full Name</label>
                    {isEditing ? renderInput('patient_name') : <p className="text-base font-medium text-gray-900 mt-1">{editData.patient_name}</p>}
                  </div>
                )}
                {(editData.phone || data.phone) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Phone</label>
                    {isEditing ? renderInput('phone', 'tel') : <p className="text-base font-medium text-gray-900 mt-1">{editData.phone}</p>}
                  </div>
                )}
                {(editData.dob || data.dob) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Date of Birth</label>
                    {isEditing ? <DatePickerField value={editData.dob || ''} onChange={v => handleInputChange('dob', v)} /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.dob}</p>}
                  </div>
                )}
                {(editData.doi || data.doi) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Date of Injury</label>
                    {isEditing ? <DatePickerField value={editData.doi || ''} onChange={v => handleInputChange('doi', v)} /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.doi}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

        {(editData.attorney_name || editData.attorney_email || editData.legal_firm ||
          data.attorney_name || data.attorney_email || data.legal_firm) && (
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Attorney Information</h4>
              <div className="space-y-3">
                {(editData.legal_firm || data.legal_firm) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Law Firm</label>
                    {isEditing ? <input type="text" value={editData.legal_firm || ''} onChange={e => handleInputChange('legal_firm', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.legal_firm || '-'}</p>}
                  </div>
                )}
                {(editData.attorney_name || data.attorney_name) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Attorney / Case Manager</label>
                    {isEditing ? <input type="text" value={editData.attorney_name || ''} onChange={e => handleInputChange('attorney_name', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.attorney_name || '-'}</p>}
                  </div>
                )}
                {(editData.attorney_phone || data.attorney_phone) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Attorney Phone</label>
                    {isEditing ? <input type="text" value={editData.attorney_phone || ''} onChange={e => handleInputChange('attorney_phone', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.attorney_phone}</p>}
                  </div>
                )}
                {(editData.attorney_email || data.attorney_email) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Attorney Email</label>
                    {isEditing ? renderInput('attorney_email', 'email') : <p className="text-base font-medium text-gray-900 mt-1">{editData.attorney_email}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

        {(editData.service_type || data.service_type) && (
          <div className="space-y-4 pb-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Service Information</h4>
            <div>
              <label className="text-xs font-medium text-gray-600">Service Type</label>
              {isEditing ? <input type="text" value={editData.service_type || ''} onChange={e => handleInputChange('service_type', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.service_type}</p>}
            </div>
          </div>
        )}

        {(isEditing || editData.provider_name || data.provider_name) && (
          <div className="space-y-4 pb-6 border-b border-gray-200 bg-gray-100 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Provider Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Provider Name</label>
                {isEditing ? <input type="text" value={editData.provider_name || ''} onChange={e => handleInputChange('provider_name', e.target.value)} className="text-base font-semibold text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-semibold text-gray-900 mt-1">{editData.provider_name}</p>}
              </div>
              {(isEditing || editData.provider_specialty || data.provider_specialty) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Specialty</label>
                  {isEditing ? <input type="text" value={editData.provider_specialty || ''} onChange={e => handleInputChange('provider_specialty', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.provider_specialty}</p>}
                </div>
              )}
              {(isEditing || editData.provider_address || data.provider_address) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Address</label>
                  {isEditing ? <input type="text" value={editData.provider_address || ''} onChange={e => handleInputChange('provider_address', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.provider_address}</p>}
                </div>
              )}
              {(isEditing || editData.format || data.format) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Visit Format</label>
                  {isEditing ? <input type="text" value={editData.format || ''} onChange={e => handleInputChange('format', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.format}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {(editData.availability || editData.additional_notes || data.availability || data.additional_notes) && (
          <div className="space-y-4">
            {(editData.availability || data.availability) && (
              <div>
                <label className="text-xs font-medium text-gray-600">Availability</label>
                {isEditing ? <input type="text" value={editData.availability || ''} onChange={e => handleInputChange('availability', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.availability}</p>}
              </div>
            )}
            {(editData.additional_notes || data.additional_notes) && (
              <div>
                <label className="text-xs font-medium text-gray-600">Additional Notes</label>
                {isEditing ? <textarea value={editData.additional_notes || ''} onChange={e => handleInputChange('additional_notes', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" rows={3} /> : <p className="text-base font-medium text-gray-900 mt-1">{editData.additional_notes}</p>}
              </div>
            )}
          </div>
        )}

        {sessionDocuments.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Uploaded Documents</h4>
            <ul className="space-y-1">
              {sessionDocuments.map((doc, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                  <span className="text-gray-400 truncate">— {doc.file_name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 border-t border-gray-200 bg-white">
        {isEditing ? (
          <>
            <Button onClick={handleSaveEdit} disabled={isLoading || Object.keys(errors).length > 0} className="flex-1 gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-6">
              <Check className="w-4 h-4" /> Save Changes
            </Button>
            <Button onClick={() => { setEditData({ ...data, dob: data.dob ? (formatDate(parseAnyDate(data.dob)) || data.dob) : '', doi: data.doi ? (formatDate(parseAnyDate(data.doi)) || data.doi) : '' }); setIsEditing(false) }} variant="outline" disabled={isLoading} className="flex-1 gap-2 py-6">
              <ChevronLeft className="w-4 h-4" /> Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleSendEmail} disabled={isLoading || savedOnce} className="flex-1 gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-6 disabled:opacity-60">
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : savedOnce ? <><Check className="w-4 h-4" /> Sent!</> : <><Check className="w-4 h-4" /> Send Email</>}
            </Button>
            <Button onClick={() => setIsEditing(true)} variant="outline" disabled={isLoading} className="flex-1 gap-2 py-6">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

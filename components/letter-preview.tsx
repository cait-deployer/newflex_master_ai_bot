'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Check, Edit2, ChevronLeft, X, CalendarIcon } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'

interface LetterData {
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
  provider_name?: string
  provider_specialty?: string
  provider_address?: string
  format?: string
  availability?: string
  additional_notes?: string
}

interface LetterPreviewProps {
  data: LetterData
  onConfirm: (updatedData: LetterData) => void
  onCancel: () => void
  isLoading?: boolean
}

function parseAnyDate(str: string): Date | undefined {
  if (!str?.trim()) return undefined
  const formats = [
    'MM/dd/yyyy', 'M/d/yyyy', 'MM-dd-yyyy', 'M-d-yyyy',
    'yyyy-MM-dd', 'dd.MM.yyyy', 'd.M.yyyy',
    'MMMM d, yyyy', 'MMMM dd, yyyy',
    'MMM d, yyyy', 'MMM dd, yyyy',
    'MMMM d yyyy', 'MMM d yyyy',
  ]
  for (const fmt of formats) {
    try {
      const d = parse(str.trim(), fmt, new Date())
      if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) return d
    } catch { }
  }
  // Fallback: native Date parse
  const native = new Date(str)
  if (isValid(native) && native.getFullYear() > 1900) return native
  return undefined
}

function formatDate(d: Date | undefined): string {
  if (!d || !isValid(d)) return ''
  return format(d, 'MM/dd/yyyy')
}

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

// DatePickerField
function DatePickerField({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
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

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(formatDate(day))
      setOpen(false)
    }
  }

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
            onSelect={handleSelect}
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

export function LetterPreview({ data, onConfirm, onCancel, isLoading }: LetterPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<LetterData>(() => ({
    ...data,
    dob: data.dob ? (formatDate(parseAnyDate(data.dob)) || data.dob) : '',
    doi: data.doi ? (formatDate(parseAnyDate(data.doi)) || data.doi) : '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof LetterData, value: string) => {
    setEditData(prev => {
      const next = { ...prev, [field]: value }
      setErrors(getValidationErrors(next))
      return next
    })
  }

  const handleSave = () => {
    const errs = getValidationErrors(editData)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onConfirm(editData)
    setIsEditing(false)
  }

  const renderInput = (field: keyof LetterData, type = 'text') => (
    <div className="w-full">
      <input
        type={type}
        value={editData[field] || ''}
        onChange={e => handleInputChange(field, e.target.value)}
        className={`text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border rounded transition-colors ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  )

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Close preview"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 pr-10">
          {isEditing ? 'Edit Appointment Request' : 'Email Preview'}
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          {isEditing ? 'Make changes to the information below' : 'Please review the information before sending'}
        </p>
      </div>

      {/* Body */}
      <div className="bg-gray-50 grow border border-gray-200 p-8 space-y-6 overflow-y-auto">

        {/* Patient */}
        {(editData.patient_name || data.patient_name) && (
          <div className="space-y-4 pb-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Patient Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Name</label>
                {isEditing ? renderInput('patient_name') : (
                  <p className="text-base font-medium text-gray-900 mt-1">{editData.patient_name}</p>
                )}
              </div>
              {(editData.phone || data.phone) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  {isEditing ? renderInput('phone', 'tel') : (
                    <p className="text-base font-medium text-gray-900 mt-1">{editData.phone}</p>
                  )}
                </div>
              )}
              {(editData.dob || data.dob) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Date of Birth</label>
                  {isEditing
                    ? <DatePickerField value={editData.dob || ''} onChange={v => handleInputChange('dob', v)} />
                    : <p className="text-base font-medium text-gray-900 mt-1">{editData.dob}</p>
                  }
                </div>
              )}
              {(editData.doi || data.doi) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Date of Injury</label>
                  {isEditing
                    ? <DatePickerField value={editData.doi || ''} onChange={v => handleInputChange('doi', v)} />
                    : <p className="text-base font-medium text-gray-900 mt-1">{editData.doi}</p>
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attorney */}
        {(editData.attorney_name || editData.attorney_email || editData.legal_firm ||
          data.attorney_name || data.attorney_email || data.legal_firm) && (
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Attorney Information</h4>
              <div className="space-y-3">
                {(editData.legal_firm || data.legal_firm) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Law Firm</label>
                    {isEditing
                      ? <input type="text" value={editData.legal_firm || ''} onChange={e => handleInputChange('legal_firm', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                      : <p className="text-base font-medium text-gray-900 mt-1">{editData.legal_firm || '-'}</p>
                    }
                  </div>
                )}
                {(editData.attorney_name || data.attorney_name) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Attorney/Case Manager</label>
                    {isEditing
                      ? <input type="text" value={editData.attorney_name || ''} onChange={e => handleInputChange('attorney_name', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                      : <p className="text-base font-medium text-gray-900 mt-1">{editData.attorney_name || '-'}</p>
                    }
                  </div>
                )}
                {(editData.attorney_phone || data.attorney_phone) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Phone</label>
                    {isEditing
                      ? <input type="text" value={editData.attorney_phone || ''} onChange={e => handleInputChange('attorney_phone', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                      : <p className="text-base font-medium text-gray-900 mt-1">{editData.attorney_phone}</p>
                    }
                  </div>
                )}
                {(editData.attorney_email || data.attorney_email) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    {isEditing ? renderInput('attorney_email', 'email') : (
                      <p className="text-base font-medium text-gray-900 mt-1">{editData.attorney_email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Service */}
        {(editData.service_type || data.service_type) && (
          <div className="space-y-4 pb-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Service Information</h4>
            <div>
              <label className="text-xs font-medium text-gray-600">Service Type</label>
              {isEditing
                ? <input type="text" value={editData.service_type || ''} onChange={e => handleInputChange('service_type', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                : <p className="text-base font-medium text-gray-900 mt-1">{editData.service_type}</p>
              }
            </div>
          </div>
        )}

        {/* Provider */}
        {(isEditing || editData.provider_name || data.provider_name) && (
          <div className="space-y-4 pb-6 border-b border-gray-200 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Provider Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Provider Name</label>
                {isEditing
                  ? <input type="text" value={editData.provider_name || ''} onChange={e => handleInputChange('provider_name', e.target.value)} className="text-base font-semibold text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                  : <p className="text-base font-semibold text-gray-900 mt-1">{editData.provider_name}</p>
                }
              </div>
              {(isEditing || editData.provider_specialty || data.provider_specialty) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Specialty</label>
                  {isEditing
                    ? <input type="text" value={editData.provider_specialty || ''} onChange={e => handleInputChange('provider_specialty', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                    : <p className="text-base font-medium text-gray-900 mt-1">{editData.provider_specialty}</p>
                  }
                </div>
              )}
              {(isEditing || editData.provider_address || data.provider_address) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Address</label>
                  {isEditing
                    ? <input type="text" value={editData.provider_address || ''} onChange={e => handleInputChange('provider_address', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                    : <p className="text-base font-medium text-gray-900 mt-1">{editData.provider_address}</p>
                  }
                </div>
              )}
              {(isEditing || editData.format || data.format) && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Format</label>
                  {isEditing
                    ? <input type="text" value={editData.format || ''} onChange={e => handleInputChange('format', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                    : <p className="text-base font-medium text-gray-900 mt-1">{editData.format}</p>
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Availability & Notes */}
        {(editData.availability || editData.additional_notes || data.availability || data.additional_notes) && (
          <div className="space-y-4">
            {(editData.availability || data.availability) && (
              <div>
                <label className="text-xs font-medium text-gray-600">Availability</label>
                {isEditing
                  ? <input type="text" value={editData.availability || ''} onChange={e => handleInputChange('availability', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" />
                  : <p className="text-base font-medium text-gray-900 mt-1">{editData.availability}</p>
                }
              </div>
            )}
            {(editData.additional_notes || data.additional_notes) && (
              <div>
                <label className="text-xs font-medium text-gray-600">Additional Notes</label>
                {isEditing
                  ? <textarea value={editData.additional_notes || ''} onChange={e => handleInputChange('additional_notes', e.target.value)} className="text-base font-medium text-gray-900 mt-1 w-full px-2 py-1 border border-gray-300 rounded" rows={3} />
                  : <p className="text-base font-medium text-gray-900 mt-1">{editData.additional_notes}</p>
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 p-4">
        {isEditing ? (
          <>
            <Button onClick={handleSave} disabled={isLoading || Object.keys(errors).length > 0} className="flex-1 gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-6">
              <Check className="w-4 h-4" /> Save Changes
            </Button>
            <Button onClick={() => { setEditData({ ...data, dob: data.dob ? (formatDate(parseAnyDate(data.dob)) || data.dob) : '', doi: data.doi ? (formatDate(parseAnyDate(data.doi)) || data.doi) : '' }); setIsEditing(false) }} variant="outline" disabled={isLoading} className="flex-1 gap-2 py-6">
              <ChevronLeft className="w-4 h-4" /> Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => onConfirm(editData)} disabled={isLoading} className="flex-1 gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-6">
              <Check className="w-4 h-4" /> Send Email
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

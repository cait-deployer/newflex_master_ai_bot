'use client'

import { MapPin, User, Monitor, Shield, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Provider {
  id?: number        // ← из БД, передаётся при выборе
  name: string
  address?: string
  specialty?: string
  format?: string
  distance?: string
  coverType?: string
  doctor?: string
}

interface ProviderCardProps {
  provider: Provider
  onSelect: (provider: Provider) => void
}

export function ProviderCard({ provider, onSelect }: ProviderCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-gray-900 text-base">{provider.name}</h3>

        {provider.address && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
            <span>
              {provider.distance && <span className="font-medium">{provider.distance}</span>}
              {provider.distance && provider.address && ' — '}
              {provider.address}
            </span>
          </div>
        )}

        {!!provider.doctor && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Stethoscope className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{provider.doctor}</span>
          </div>
        )}

        {provider.specialty && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{provider.specialty}</span>
          </div>
        )}

        {(provider.coverType || provider.format) && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {provider.coverType && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>{provider.coverType}</span>
              </div>
            )}
            {provider.format && (
              <div className="flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-violet-500" />
                <span>{provider.format}</span>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => onSelect(provider)}
          variant="outline"
          className="mt-1 w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
          size="sm"
        >
          Request Appointment
        </Button>
      </div>
    </div>
  )
}

function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseProviders(text: string): { providers: Provider[], introText: string, outroText: string } | null {
  const hasMedical = /(?:Clinic|Medical|Center|Hospital|Healthcare|Facility|Practice|Associates|Group|Imaging|Diagnostics|Solutions|MRI|Provider Name:)/i.test(text)
  if (!hasMedical) return null

  const hasStructure = /(?:Address|Specialty|Format|Distance|Cover|Doctor Name)/i.test(text)
  if (!hasStructure) return null

  if (/(?:date of birth|date of injury|law firm|attorney email)/i.test(text)) return null

  const cleanStr = (s: string) => s
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/\*+/g, '').trim()

  const PROVIDER_FIELD_RE = /^(?:Address|Doctor|Dr\.|Specialty|Format|Distance|Cover|Provider Name|Facility|Clinic|Doctor Name)/i
  const MEDICAL_RE = /(?:Clinic|Medical|Center|Hospital|Healthcare|Facility|Practice|Associates|Group|Imaging|Diagnostics|Solutions|MRI)/i

  function isProviderStart(line: string): boolean {
    const c = cleanStr(line)
    if (!c) return false
    if (/^Provider\s*Name\s*:/i.test(c)) return true
    if (/^\d+\.\s+\S/.test(c)) return true
    if (/^\*\*[^*]+\*\*/.test(c) && c.length < 80) return true
    if (MEDICAL_RE.test(c) && c.length < 80 && !c.includes(':')) return true
    return false
  }

  function isProviderField(line: string): boolean {
    const c = cleanStr(line)
    return PROVIDER_FIELD_RE.test(c) || /^[-•]/.test(line.trim())
  }

  const lines = text.split('\n')
  const introLines: string[] = []
  const outroLines: string[] = []
  const providerBlocks: string[][] = []
  let currentBlock: string[] = []
  let inProviders = false

  for (const line of lines) {
    const c = cleanStr(line)

    if (isProviderStart(line)) {
      if (currentBlock.length > 0) providerBlocks.push(currentBlock)
      const safeLine = line.replace(/\s{2,}(?:Choose|or simply|provide your|Tell me).*/i, '').trimEnd()
      currentBlock = [cleanStr(safeLine)]
      inProviders = true
      continue
    }

    if (inProviders && isProviderField(line)) {
      currentBlock.push(c)
      continue
    }

    if (inProviders && !c) continue

    if (!inProviders) {
      introLines.push(line)
      continue
    }

    if (currentBlock.length > 0) {
      providerBlocks.push(currentBlock)
      currentBlock = []
    }
    inProviders = false
    outroLines.push(line)
  }

  if (currentBlock.length > 0) providerBlocks.push(currentBlock)
  if (providerBlocks.length === 0) return null

  const providers: Provider[] = providerBlocks.map(block => {
    let name = 'Unknown Provider'
    let address = '', specialty = '', format = '', distance = '', coverType = '', doctor = ''

    const firstLine = block[0] || ''
    const numbered = firstLine.match(/^\d+\.\s*(.+)/)
    const stripped = firstLine.replace(/\*\*/g, '').trim()
    if (numbered) {
      name = numbered[1].replace(/\*\*/g, '').trim()
    } else if (stripped && !/^Provider\s*Name\s*:/i.test(stripped)) {
      name = stripped
    }

    for (const rawLine of block) {
      const segments = rawLine
        .split(/(?=(?:Provider Name|Doctor Name|Address|Specialty|Format|Distance|Cover [Tt]ype)\s*:)/i)
        .map(s => s.trim()).filter(Boolean)

      for (const seg of segments) {
        const s = seg.replace(/^[-•]\s*/, '').trim()
        const colonIdx = s.indexOf(':')
        if (colonIdx === -1) continue

        const label = s.slice(0, colonIdx).toLowerCase().trim()
        const value = s.slice(colonIdx + 1).trim()
        if (!value) continue

        if (/^provider\s*name|facility\s*name|clinic\s*name/.test(label)) name = value
        else if (/address|location/.test(label)) address = value
        else if (/doctor|physician|dr\./.test(label)) doctor = value
        else if (/specialty|speciality/.test(label)) specialty = value
        else if (/format|visit\s*type/.test(label)) format = value
        else if (/distance/.test(label)) distance = value
        else if (/cover|insurance/.test(label)) coverType = value
      }

      const noLabel = rawLine.replace(/^[-•]\s*/, '').trim()
      if (!noLabel.includes(':')) {
        if (/\d+.*(?:st|street|ave|avenue|rd|road|blvd|way|dr|drive|loop|fwy|hwy)/i.test(noLabel) && !address) {
          address = noLabel
        } else if (/\d+\.?\d*\s*mi(?:les)?/i.test(noLabel)) {
          const m = noLabel.match(/(\d+\.?\d*\s*mi(?:les)?)/i)
          if (m) distance = m[1]
          if (noLabel.includes('—')) address = noLabel.split('—')[1]?.trim() || address
        } else if (/telemed|in.?person|virtual|telehealth/i.test(noLabel)) {
          format = noLabel
        } else if (/\bPI\b|workers\s*comp|cash|lop/i.test(noLabel)) {
          coverType = noLabel
        }
      }
    }

    return { name, address, specialty, format, distance, coverType, doctor }
  })

  return {
    providers,
    introText: introLines.join('\n').trim(),
    outroText: outroLines.join('\n').trim(),
  }
}
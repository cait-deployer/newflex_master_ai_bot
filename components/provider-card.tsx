'use client'

import { MapPin, User, Stethoscope, Monitor, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Provider {
  name: string
  address?: string
  specialty?: string
  format?: string
  distance?: string
  coverType?: string
}

interface ProviderCardProps {
  provider: Provider
  onSelect: (providerName: string, address: string) => void
}

export function ProviderCard({ provider, onSelect }: ProviderCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Provider Name */}
        <h3 className="font-semibold text-gray-900 text-base">{provider.name}</h3>
        
        {/* Address with distance */}
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
        
        {/* Specialty */}
        {provider.specialty && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{provider.specialty}</span>
          </div>
        )}
        
        {/* Cover Type & Format in one row */}
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
        
        {/* Book Button - White with black text */}
        <Button 
          onClick={() => onSelect(provider.name, provider.address || '')}
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

// Helper to strip emojis and special Unicode characters
function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoticons, symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
    .replace(/\s+/g, ' ')                   // Normalize whitespace
    .trim()
}

/**
 * Parse n8n provider list text into structured provider objects.
 * Returns null if text doesn't contain a provider list.
 */
export function parseProviders(text: string): { providers: Provider[], introText: string, outroText: string } | null {

  // ── Быстрая проверка: есть ли вообще провайдеры ──────────────────────────
  const hasMedical = /(?:Clinic|Medical|Center|Hospital|Healthcare|Facility|Practice|Associates|Group|Imaging|Diagnostics|Solutions|MRI|Provider Name:)/i.test(text)
  if (!hasMedical) return null

  const hasStructure = /(?:Address|Specialty|Format|Distance|Cover|Doctor Name)/i.test(text)
  if (!hasStructure) return null

  // Intake summary — не провайдерный список
  if (/(?:date of birth|date of injury|law firm|attorney email)/i.test(text)) return null

  // ── Утилиты ──────────────────────────────────────────────────────────────
  const stripEmojis = (s: string) => s
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ').trim()

  const clean = (s: string) => stripEmojis(s).replace(/\*+/g, '').trim()

  // ── Поля которые однозначно принадлежат провайдеру ───────────────────────
  const PROVIDER_FIELD_RE = /^(?:Address|Doctor|Specialty|Format|Distance|Cover|Provider Name|Facility|Clinic|Doctor Name)/i

  // ── Признак начала нового провайдера ─────────────────────────────────────
  // Строка является началом провайдера если:
  // 1. "Provider Name: X"
  // 2. Нумерованный пункт + медицинское слово ("1. Dallas MRI Center")
  // 3. Короткая строка (<70 символов) с медицинским словом, без двоеточия-значения
  const MEDICAL_RE = /(?:Clinic|Medical|Center|Hospital|Healthcare|Facility|Practice|Associates|Group|Imaging|Diagnostics|Solutions|MRI)/i

  function isProviderStart(line: string): boolean {
    const c = clean(line)
    if (!c) return false
    if (/^Provider\s*Name\s*:/i.test(c)) return true
    // Нумерованный — только если есть медицинское слово
    if (/^\d+\.\s+\S/.test(c) && MEDICAL_RE.test(c)) return true
    // Короткая строка с медицинским словом и без ":" (не поле-значение)
    if (MEDICAL_RE.test(c) && c.length < 70 && !c.includes(':')) return true
    return false
  }

  // Поле провайдера — строка начинается с известного лейбла или это буллет
  function isProviderField(line: string): boolean {
    const c = clean(line)
    return PROVIDER_FIELD_RE.test(c) || /^[-•]/.test(line.trim())
  }

  // ── Разбиваем текст на строки ─────────────────────────────────────────────
  const lines = text.split('\n')

  const introLines: string[] = []
  const outroLines: string[] = []
  const providerBlocks: string[][] = []
  let currentBlock: string[] = []
  let inProviders = false

  for (const line of lines) {
    const c = clean(line)

    if (isProviderStart(line)) {
      // Сохраняем предыдущий блок
      if (currentBlock.length > 0) providerBlocks.push(currentBlock)
      // Имя провайдера — только до первого "Choose"/"or simply"/"provide your"
      // (на случай если n8n прилепил финальную фразу к последнему провайдеру)
      const safeLine = line.replace(/\s{2,}(?:Choose|or simply|provide your|Tell me).*/i, '').trimEnd()
      currentBlock = [clean(safeLine)]
      inProviders = true
      continue
    }

    if (inProviders && isProviderField(line)) {
      currentBlock.push(c)
      continue
    }

    if (inProviders && !c) {
      // Пустая строка — продолжаем собирать тот же блок
      continue
    }

    if (!inProviders) {
      introLines.push(line)
      continue
    }

    // Строка после провайдеров которая не является полем →
    // это либо outro, либо конец последнего блока
    // Сохраняем текущий блок и переходим в outro
    if (currentBlock.length > 0) {
      providerBlocks.push(currentBlock)
      currentBlock = []
    }
    inProviders = false
    outroLines.push(line)
  }

  if (currentBlock.length > 0) providerBlocks.push(currentBlock)
  if (providerBlocks.length === 0) return null

  // ── Парсим каждый блок в Provider объект ─────────────────────────────────
  const providers: Provider[] = providerBlocks.map(block => {
    let name = 'Unknown Provider'
    let address = '', specialty = '', format = '', distance = '', coverType = '', doctor = ''

    // Имя — первая строка блока
    const firstLine = block[0] || ''
    const numbered = firstLine.match(/^\d+\.\s*(.+)/)
    if (numbered) {
      name = numbered[1].trim()
    } else if (firstLine && !/^Provider\s*Name\s*:/i.test(firstLine)) {
      name = firstLine
    }

    // Парсим остальные строки
    for (const rawLine of block) {
      // Инлайн формат: несколько лейблов на одной строке
      const segments = rawLine
        .split(/(?=(?:Provider Name|Doctor Name|Address|Specialty|Format|Distance|Cover [Tt]ype)\s*:)/i)
        .map(s => s.trim()).filter(Boolean)

      for (const seg of segments) {
        // Убираем буллеты
        const s = seg.replace(/^[-•]\s*/, '').trim()
        const colonIdx = s.indexOf(':')
        if (colonIdx === -1) continue

        const label = s.slice(0, colonIdx).toLowerCase().trim()
        const value = s.slice(colonIdx + 1).trim()
        if (!value) continue

        if (/^provider\s*name|facility\s*name|clinic\s*name/.test(label)) name = value
        else if (/address|location/.test(label)) address = value
        else if (/doctor|physician/.test(label)) doctor = value
        else if (/specialty|speciality/.test(label)) specialty = value
        else if (/format|visit\s*type/.test(label)) format = value
        else if (/distance/.test(label)) distance = value
        else if (/cover|insurance/.test(label)) coverType = value
      }

      // Строки без лейбла — угадываем по содержимому
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

    if (doctor) specialty = doctor + (specialty ? ' | ' + specialty : '')

    return { name, address, specialty, format, distance, coverType }
  })

  return {
    providers,
    introText: introLines.join('\n').trim(),
    outroText: outroLines.join('\n').trim(),
  }
}
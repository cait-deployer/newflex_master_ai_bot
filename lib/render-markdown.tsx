import React from 'react'
import { ProviderCard, parseProviders } from '@/components/provider-card'

export type ProviderSelectHandler = (provider: {
  id?: number
  name: string
  address?: string
  specialty?: string
  format?: string
  distance?: string
  coverType?: string
  doctor?: string
}) => void

export function isProviderJson(text: string): boolean {
  if (!text || !text.includes('providers')) return false
  const data = unwrapN8nJson(text)
  if (!data) return false
  const root = Array.isArray(data) ? data[0] : data
  return Array.isArray(root?.providers) && root.providers.length > 0
}

export function extractProvidersData(text: string): {
  providers: any[]
  introText: string
  outroText: string
} | null {
  return extractProvidersFromJson(text)
}

function unwrapN8nJson(text: string): any | null {
  // Попытка 1: прямой парс
  try { return JSON.parse(text) } catch { }

  // Попытка 2: n8n вернул { output: "json\n{...}" }
  try {
    const outer = JSON.parse(text)
    const raw = Array.isArray(outer) ? outer[0] : outer
    const outputStr: string = raw?.output ?? ''
    // Убираем префикс "json\n" или "```json\n" и парсим
    const cleaned = outputStr.replace(/^```?json\s*/i, '').replace(/```\s*$/, '').trim()
    if (cleaned.startsWith('{')) return JSON.parse(cleaned)
  } catch { }

  // Попытка 3: найти {...} прямо в тексте
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  } catch { }

  return null
}

// Пытаемся вытащить providers[] прямо из JSON
function extractProvidersFromJson(text: string): {
  providers: any[]
  introText: string
  outroText: string
} | null {
  const data = unwrapN8nJson(text)
  if (!data) return null

  const root = Array.isArray(data) ? data[0] : data

  if (Array.isArray(root?.providers) && root.providers.length > 0) {
    return {
      providers: root.providers,
      introText: root.output || root.text || '',
      outroText: root.outro || '',
    }
  }
  return null
}

export function renderMarkdown(
  text: string,
  onSelectProvider?: ProviderSelectHandler
): React.ReactNode {
  if (!text) return null

  // Шаг 1: пробуем JSON providers[] (чистый путь)
  const fromJson = extractProvidersFromJson(text)
  if (fromJson && fromJson.providers.length > 0) {
    return (
      <div className="space-y-3">
        {fromJson.introText && (
          <p className="text-gray-700">{inlineParse(fromJson.introText)}</p>
        )}
        <div className="grid gap-3">
          {fromJson.providers.map((p, i) => (
            <ProviderCard
              key={i}
              provider={p}
              onSelect={(prov) => onSelectProvider?.(prov)}
            />
          ))}
        </div>
        {fromJson.outroText && (
          <p className="text-gray-700 mt-2">{inlineParse(fromJson.outroText)}</p>
        )}
      </div>
    )
  }

  const providerData = parseProviders(text)
  if (providerData && providerData.providers.length > 0) {
    return (
      <div className="space-y-3">
        {providerData.introText && (
          <p className="text-gray-700">{inlineParse(providerData.introText)}</p>
        )}
        <div className="grid gap-3">
          {providerData.providers.map((provider, i) => (
            <ProviderCard
              key={i}
              provider={provider}
              onSelect={(p) => onSelectProvider?.(p)}
            />
          ))}
        </div>
        {providerData.outroText && (
          <p className="text-gray-700 mt-2">{inlineParse(providerData.outroText)}</p>
        )}
      </div>
    )
  }

  // Шаг 3: обычный markdown текст
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listKey = 0

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc pl-5 my-1 space-y-0.5">
          {listItems}
        </ul>
      )
      listItems = []
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (/^[-*]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*]\s+/, '')
      listItems.push(<li key={`li-${i}`}>{inlineParse(content)}</li>)
      return
    }
    flushList()
    if (trimmed === '') {
      elements.push(<br key={`br-${i}`} />)
    } else {
      elements.push(
        <span key={`line-${i}`}>
          {inlineParse(trimmed)}
          {i < lines.length - 1 && <br />}
        </span>
      )
    }
  })

  flushList()
  return <>{elements}</>
}

function inlineParse(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

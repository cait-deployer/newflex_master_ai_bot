import React from 'react'
import { ProviderCard, parseProviders } from '@/components/provider-card'

/**
 * Converts a simple markdown string into React elements.
 * Handles: **bold**, - list items, \n line breaks, provider lists.
 * Does NOT modify the raw string -- only used for display.
 */
export function renderMarkdown(text: string, onSelectProvider?: (name: string, address: string) => void): React.ReactNode {
  if (!text) return null

  // Check if this is a provider list
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
              onSelect={onSelectProvider || (() => {})} 
            />
          ))}
        </div>
        {providerData.outroText && (
          <p className="text-gray-700 mt-2">{inlineParse(providerData.outroText)}</p>
        )}
      </div>
    )
  }

  // Split into lines
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

    // List item: starts with "- " or "* "
    if (/^[-*]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*]\s+/, '')
      listItems.push(<li key={`li-${i}`}>{inlineParse(content)}</li>)
      return
    }

    // Not a list item -- flush any pending list
    flushList()

    if (trimmed === '') {
      // Empty line = small gap
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

/** Parse inline markdown: **bold** */
function inlineParse(text: string): React.ReactNode {
  // Split by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

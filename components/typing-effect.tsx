'use client'

import { useState, useEffect, useRef } from 'react'
import { renderMarkdown, type ProviderSelectHandler, isProviderJson, extractProvidersData } from '@/lib/render-markdown'
import { ProviderCard } from '@/components/provider-card'

interface TypingEffectProps {
  text: string
  speed?: number
  onComplete?: () => void
  onSelectProvider?: ProviderSelectHandler
}

export function TypingEffect({ text, speed = 12, onComplete, onSelectProvider }: TypingEffectProps) {
  const providerData = isProviderJson(text) ? extractProvidersData(text) : null
  const isProviders = !!providerData

  const introText = providerData?.introText ?? ''
  const outroText = providerData?.outroText ?? ''
  const providers = providerData?.providers ?? []

  // Для провайдеров анимируем introText, для обычного текста — весь text
  const animTarget = isProviders ? introText : text

  const [displayedLength, setDisplayedLength] = useState(0)
  const [isIntroComplete, setIsIntroComplete] = useState(animTarget.length === 0)
  const [visibleCards, setVisibleCards] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const textRef = useRef(text)
  const containerRef = useRef<HTMLDivElement>(null)

  // Сброс при смене текста (загрузка из истории)
  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text
      setDisplayedLength(animTarget.length)
      setIsIntroComplete(true)
      setVisibleCards(providers.length)
      setIsComplete(true)
      onComplete?.()
    }
  }, [text])

  // Анимация текста
  useEffect(() => {
    if (isIntroComplete) return

    const totalChars = animTarget.length
    if (totalChars === 0) {
      setIsIntroComplete(true)
      return
    }

    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const charsToShow = Math.min(Math.floor(elapsed / speed), totalChars)
      setDisplayedLength(charsToShow)

      if (charsToShow % 40 === 0 && containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }

      if (charsToShow < totalChars) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsIntroComplete(true)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [animTarget, speed, isIntroComplete])

  // Карточки по одной после intro
  useEffect(() => {
    if (!isProviders || !isIntroComplete || visibleCards >= providers.length) return
    const t = setTimeout(() => setVisibleCards(v => v + 1), 500)
    if (containerRef.current) {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    return () => clearTimeout(t)
  }, [isProviders, isIntroComplete, visibleCards, providers.length])

  // onComplete
  useEffect(() => {
    if (isComplete) return
    const done = isProviders
      ? isIntroComplete && visibleCards >= providers.length
      : isIntroComplete
    if (done) {
      setIsComplete(true)
      onComplete?.()
    }
  }, [isIntroComplete, visibleCards, providers.length, isProviders, isComplete, onComplete])

  // Провайдеры
  if (isProviders) {
    return (
      <div ref={containerRef} className="space-y-3">
        {introText && (
          <p className="text-gray-700">
            {introText.slice(0, displayedLength)}
            {!isIntroComplete && (
              <span className="inline-block w-0.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </p>
        )}
        {isIntroComplete && (
          <div className="grid gap-3">
            {providers.slice(0, visibleCards).map((p: any, i: number) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ProviderCard provider={{ ...p, address: p.address ?? '' }}
                onSelect={(prov) => onSelectProvider?.(prov)} />
              </div>
            ))}
          </div>
        )}
        {isComplete && outroText && (
          <p className="text-gray-700 mt-2 animate-in fade-in duration-300">{outroText}</p>
        )}
      </div>
    )
  }

  // Обычный текст
  return (
    <div ref={containerRef}>
      {renderMarkdown(text.slice(0, displayedLength), onSelectProvider)}
      {!isIntroComplete && (
        <span className="inline-block w-0.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  )
}

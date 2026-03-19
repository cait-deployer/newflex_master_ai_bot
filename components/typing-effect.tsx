'use client'

import { useState, useEffect, useRef } from 'react'
import { renderMarkdown } from '@/lib/render-markdown'

interface TypingEffectProps {
  text: string
  speed?: number
  onComplete?: () => void
  onSelectProvider?: (name: string, address: string) => void
}

export function TypingEffect({ text, speed = 12, onComplete, onSelectProvider }: TypingEffectProps) {
  const [displayedLength, setDisplayedLength] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const textRef = useRef(text)
  const containerRef = useRef<HTMLParagraphElement>(null)

  // If text changes (e.g. loaded from session), show it instantly
  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text
      setDisplayedLength(text.length)
      setIsComplete(true)
    }
  }, [text])

  useEffect(() => {
    if (isComplete) return

    const totalChars = text.length
    if (totalChars === 0) {
      setIsComplete(true)
      return
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const charsToShow = Math.min(Math.floor(elapsed / speed), totalChars)

      setDisplayedLength(charsToShow)

      // Scroll into view periodically during typing
      if (charsToShow % 40 === 0 && containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }

      if (charsToShow < totalChars) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsComplete(true)
        onComplete?.()
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [text, speed, isComplete, onComplete])

  return (
    <div ref={containerRef}>
      {renderMarkdown(text.slice(0, displayedLength), onSelectProvider)}
      {!isComplete && <span className="inline-block w-0.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />}
    </div>
  )
}

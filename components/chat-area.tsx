'use client'
import { useRef, useEffect, useState, useMemo, memo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send, Loader, User, MessageCircle, Paperclip, FileText, X, Stethoscope } from 'lucide-react'
import { SimplePDFUpload } from './simple-pdf-upload'
import { TypingEffect } from './typing-effect'
import { renderMarkdown, type ProviderSelectHandler } from '@/lib/render-markdown'
import { LetterPreview, type SessionDocument } from '@/components/letter-preview'

interface Message {
  id: number
  text: string
  sender: 'user' | 'assistant'
  isLoading?: boolean
  pdfAnalysis?: boolean
  images?: string[]
}

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
  provider_id?: number | null
  provider_name?: string
  provider_specialty?: string
  provider_address?: string
  format?: string
  availability?: string
  additional_notes?: string
}

interface ChatAreaProps {
  selectedChatId: number | null
  messages: Message[]
  chatSessionId?: string
  savedFormData?: Record<string, any>
  onCreateChatAndSend?: (message: string, userName?: string, chatSessionId?: string, initialMessages?: Message[]) => void
  onUpdateChatName?: (chatId: number, newName: string, isUserName: boolean) => void
  onUpdateMessages?: (chatId: number, msgs: Message[]) => void
  onUpdateFormData?: (chatId: number, formData: Record<string, any>) => void
}

const CONFIRMATION_WORDS = new Set([
  'yes', 'no', 'ok', 'okay', 'sure', 'correct', 'confirmed', 'confirm',
  'super', 'great', 'perfect', 'good', 'fine', 'right', 'yep', 'yup',
  'nope', 'cancel', 'stop', 'done', 'proceed', 'continue', 'next',
  'wrong', 'incorrect', 'change', 'edit', 'update',
])

function isShortConfirmation(input: string): boolean {
  const t = input.trim().toLowerCase()
  return (
    t.split(/\s+/).length <= 3 &&
    (CONFIRMATION_WORDS.has(t) || CONFIRMATION_WORDS.has(t.split(' ')[0]))
  )
}

const ChatMessage = memo(function ChatMessage({
  message,
  isLastAssistant,
  onSelectProvider,
  onScrollToBottom,
}: {
  message: Message
  isLastAssistant: boolean
    onSelectProvider: ProviderSelectHandler
  onScrollToBottom: () => void
}) {
  return (
    <div className={`flex gap-3 md:gap-4 w-full animate-in fade-in duration-300 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-sm ${message.sender === 'assistant' ? 'bg-primary/10' : 'bg-secondary'}`}>
        {message.sender === 'assistant' ? <MessageCircle className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-secondary-foreground" />}
      </div>
      <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm leading-relaxed ${message.sender === 'user' ? 'bg-secondary text-secondary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
          {message.images && message.images.length > 0 && (
            <div className="mb-3 rounded-xl overflow-hidden shadow-inner bg-black/5">
              <img src={message.images[0]} alt="Doc" className="max-w-full h-auto max-h-64 object-contain" />
            </div>
          )}
          {message.isLoading ? (
            <div className="flex items-center gap-3 py-1">
              <Loader className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium animate-pulse">Thinking...</span>
            </div>
          ) : isLastAssistant ? (
            <TypingEffect text={message.text} speed={10} onComplete={onScrollToBottom} onSelectProvider={onSelectProvider} />
          ) : message.sender === 'assistant' ? (
            <div>{renderMarkdown(message.text, onSelectProvider)}</div>
          ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}
        </div>
      </div>
    </div>
  )
})

export function ChatArea({
  selectedChatId,
  messages: externalMessages,
  chatSessionId,
  savedFormData,
  onCreateChatAndSend,
  onUpdateChatName,
  onUpdateMessages,
  onUpdateFormData,
}: ChatAreaProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [messages, setMessages] = useState<Message[]>(externalMessages)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showPdfUpload, setShowPdfUpload] = useState(false)
  const [localSessionId] = useState(() => Math.random().toString(36).substring(7))
  const sessionId = chatSessionId || localSessionId
  const [letterData, setLetterData] = useState<any>(null)
  const [showLetterPreview, setShowLetterPreview] = useState(false)
  const [formData, setFormData] = useState<any>(savedFormData || {})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [pendingShowPreview, setPendingShowPreview] = useState(false)
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null)
  const [sessionDocuments, setSessionDocuments] = useState<SessionDocument[]>([])

  const lastAssistantId = useMemo(
    () => [...messages].reverse().find(m => m.sender === 'assistant' && !m.isLoading)?.id,
    [messages]
  )
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })


  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (selectedChatId !== null) {
      setMessages(externalMessages || [])
    } else {
      setMessages([])
    }
  }, [selectedChatId, externalMessages])

  const prevChatIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (prevChatIdRef.current !== null && prevChatIdRef.current !== selectedChatId) {
      setLetterData(null)
      setFormData(savedFormData || {})
      setShowLetterPreview(false)
      setPendingShowPreview(false)
      setPendingFile(null)
      setPendingImages([])
    }
    prevChatIdRef.current = selectedChatId
  }, [selectedChatId, savedFormData])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.sender === 'assistant' && !lastMessage.isLoading) {
      inputRef.current?.focus()
    }
  }, [messages])

  useEffect(() => {
    if (pendingShowPreview && letterData && Object.keys(letterData).length > 0) {
      setShowLetterPreview(true)
      setPendingShowPreview(false)
    }
  }, [pendingShowPreview, letterData])

  const prompts = [
    { title: "I'm looking for a Dr. / Facility", description: "Let's find the closest one to your address" },
    { title: 'I have a prescription', description: 'Upload an Rx to get started' },
    { title: 'Help me find the right care', description: 'Tell me about your injuries / symptoms' },
  ]

  // Normalizer: takes raw n8n response string, returns { text, fields } regardless of format


  const normalizeN8nResponse = (rawText: string): { text: string; fields: Record<string, string> } => {
    const knownFields = [
      'patient_name', 'phone', 'dob', 'doi', 'legal_firm', 'law_firm',
      'attorney_name', 'attorney_phone', 'attorney_email', 'service_type',
      'provider_name', 'provider_specialty', 'provider_address', 'doctor_name',
      'format', 'availability', 'additional_notes',
    ]
    const extractFields = (obj: any): Record<string, string> => {
      const fields: Record<string, string> = {}
      for (const field of knownFields) {
        if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
          const key = field === 'law_firm' ? 'legal_firm' : field
          fields[key] = obj[field].trim()
        }
      }
      return fields
    }

    let data: any
    try {
      data = JSON.parse(rawText)
    } catch {
      return { text: rawText, fields: {} }
    }
    if (Array.isArray(data)) data = data[0] || {}

    // ── Если это ответ с провайдерами — возвращаем RAW текст без изменений ──────
    // render-markdown сам разберёт providers[] из JSON
    if (Array.isArray(data?.providers) && data.providers.length > 0) {
      console.log('[v0] Normalizer: PROVIDERS JSON — передаём raw в render-markdown')
      return { text: rawText, fields: {} }
    }

    const outputText = data.output || data.text || data.message || ''

    // FORMAT 1: top-level structured fields
    const topLevelFields = extractFields(data)
    if (Object.keys(topLevelFields).length >= 3) {
      console.log('[v0] Normalizer: FORMAT 1 - top-level JSON fields:', Object.keys(topLevelFields))
      return { text: outputText || 'Analysis complete.', fields: topLevelFields }
    }

    // FORMAT 2: data.output is itself a JSON string
    if (outputText && outputText.trimStart().startsWith('{')) {
      try {
        const innerJson = JSON.parse(outputText)
        // Тоже проверяем на providers[]
        if (Array.isArray(innerJson?.providers) && innerJson.providers.length > 0) {
          console.log('[v0] Normalizer: PROVIDERS JSON inside output')
          return { text: rawText, fields: {} }
        }
        const innerFields = extractFields(innerJson)
        if (Object.keys(innerFields).length >= 3) {
          const innerText = innerJson.output || innerJson.text || innerJson.message || ''
          console.log('[v0] Normalizer: FORMAT 2 - JSON inside output string:', Object.keys(innerFields))
          return { text: innerText || 'Analysis complete.', fields: innerFields }
        }
      } catch { }
    }

    // FORMAT 3: embedded ```json``` code block
    if (outputText) {
      const codeBlockMatch = outputText.match(/```(?:json)?\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*```/)
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          const embeddedJson = JSON.parse(codeBlockMatch[1])
          const embeddedFields = extractFields(embeddedJson)
          if (Object.keys(embeddedFields).length >= 3) {
            const cleanText = outputText.replace(/```(?:json)?\s*\n?\s*\{[\s\S]*?\}\s*\n?\s*```/g, '').trim()
            console.log('[v0] Normalizer: FORMAT 3 - JSON in code block:', Object.keys(embeddedFields))
            return { text: cleanText || 'Analysis complete.', fields: embeddedFields }
          }
        } catch { }
      }
    }

    // FORMAT 4: plain text
    console.log('[v0] Normalizer: FORMAT 4 - plain text response')
    return { text: outputText || rawText || 'Analysis complete.', fields: {} }
  }

  const parsePatientDataFromText = (text: string) => {
    const data: any = {}

    const patterns: Record<string, RegExp[]> = {
      patient_name: [
        /[-•]\s*\*\*Patient\s*Name\*\*:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*Patient\s*Name:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Patient\s*Name\*\*:\s*(.+?)(?:\n|$)/i,
        /\*\*Patient\s*Name:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Patient\*\*:\s*(.+?)(?:\n|$)/i,
        /\*\*Name\*\*:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*Patient\s*Name:\s*(.+?)(?:\n|$)/i,
        /Patient\s*Name:\s*(.+?)(?:\n|$)/i,
      ],
      phone: [
        /\*\*Phone(?:\s*Number)?:\*\*\s*([\d()+ -]{7,})(?:\n|$)/i,
        /\*\*Contact\s*Phone:\*\*\s*([\d()+ -]{7,})(?:\n|$)/i,
        /Phone(?:\s*Number)?:\s*([\d()+ -]{7,})(?:\n|$)/i,
        /Contact\s*Phone:\s*([\d()+ -]{7,})(?:\n|$)/i,
      ],
      dob: [
        /[-•]\s*\*\*(?:Date of Birth|DOB)\*\*:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*(?:Date of Birth|DOB):\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*(?:Date of Birth|DOB)\*\*:\s*(.+?)(?:\n|$)/i,
        /\*\*(?:Date of Birth|DOB):\*\*\s*(.+?)(?:\n|$)/i,
        /[-•]\s*(?:Date of Birth|DOB):\s*(.+?)(?:\n|$)/i,
        /(?:Date of Birth|DOB):\s*(.+?)(?:\n|$)/i,
      ],

      // ── doi ───────────────────────────────────────────────────────────────────────
      doi: [
        /[-•]\s*\*\*(?:Date of Injury|DOI|Injury Date)\*\*:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*(?:Date of Injury|DOI|Injury Date):\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*(?:Date of Injury|DOI|Injury Date)\*\*:\s*(.+?)(?:\n|$)/i,
        /\*\*(?:Date of Injury|DOI|Injury Date):\*\*\s*(.+?)(?:\n|$)/i,
        /[-•]\s*(?:Date of Injury|DOI|Injury Date):\s*(.+?)(?:\n|$)/i,
        /(?:Date of Injury|DOI|Injury Date):\s*(.+?)(?:\n|$)/i,
      ],
      legal_firm: [
        /\*\*(?:Legal|Law)\s*Firm(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /(?:Legal|Law)\s*Firm(?:\s*Name)?:\s*(.+?)(?:\n|$)/i,
      ],
      attorney_name: [
        /\*\*Attorney\/Case\s*(?:Manager|Mgr)(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Attorney(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Case\s*(?:Manager|Mgr)(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /Attorney\/Case\s*(?:Manager|Mgr)(?:\s*Name)?:\s*(.+?)(?:\n|$)/i,
        /Attorney(?:\s*Name)?:\s*(.+?)(?:\n|$)/i,
        /Case\s*(?:Manager|Mgr)(?:\s*Name)?:\s*(.+?)(?:\n|$)/i,
      ],
      attorney_phone: [
        /\*\*Attorney\s*Phone:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Case\s*Manager\s*Phone:\*\*\s*(.+?)(?:\n|$)/i,
        /Attorney\s*Phone:\s*(.+?)(?:\n|$)/i,
      ],
      attorney_email: [
        /\*\*Attorney\s*Email:\*\*\s*([\w.+-]+@[\w.-]+)(?:\n|$)/i,
        /\*\*Email:\*\*\s*([\w.+-]+@[\w.-]+)(?:\n|$)/i,
        /Attorney\s*Email:\s*([\w.+-]+@[\w.-]+)(?:\n|$)/i,
        /Email:\s*([\w.+-]+@[\w.-]+)(?:\n|$)/i,
      ],
      service_type: [
        /[-•]\s*\*\*(?:Service\s*Type|Recommendations?)\*\*:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*(?:Service\s*Type|Recommendations?):\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*(?:Service\s*Type|Recommendations?)\*\*:\s*(.+?)(?:\n|$)/i,
        /\*\*(?:Service\s*Type|Recommendations?):\*\*\s*(.+?)(?:\n|$)/i,
        /[-•]\s*(?:Service\s*Type|Recommendations?):\s*(.+?)(?:\n|$)/i,
        /(?:Service\s*Type|Recommendations?):\s*(.+?)(?:\n|$)/i,
      ],
      provider_name: [
        /You've selected\s+\*\*(.+?)\*\*\s+with/i,
        /selected\s+\*\*(.+?)\*\*\s+with/i,
        /\*\*Selected Provider:\*\*\s*\*\*(.+?)\*\*/,
        /[-•]\s*\*\*Selected Provider:\*\*\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*Provider.*?Name:\*\*\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*Provider:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Provider.*?Name:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Provider:\*\*\s*(.+?)(?:\n|$)/i,
        /Provider Name:\s*(.+?)(?:\n|$)/i,
        /Provider:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*Facility(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Facility(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /Facility(?:\s*Name)?:\s*(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*Clinic:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Clinic:\*\*\s*(.+?)(?:\n|$)/i,
        /Clinic:\s*(.+?)(?:\n|$)/i,
      ],
      provider_specialty: [
        /\*\*Specialty:\*\*\s*(.+?)(?:\n|$)/i,
        /Specialty:\s*(.+?)(?:\n|$)/i,
      ],
      provider_address: [
        /\*\*Address:\*\*\s*(.+?)(?:\n|$)/i,
        /Address:\s*(.+?)(?:\n|$)/i,
      ],
      format: [
        /\*\*Format:\*\*\s*(.+?)(?:\n|$)/i,
        /Format:\s*(.+?)(?:\n|$)/i,
      ],
      availability: [
        /\*\*Availability:\*\*\s*(.+?)(?:\n|$)/i,
        /Availability:\s*(.+?)(?:\n|$)/i,
      ],
      additional_notes: [
        /\*\*(?:Additional\s*)?Notes:\*\*\s*(.+?)(?:\n|$)/i,
        /(?:Additional\s*)?Notes:\s*(.+?)(?:\n|$)/i,
      ],
      doctor_name: [
        /🏥\s*Doctor\s*Name[:\s]+(.+?)(?:\n|$)/i,
        /[-•]\s*\*\*Doctor(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /\*\*Doctor(?:\s*Name)?:\*\*\s*(.+?)(?:\n|$)/i,
        /Doctor(?:\s*Name)?:\s*(.+?)(?:\n|$)/i,
      ],
    }

    Object.entries(patterns).forEach(([key, patternList]) => {
      for (const pattern of patternList) {
        const match = text.match(pattern)
        if (match && match[1]) {
          const value = match[1].trim().replace(/\*\*/g, '')
          if (value && value !== 'Not applicable' && value !== '-') {
            data[key] = value
            console.log(`[v0] Extracted ${key}: ${value}`)
            break
          }
        }
      }

    })
    return Object.keys(data).length > 0 ? data : null
  }

  const handleProcessingComplete = async (_data: any, imageUrls: string[], file: File, fileUrl?: string) => {
    setPendingFile(file)
    setPendingImages(imageUrls)
    setLastUploadedFile(file)
    setShowPdfUpload(false)

    if (fileUrl) {
      setSessionDocuments(prev => [
        ...prev,
        {
          document_type: 'prescription',
          file_url: fileUrl,
          file_name: file.name,
        },
      ])
    }
  }

  const persistFormData = (newFormData: any) => {
    setFormData(newFormData)
    if (selectedChatId !== null && onUpdateFormData) {
      onUpdateFormData(selectedChatId, newFormData)
    }
  }

  const handleSendMessage = async (userInput: string = inputValue, extraData?: Record<string, any>) => {
    const currentFile = pendingFile
    const currentImages = pendingImages.length > 0 ? [...pendingImages] : []
    const isNewChat = selectedChatId === null

    setPendingFile(null)
    setPendingImages([])
    setInputValue('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setIsSending(true)

    const userMessage: Message = {
      id: Date.now(),
      text: currentFile ? `[Document: ${currentFile.name}] ${userInput}` : userInput,
      sender: 'user',
      images: currentImages,
    }

    const assistantMsgId = Date.now() + 1
    const loadingMessage: Message = { id: assistantMsgId, text: '', sender: 'assistant', isLoading: true }
    const updatedLocalMessages = [...messages, userMessage]
    const messagesWithLoader = [...updatedLocalMessages, loadingMessage]

    // Сначала показываем лоадер локально
    setMessages(messagesWithLoader)

    if (isNewChat && onCreateChatAndSend) {
      // Передаём messagesWithLoader — page.tsx запишет их в новый чат сраз��
      const chatTitle = currentFile ? `Doc: ${currentFile.name}` : userInput
      onCreateChatAndSend(chatTitle, undefined, sessionId, messagesWithLoader)
    } else if (selectedChatId !== null && onUpdateMessages) {
      onUpdateMessages(selectedChatId, messagesWithLoader)
    }

    try {
      const formDataToSend = new FormData()

      // Parse ALL assistant messages in current chat to extract collected data
      // This ensures we have the latest data even if React state hasn't updated yet
      let collectedFromChat: Record<string, any> = { ...formData, ...extraData }

      for (const msg of messages) {
        if (msg.sender === 'assistant' && msg.text) {
          console.log('[v0] DEBUG: Parsing assistant message:', msg.text.substring(0, 200))
          const parsed = parsePatientDataFromText(msg.text)
          console.log('[v0] DEBUG: Parsed result:', JSON.stringify(parsed))
          if (parsed && Object.keys(parsed).length > 0) {
            collectedFromChat = { ...collectedFromChat, ...parsed }
          }
        }
      }
      console.log('[v0] DEBUG: Final collectedFromChat:', JSON.stringify(collectedFromChat))

      const n8nInput = currentFile
        ? `[DOCUMENT UPLOADED - CRITICAL INSTRUCTIONS: 
1. This is a medical prescription/referral document. Extract and display patient information in a clear bullet-point list:
   - Patient Name
   - Date of Birth
   - Date of Injury
   - Service Type (keep it simple - just the main service category)
2. IMPORTANT: If the document contains MRI, CT, X-ray, or any imaging requests - the Service Type is "Radiology". 
   Do NOT list individual procedures. Just say "Radiology" or "MRI" as the service type.
3. After showing the extracted data, ask the user to CONFIRM if the information is correct.
4. DO NOT show providers yet. DO NOT proceed to the next step until user confirms.
5. STOP and WAIT for user confirmation before doing anything else.]${userInput ? ` User message: ${userInput}` : ''}`
        : userInput
      formDataToSend.append('chatInput', n8nInput)
      formDataToSend.append('sessionId', sessionId)

      const mergedData = { ...collectedFromChat, ...extraData }
      if (Object.keys(mergedData).length > 0) {
        formDataToSend.append('collectedData', JSON.stringify(mergedData))
        console.log('[v0] Appended collectedData:', JSON.stringify(mergedData))

        const knownFields = Object.entries(mergedData)
          .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '')
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')

        if (knownFields) {
          formDataToSend.append('knownFields', knownFields)
          console.log('[v0] ✅ knownFields:', knownFields)
        }

        if (Object.keys(mergedData).length > Object.keys(formData).length) {
          persistFormData(mergedData)
        }
      }

      if (currentImages.length > 0) {
        for (let i = 0; i < currentImages.length; i++) {
          const response = await fetch(currentImages[i])
          const blob = await response.blob()
          formDataToSend.append('file', blob, `page-${i + 1}.jpg`)
        }

        if (currentFile) {
          formDataToSend.append('attachment', currentFile, currentFile.name)
        }

      } else if (currentFile) {
        formDataToSend.append('file', currentFile, currentFile.name)
        formDataToSend.append('attachment', currentFile, currentFile.name)
      }

      const response = await fetch('/api/n8n', { method: 'POST', body: formDataToSend })

      // const response = await fetch('/api/n8n', {
      //   method: 'POST',
      //   body: formDataToSend,
      // })

      if (!response.ok) throw new Error(`Network response: ${response.status}`)
      const rawText = await response.text()
      if (!rawText.trim()) throw new Error('n8n returned empty response')

      // Use normalizer to handle all n8n response formats
      const normalized = normalizeN8nResponse(rawText)
      const assistantText = normalized.text
      const jsonFields = normalized.fields
      const hasStructuredData = Object.keys(jsonFields).length >= 3

      // Also try regex parsing from the assistant text (for markdown summaries)
      const parsedData = parsePatientDataFromText(assistantText)

      // Merge: existing formData + regex-parsed + JSON fields (JSON fields take priority)
      let updatedFormData = { ...formData }
      if (parsedData) {
        updatedFormData = { ...updatedFormData, ...parsedData }
      }
      if (hasStructuredData) {
        updatedFormData = { ...updatedFormData, ...jsonFields }
      }
      if (parsedData || hasStructuredData) {
        persistFormData(updatedFormData)
      }

      // ─── PREVIEW TRIGGER LOGIC ───────────────────────────────────────────────
      // Rule: preview only opens when we have BOTH patient data AND provider data.
      // We check ALL sources: current formData state, updatedFormData, jsonFields,
      // letterData (previous preview), and the full chat history (for async state lag).
      let shouldTriggerPreview = false

      // Collect patient_name from all sources (formData may lag due to async setState)
      const allMessages = [...messages, ...updatedLocalMessages]
      let patientNameFromHistory = ''
      for (const msg of [...allMessages].reverse()) {
        if (msg.sender === 'assistant' && msg.text) {
          try {
            const p = normalizeN8nResponse(msg.text)
            if (p.fields.patient_name) { patientNameFromHistory = p.fields.patient_name; break }
          } catch { /* ignore */ }
          const m = msg.text.match(/patient(?:\s*name)?[:\s*]+\*?\*?([^\n\-*,]+)/i)
          if (m) { patientNameFromHistory = m[1].trim(); break }
        }
        if (msg.sender === 'user' && msg.text && !msg.text.includes(' ') && msg.text.length > 2) {
          // single-word user message = likely patient name response
        }
      }

      const resolvedPatientName =
        updatedFormData.patient_name?.trim() ||
        formData.patient_name?.trim() ||
        jsonFields.patient_name?.trim() ||
        letterData?.patient_name?.trim() ||
        patientNameFromHistory

      const resolvedProviderName =
        updatedFormData.provider_name?.trim() ||
        formData.provider_name?.trim() ||
        jsonFields.provider_name?.trim() ||
        letterData?.provider_name?.trim()

      const readyForPreview = !!(resolvedPatientName && resolvedProviderName)

      const lowerText = assistantText.toLowerCase()

      if (readyForPreview) {
        // Trigger 1: explicit [STATUS: INTAKE_COMPLETE] tag from n8n
        if (assistantText.toUpperCase().includes('[STATUS: INTAKE_COMPLETE]')) {
          shouldTriggerPreview = true
        }

        // Trigger 2: structured JSON with patient_name + provider_name
        if (!shouldTriggerPreview && hasStructuredData && jsonFields.patient_name && jsonFields.provider_name) {
          shouldTriggerPreview = true
        }

        // Guard: if this is a provider LIST (multiple providers), never trigger preview
        const providerNameCount = (lowerText.match(/provider name/g) || []).length
        const isProviderList =
          providerNameCount > 1 ||
          lowerText.includes('choose a facility') ||
          lowerText.includes('providers in') ||
          lowerText.includes('miles from') ||
          lowerText.includes('km from') ||
          lowerText.includes('here are some') ||
          lowerText.includes('here are the') ||
          lowerText.includes('available providers') ||
          lowerText.includes('following providers')

        // Trigger 3A: plain-text bullet-list summary with "patient name" + 2 other intake fields
        if (!shouldTriggerPreview && !isProviderList) {
          const hasPatientLabel = lowerText.includes('patient name')
          const intakeLabels = [
            'date of birth', 'date of injury', 'law firm', 'phone', 'attorney',
            'dob', 'doi', 'provider name', 'facility name',
            'availability', 'service type', 'additional notes', 'attorney email',
            'attorney phone', 'law firm name',
          ]
          const matchedLabels = intakeLabels.filter(f => lowerText.includes(f))
          if (hasPatientLabel && matchedLabels.length >= 2) {
            shouldTriggerPreview = true
          }
        }
      }

      // If triggered: parse any bullet-list fields from summary text and merge into data
      if (shouldTriggerPreview) {
        const fieldMap: Record<string, string> = {
          'patient name': 'patient_name',
          'phone': 'phone',
          'date of birth': 'dob',
          'date of injury': 'doi',
          'law firm name': 'legal_firm',
          'law firm': 'legal_firm',
          'attorney name': 'attorney_name',
          'attorney email': 'attorney_email',
          'attorney phone': 'attorney_phone',
          'provider name': 'provider_name',
          'facility name': 'provider_name',
          'provider address': 'provider_address',
          'provider specialty': 'provider_specialty',
          'specialty': 'provider_specialty',
          'doctor name': 'doctor_name',
          'doctor': 'doctor_name', 
          'service type': 'service_type',
          'format': 'format',
          'availability': 'availability',
          'additional notes': 'additional_notes',
        }
        const bulletFields: Record<string, string> = {}
        for (const [label, key] of Object.entries(fieldMap)) {
          const regex = new RegExp(`\\*{0,2}${label}\\*{0,2}[:\\s]+([^\\n\\-]+)`, 'i')
          const match = assistantText.match(regex)
          if (match && match[1].trim()) bulletFields[key] = match[1].trim()
        }
        if (Object.keys(bulletFields).length > 0) {
          Object.assign(jsonFields, bulletFields)
          updatedFormData = { ...updatedFormData, ...bulletFields }
        }
      }

      if (shouldTriggerPreview) {
        // Collect data from ALL previous assistant messages that had structured JSON
        // This handles the case when INTAKE_COMPLETE arrives as plain text (no JSON)
        // but earlier messages contained the full patient/provider data
        const allHistoryData: Record<string, any> = {}

        const isCleanValue = (v: any) => {
          if (v === undefined || v === null) return false
          if (typeof v === 'number') return true
          const str = String(v).trim()
          if (!str) return false
          const isQuestion = str.includes('?') ||
            str.toLowerCase().includes('please provide') ||
            str.toLowerCase().includes('could you')
          return !isQuestion
        }

        // Step 1: Parse all previous assistant messages for structured JSON data
        const allPrevMessages = [...messages, ...updatedLocalMessages]
        for (const msg of allPrevMessages) {
          if (msg.sender === 'assistant' && msg.text) {
            try {
              const parsed = normalizeN8nResponse(msg.text)
              if (Object.keys(parsed.fields).length > 0) {
                for (const [k, v] of Object.entries(parsed.fields)) {
                  if (isCleanValue(v)) allHistoryData[k] = v
                }
              }
            } catch { /* ignore */ }
          }
        }

        // Step 2: Override with current updatedFormData (includes current jsonFields if any)
        for (const [k, v] of Object.entries(updatedFormData)) {
          if (isCleanValue(v)) allHistoryData[k] = v
        }

        // Step 3: Override with current jsonFields (most recent structured data from n8n)
        for (const [k, v] of Object.entries(jsonFields)) {
          if (isCleanValue(v)) allHistoryData[k] = v
        }

        const providerFields = ['provider_id', 'doctor_name', 'provider_name',
          'provider_address', 'provider_specialty', 'format']
        for (const field of providerFields) {
          const val = formData[field] ?? updatedFormData[field]
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            allHistoryData[field] = val
          }
        }

        // Step 4: Fill any remaining gaps from letterData (previous preview state)
        if (letterData) {
          for (const [k, v] of Object.entries(letterData)) {
            if (!allHistoryData[k] && isCleanValue(v)) allHistoryData[k] = v
          }
        }

        console.log('[v0] previewData built from history:', JSON.stringify(allHistoryData))
        setLetterData(allHistoryData)
        setPendingShowPreview(true)

        // Don't show summary in chat - just show a brief confirmation and open preview
        const briefConfirmation = `Great! I've prepared the appointment request. Please review and confirm in the preview.`
        const assistantResponse: Message = { id: assistantMsgId, text: briefConfirmation, sender: 'assistant', isLoading: false }
        const finalMessagesToSave = [...updatedLocalMessages, assistantResponse]
        setMessages(finalMessagesToSave)
        if (selectedChatId !== null && onUpdateMessages) {
          onUpdateMessages(selectedChatId, finalMessagesToSave)
        }
      } else {
        // Normal message - show full response in chat
        const displayText = assistantText.replace('[STATUS: INTAKE_COMPLETE]', '').trim()
        const assistantResponse: Message = { id: assistantMsgId, text: displayText, sender: 'assistant', isLoading: false }
        const finalMessagesToSave = [...updatedLocalMessages, assistantResponse]
        setMessages(finalMessagesToSave)
        if (selectedChatId !== null && onUpdateMessages) {
          onUpdateMessages(selectedChatId, finalMessagesToSave)
        }
      }
    } catch (error: any) {
      console.error('[chat] Error:', error)

      let userMessage = 'Connection error. Please try again.'
      if (error?.status === 503 || (error instanceof Response && error.status === 503)) {
        userMessage = 'Server is busy right now — please wait a moment and try again.'
      } else if (error?.status === 504 || (error instanceof Response && error.status === 504)) {
        userMessage = 'Server took too long to respond. Please try again.'
      }

      setMessages((prev) =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, text: userMessage, isLoading: false }
            : msg
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  const handlePdfAnalysis = (result: string) => {
    if (selectedChatId === null && onCreateChatAndSend) {
      onCreateChatAndSend('PDF Document uploaded')
    }
    setShowPdfUpload(false)
    setMessages((prev) => [...prev, { id: Date.now(), text: result, sender: 'assistant' as const, pdfAnalysis: true }])
  }

  const handlePdfImagesConverted = async (imageUrls: string[], fileName: string) => {
    if (selectedChatId === null && onCreateChatAndSend) {
      onCreateChatAndSend(`PDF uploaded: ${fileName}`)
    }
    setShowPdfUpload(false)
    const loadingMsgId = Date.now()
    setMessages((prev) => [...prev, { id: loadingMsgId, text: `Analyzing PDF "${fileName}" with ${imageUrls.length} page(s)...`, sender: 'assistant' as const, isLoading: true }])

    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_pdf', fileName, imageUrls, totalPages: imageUrls.length, sessionId }),
      })
      if (!response.ok) throw new Error(`N8N error: ${response.status}`)
      const responseText = await response.text()
      const result = JSON.parse(responseText)
      setMessages((prev) => prev.map(msg => msg.id === loadingMsgId ? { ...msg, text: result.output || 'PDF analysis complete.', isLoading: false } : msg))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze PDF'
      setMessages((prev) => prev.map(msg => msg.id === loadingMsgId ? { ...msg, text: `Error analyzing PDF: ${errorMessage}`, isLoading: false } : msg))
    }
  }

  const handleLetterConfirm = async (updatedData?: LetterData) => {
    setIsSending(true)

    try {
      const dataToSend = { ...formData, ...letterData, ...updatedData }
      // const controller = new AbortController()
      // const timeoutId = setTimeout(() => controller.abort(), 10000)

      const fd = new FormData()
      fd.append('action', 'send_email')
      fd.append('sessionId', sessionId)
      fd.append('letterData', JSON.stringify(dataToSend))

      if (dataToSend.provider_id) fd.append('provider_id', String(dataToSend.provider_id))
      if (dataToSend.patient_name) fd.append('patient_name', dataToSend.patient_name)
      if (dataToSend.phone) fd.append('phone', dataToSend.phone)
      if (dataToSend.dob) fd.append('dob', dataToSend.dob)
      if (dataToSend.doi) fd.append('doi', dataToSend.doi)
      if (dataToSend.legal_firm) fd.append('legal_firm', dataToSend.legal_firm || '')
      if (dataToSend.attorney_name) fd.append('attorney_name', dataToSend.attorney_name || '')
      if (dataToSend.attorney_phone) fd.append('attorney_phone', dataToSend.attorney_phone || '')
      if (dataToSend.attorney_email) fd.append('attorney_email', dataToSend.attorney_email || '')
      if (dataToSend.service_type) fd.append('service_type', dataToSend.service_type || '')
      if (dataToSend.provider_name) fd.append('provider_name', dataToSend.provider_name || '')
      if (dataToSend.provider_specialty) fd.append('provider_specialty', dataToSend.provider_specialty || '')
      if (dataToSend.provider_address) fd.append('provider_address', dataToSend.provider_address || '')
      if (dataToSend.format) fd.append('format', dataToSend.format || '')
      if (dataToSend.availability) fd.append('availability', dataToSend.availability || '')
      if (dataToSend.additional_notes) fd.append('additional_notes', dataToSend.additional_notes || '')
      if (dataToSend.doctor_name) fd.append('doctor_name', dataToSend.doctor_name)
      if (lastUploadedFile) fd.append('attachment', lastUploadedFile, lastUploadedFile.name)

      const response = await fetch('/api/n8n', {
        method: 'POST',
        body: fd,
      })
      if (!response.ok) throw new Error(`Failed to send email: ${response.status}`)

      setShowLetterPreview(false)
      if (selectedChatId !== null && letterData?.patient_name && onUpdateChatName) {
        onUpdateChatName(selectedChatId, letterData.patient_name, true)
      }
      setLetterData(null)
      setLastUploadedFile(null)
      persistFormData({})
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Perfect! I've submitted your request via email to ${dataToSend.provider_name || '[provider_name]'}. ${dataToSend.legal_firm || '[Law Firm]'} will also receive a copy via email. Our human schedulers will be calling ${dataToSend.patient_name || '[patient_name]'} soon for scheduling. Once confirmed, ${dataToSend.legal_firm || '[Law Firm]'} will also receive appointment details via email.`,
        sender: 'assistant',
      }])
    } catch (error) {
      let errorMessage = 'Error sending email. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.name === 'AbortError' ? 'Request timeout. Please try again.' : `Error: ${error.message}`
      }
      setMessages((prev) => [...prev, { id: Date.now(), text: errorMessage, sender: 'assistant' as const }])
    } finally {
      setIsSending(false)
    }
  }

  const handleLetterCancel = () => {
    setShowLetterPreview(false)
    setLetterData(null)
    setMessages((prev) => [...prev, { id: Date.now(), text: 'Sending cancelled. Would you like to change anything?', sender: 'assistant' as const }])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
    // Shift+Enter inserts a newline (default textarea behavior)
  }

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }


  const handleSelectProvider: ProviderSelectHandler = (provider) => {
    const providerData: Record<string, any> = {}
    if (provider.id) providerData.provider_id = provider.id
    if (provider.name) providerData.provider_name = provider.name
    if (provider.address) providerData.provider_address = provider.address
    if (provider.specialty) providerData.provider_specialty = provider.specialty
    if (provider.format) providerData.format = provider.format
    if (provider.doctor) providerData.doctor_name = provider.doctor

    console.log('[v0] Provider selected:', JSON.stringify(providerData))

    setFormData((prev: Record<string, any>) => ({ ...prev, ...providerData }))
    setLetterData((prev: Record<string, any>) => ({ ...prev, ...providerData }))
    persistFormData({ ...formData, ...providerData })

    const doctorPart = provider.doctor ? ` (Doctor: ${provider.doctor})` : ''
    const selectionText = `I choose ${provider.name}${doctorPart} at ${provider.address}`

    setInputValue(selectionText)
    // Передаём providerData как extraData — гарантия попадания в knownFields
    setTimeout(() => handleSendMessage(selectionText, providerData), 100)
  }

  return (
    <div className="flex-1 bg-background flex flex-col overflow-hidden relative">
      {selectedChatId === null || messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 md:mb-8 transform hover:scale-105 transition-transform shrink-0">
              <Stethoscope className='w-12 h-12' />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground text-center mb-8 md:mb-12 tracking-tight text-balance">
              {"Let's tackle that workload. What's on your mind?"}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-3xl mb-10 md:mb-12">
              {prompts.map((prompt, index) => (
                <Card key={index} className="p-4 md:p-5 bg-muted/50 border-border hover:border-primary/50 hover:bg-muted cursor-pointer transition-all hover:shadow-md group flex flex-col items-center text-center" onClick={() => handleSendMessage(prompt.title)}>
                  <div className="font-bold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{prompt.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{prompt.description}</div>
                </Card>
              ))}
            </div>
            <div className="w-full max-w-2xl flex flex-col gap-3 relative">
              {pendingFile && (
                <div className="absolute -top-10 left-0 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2 animate-in zoom-in-95 shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium truncate max-w-[200px]">{pendingFile.name}</span>
                  <button onClick={() => setPendingFile(null)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                </div>
              )}
              <div className="relative flex items-center group w-full">
                <div className="absolute left-2 z-20">
                  <Button type="button" size="icon" variant="ghost" onClick={() => setShowPdfUpload(!showPdfUpload)} className="rounded-full h-10 w-10 text-muted-foreground hover:bg-background hover:text-primary transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </div>
                <textarea ref={inputRef} placeholder="How can I help you today?" value={inputValue} onChange={(e) => { setInputValue(e.target.value); autoResizeTextarea(e.target) }} onKeyDown={handleKeyDown} rows={1} className="w-full px-14 py-4 bg-muted border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl outline-none shadow-sm transition-all text-base text-foreground placeholder:text-muted-foreground resize-none overflow-y-auto" style={{ maxHeight: 160 }} />
                <div className="absolute right-2 z-20">
                  <Button size="icon" onClick={() => handleSendMessage()} disabled={isSending || !inputValue.trim()} className="rounded-xl h-10 w-10 shadow-lg disabled:opacity-30 transition-all cursor-pointer">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              {showPdfUpload && (
                <div className="w-full p-4 md:p-6 border border-border bg-card rounded-2xl shadow-xl animate-in slide-in-from-top-2 z-30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upload Document</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPdfUpload(false)} className="rounded-full"><X className="w-4 h-4" /></Button>
                  </div>
                  <SimplePDFUpload onProcessingComplete={handleProcessingComplete} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLastAssistant={message.id === lastAssistantId}
                  onSelectProvider={handleSelectProvider}
                  onScrollToBottom={scrollToBottom}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="p-4 md:p-6 bg-linear-to-t from-background via-background to-transparent relative">
            <div className="max-w-3xl mx-auto relative">
              {showPdfUpload && (
                <div className="absolute bottom-full left-0 right-0 mb-4 p-4 md:p-6 border border-border bg-card rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 z-40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Add to conversation</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPdfUpload(false)} className="rounded-full"><X className="w-4 h-4" /></Button>
                  </div>
                  <SimplePDFUpload onProcessingComplete={handleProcessingComplete} />
                </div>
              )}
              {pendingFile && (
                <div className="mb-3 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2 w-fit animate-in slide-in-from-bottom-1 shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium truncate max-w-[150px]">{pendingFile.name}</span>
                  <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                </div>
              )}
              <div className="relative flex items-center group">
                <div className="absolute left-2 z-20">
                  <Button type="button" size="icon" variant="ghost" onClick={() => setShowPdfUpload(!showPdfUpload)} className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary transition-colors bg-transparent">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </div>
                <textarea ref={inputRef} placeholder="Reply to Newflix AI..." value={inputValue} onChange={(e) => { setInputValue(e.target.value); autoResizeTextarea(e.target) }} onKeyDown={handleKeyDown} disabled={isSending} rows={1} className="w-full pl-12 pr-12 py-4 bg-muted/80 border border-border focus:border-primary/30 focus:bg-background rounded-2xl outline-none shadow-sm transition-all text-sm md:text-base text-foreground placeholder:text-muted-foreground disabled:opacity-50 resize-none overflow-y-auto" style={{ maxHeight: 160 }} />
                <div className="absolute right-2 z-20">
                  <Button size="icon" onClick={() => handleSendMessage()} disabled={isSending || (!inputValue.trim() && !pendingFile)} className="rounded-xl h-9 w-9 shadow-md cursor-pointer">
                    {isSending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )
      }
      {showLetterPreview && letterData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl h-full overflow-y-auto rounded-2xl shadow-2xl">
            <LetterPreview
              data={letterData}
              sessionId={sessionId}
              attachmentFile={lastUploadedFile}
              sessionDocuments={sessionDocuments}
              onConfirm={handleLetterConfirm}
              onCancel={handleLetterCancel}
              isLoading={isSending}
            />
          </div>
        </div>
      )
      }
    </div >
  )
}

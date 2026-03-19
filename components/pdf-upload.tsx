// components/pdf-upload.tsx
"use client"

import { useState } from "react"
import { Upload, FileText, Loader } from "lucide-react"

interface PDFUploadProps {
  onAnalysisComplete?: (result: string, imageUrls?: string[]) => void
}

export function PDFUpload({ onAnalysisComplete }: PDFUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [error, setError] = useState<string>("")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes("pdf")) {
      setError("Please select a PDF file")
      return
    }

    setIsLoading(true)
    setError("")
    setFileName(file.name)

    try {
      // Отправляем PDF на сервер для конвертации
      const formData = new FormData()
      formData.append('file', file)
      formData.append('modelType', 'mini');

      const response = await fetch('/api/pdf-to-images', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert PDF')
      }

      const data = await response.json()
      const urls = data.imageUrls as string[]
      setImageUrls(urls)

      console.log('[v0] PDF converted to images:', urls.length, 'pages')

      // Создаем сообщение для чата с информацией о картинках
      const message = `PDF "${file.name}" successfully converted to ${urls.length} page(s). Image URLs: ${urls.join(', ')}`
      
      if (onAnalysisComplete) {
        onAnalysisComplete(message, urls)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(`Error converting PDF: ${errorMessage}`)
      console.error("[v0] PDF conversion error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-2">
      <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
        <div className="flex flex-col items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Converting PDF...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload PDF</span>
            </>
          )}
        </div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="hidden"
        />
      </label>

      {error && (
        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          {error}
        </div>
      )}

      {imageUrls.length > 0 && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{fileName}</span>
            <span className="text-xs text-muted-foreground">({imageUrls.length} pages)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {imageUrls.map((url, idx) => (
              <img 
                key={idx} 
                src={url} 
                alt={`Page ${idx + 1}`} 
                className="w-full h-auto border border-border rounded" 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


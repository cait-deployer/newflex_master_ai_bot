"use client"
import { useState } from "react"
import { Upload, Loader, FileText, AlertCircle } from "lucide-react"

interface SimplePDFUploadProps {
  onProcessingComplete: (data: any, imageUrls: string[], file: File) => void
}

export function SimplePDFUpload({ onProcessingComplete }: SimplePDFUploadProps) {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const [error, setError] = useState<string>("")

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB)")
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF or Images (JPG, PNG) are allowed")
      return
    }

    setLoading(true)
    setError("")
    setFileName(file.name)

    try {
      const generatedImages: string[] = []

      if (file.type === "application/pdf") {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          document.head.appendChild(script)
          await new Promise((resolve) => { script.onload = resolve })
        }

        const pdfjsLib = (window as any).pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2.0 })
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) continue

          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise

          const base64Image = canvas.toDataURL("image/jpeg", 0.8)
          generatedImages.push(base64Image)
        }
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        generatedImages.push(base64)
      } else {
        throw new Error("Unsupported file type.")
      }

      if (generatedImages.length === 0) throw new Error("Processing failed.")
      onProcessingComplete({}, generatedImages, file)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      <label className="border-2 border-dashed p-6 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all group">
        {loading ? (
          <Loader className="animate-spin text-primary w-6 h-6" />
        ) : (
          <Upload className="text-muted-foreground group-hover:text-primary transition-colors w-6 h-6" />
        )}

        <div className="text-center">
          <span className="text-sm font-semibold block">
            {loading ? "Processing document..." : "Upload Prescription or Record"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Supports PDF, JPG, PNG or WebP (max 10MB)
          </span>
        </div>

        <input
          type="file"
          onChange={processFile}
          hidden
          accept="image/*,.pdf"
          disabled={loading}
        />
      </label>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive animate-in shake-1">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}

      {fileName && !error && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs truncate flex-1 font-medium">{fileName}</span>
          {loading && <span className="text-[10px] text-primary animate-pulse uppercase">Scaling...</span>}
        </div>
      )}
    </div>
  )
}
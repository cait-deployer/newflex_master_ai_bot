'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm mx-4 p-6 bg-background border-border">
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            variant={isDestructive ? "destructive" : "default"}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  )
}

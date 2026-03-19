'use client'

import { Button } from '@/components/ui/button'
import { Plus, Trash2, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'

interface Chat {
  id: number
  title: string
}

interface SidebarProps {
  chats: Chat[]
  selectedChatId: number | null
  onSelectChat: (id: number) => void
  onDeleteChat: (id: number) => void
  onDeleteAllChats: () => void
  onNewChat: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onClose: () => void
  onOpenDeleteDialog: (id: number) => void
  onOpenClearAllDialog: () => void
}

export function Sidebar({
  chats,
  selectedChatId,
  onSelectChat,
  onDeleteChat,
  onDeleteAllChats,
  onNewChat,
  darkMode,
  onToggleDarkMode,
  onClose,
  onOpenDeleteDialog,
  onOpenClearAllDialog,
}: SidebarProps) {
  const [hoveredChatId, setHoveredChatId] = useState<number | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'single' | 'all'
    chatId?: number
  }>({ isOpen: false, type: 'single' })

  const handleDeleteClick = (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation();
    onOpenDeleteDialog(chatId);
  };

  const handleClearAllClick = () => {
    onOpenClearAllDialog();
  };

  const handleConfirmDelete = () => {
    if (confirmDialog.type === 'single' && confirmDialog.chatId !== undefined) {
      onDeleteChat(confirmDialog.chatId)
    } else if (confirmDialog.type === 'all') {
      onDeleteAllChats()
    }
    setConfirmDialog({ isOpen: false, type: 'single' })
  }

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, type: 'single' })
  }

  return (
    <div className="w-full flex flex-col h-screen overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 md:hidden p-2 hover:bg-muted rounded-full transition-colors z-50"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border shrink-0">
        <span className="mt-4 text-base md:text-lg font-bold text-foreground block mb-3 md:mb-4 text-center">
          Newflix AI Master
        </span>
        <Button
          onClick={() => {
            onNewChat();
            if (onClose) onClose();
          }}
          className="w-full bg-primary hover:bg-primary/90 rounded-xl py-5"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Clear All Button */}
      {chats.length > 0 && (
        <div className="px-2 md:px-3 py-2 border-b border-border shrink-0">
          <Button
            onClick={handleClearAllClick}
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs md:text-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear all
          </Button>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 md:p-3">
        {chats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs md:text-sm">
            No chats yet
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="group relative"
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-xs md:text-sm truncate ${selectedChatId === chat.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted'
                    }`}
                >
                  {chat.title}
                </button>
                {hoveredChatId === chat.id && (
                  <button
                    onClick={(e) => handleDeleteClick(e, chat.id)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Dark Mode Toggle */}
      <div className="p-2 md:p-3 border-t border-border shrink-0">
        <Button
          onClick={onToggleDarkMode}
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs md:text-sm text-foreground hover:bg-muted transition-colors"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 mr-2 text-yellow-500" />
              <span className="inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2 text-slate-400" />
              <span className="inline">Dark Mode</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

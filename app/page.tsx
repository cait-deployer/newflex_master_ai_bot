'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { ChatArea } from '@/components/chat-area'
import { Menu, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface Message {
  id: number
  text: string
  sender: 'user' | 'assistant'
  isLoading?: boolean
  pdfAnalysis?: boolean
}

interface Chat {
  id: number
  title: string
  isNamed: boolean
  userName?: string
  messages: Message[]
  sessionId: string
  formData?: Record<string, any>
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedChat = chats.find(chat => chat.id === selectedChatId)

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'all';
    chatId?: number;
  }>({ isOpen: false, type: 'single' });

  const handleConfirmDelete = () => {
    if (confirmDialog.type === 'single' && confirmDialog.chatId !== undefined) {
      handleDeleteChat(confirmDialog.chatId);
    } else if (confirmDialog.type === 'all') {
      handleDeleteAllChats();
    }
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleSelectChat = (id: number) => {
    console.log('handleSelectChat:', id)
    setSelectedChatId(id)
    setSidebarOpen(false)
  }

  const handleNewChat = () => {
    const emptyChat = chats.find(chat => chat.messages.length === 0);
    console.log('emptyChat:', emptyChat, chats)

    if (emptyChat) {
      setSelectedChatId(emptyChat.id);
    } else {
      const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
      const newChat: Chat = {
        id: newId,
        title: 'New Chat',
        isNamed: false,
        messages: [],
        sessionId: Math.random().toString(36).substring(7),
      };
      setChats([newChat, ...chats]);
      setSelectedChatId(newId);
    }
    setSidebarOpen(false);
  };

  // 2. Обновление имени
  const handleUpdateChatName = (chatId: number, newName: string, isUserName: boolean) => {
    setChats(prevChats => prevChats.map(chat =>
      chat.id === chatId
        ? { ...chat, title: newName, isNamed: isUserName }
        : chat
    ));
  };

  const handleDeleteChat = (id: number) => {
    setChats(chats.filter(chat => chat.id !== id))
    if (selectedChatId === id) {
      setSelectedChatId(null)
    }
  }

  const handleDeleteAllChats = () => {
    setChats([])
    setSelectedChatId(null)
  }

  const handleCreateChatAndSend = (message: string, userName?: string, chatSessionId?: string, initialMessages?: Message[]) => {
    const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
    const messageTitle = message.substring(0, 40) || 'New Chat';

    const newChat: Chat = {
      id: newId,
      title: messageTitle,
      isNamed: false,
      userName: userName,
      messages: initialMessages || [{ id: Date.now(), text: message, sender: 'user' }],
      sessionId: chatSessionId || Math.random().toString(36).substring(7),
    };

    setChats(prev => [newChat, ...prev]);
    setSelectedChatId(newId);
  };

  const handleUpdateMessages = (chatId: number, newMessages: Message[]) => {
    console.log('newMessages:', newMessages, chatId)
    setChats(prevChats => prevChats.map(chat =>
      chat.id === chatId
        ? { ...chat, messages: newMessages }
        : chat
    ));
  };

  const handleUpdateFormData = (chatId: number, newFormData: Record<string, any>) => {
    setChats(prevChats => prevChats.map(chat =>
      chat.id === chatId
        ? { ...chat, formData: newFormData }
        : chat
    ));
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen w-full bg-background relative">
        {/* Sidebar */}
        <div
          className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transition-transform duration-300 ease-in-out transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
        >
          <Sidebar
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={(id) => {
              handleSelectChat(id);
              setSidebarOpen(false);
            }}
            onDeleteChat={handleDeleteChat}
            onDeleteAllChats={handleDeleteAllChats}
            onNewChat={handleNewChat}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onClose={() => setSidebarOpen(false)}
            onOpenDeleteDialog={(id) => setConfirmDialog({ isOpen: true, type: 'single', chatId: id })}
            onOpenClearAllDialog={() => setConfirmDialog({ isOpen: true, type: 'all' })}
          />
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.type === 'all' ? 'Clear all chats?' : 'Delete chat?'}
          description={confirmDialog.type === 'all'
            ? 'This will permanently delete all your chats.'
            : 'This chat will be permanently deleted.'}
          confirmText="Delete"
          cancelText="Cancel"
          isDestructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />

        {/* Main chat area */}
        <div className="flex-1 flex flex-col relative">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between p-3 border-b border-border bg-background">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm">Newflix AI Master</span>
            <div className="w-9" />
          </div>

          <ChatArea
            selectedChatId={selectedChatId}
            messages={selectedChat?.messages || []}
            chatSessionId={selectedChat?.sessionId}
            savedFormData={selectedChat?.formData || {}}
            onCreateChatAndSend={handleCreateChatAndSend}
            onUpdateChatName={handleUpdateChatName}
            onUpdateMessages={handleUpdateMessages}
            onUpdateFormData={handleUpdateFormData}
          />
        </div>
      </div>
    </div>
  )
}
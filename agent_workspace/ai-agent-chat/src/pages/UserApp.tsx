import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AgentGallery from '@/components/user/AgentGallery'
import ChatInterface from '@/components/user/ChatInterface'
import ConversationHistory from '@/components/user/ConversationHistory'
import UserLayout from '@/components/user/UserLayout'

export default function UserApp() {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <UserLayout>
      <Routes>
        <Route path="/" element={<Navigate to="agents" replace />} />
        <Route path="agents" element={<AgentGallery />} />
        <Route path="chat/:agentId" element={<ChatInterface />} />
        <Route path="chat/:agentId/:conversationId" element={<ChatInterface />} />
        <Route path="history" element={<ConversationHistory />} />
      </Routes>
    </UserLayout>
  )
}
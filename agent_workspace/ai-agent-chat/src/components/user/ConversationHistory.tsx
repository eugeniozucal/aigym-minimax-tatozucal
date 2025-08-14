import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Conversation, type Agent } from '@/lib/supabase'
import { MessageCircle, Clock, Bot, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface ConversationWithAgent extends Conversation {
  agent?: Agent
  message_count?: number
  last_message_date?: string
}

export default function ConversationHistory() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationWithAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  async function loadConversations() {
    try {
      // Get conversations with basic info
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })

      if (convError) throw convError

      if (!conversationData || conversationData.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Get agent info for each conversation
      const agentIds = [...new Set(conversationData.map(conv => conv.agent_id))]
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .in('id', agentIds)

      if (agentError) throw agentError

      // Get message counts and last message dates
      const conversationsWithDetails = await Promise.all(
        conversationData.map(async (conv) => {
          const { data: messageData, error: msgError } = await supabase
            .from('messages')
            .select('created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)

          const agent = agentData?.find(a => a.id === conv.agent_id)
          const lastMessage = messageData && messageData.length > 0 ? messageData[0] : null

          return {
            ...conv,
            agent,
            message_count: count || 0,
            last_message_date: lastMessage?.created_at
          }
        })
      )

      setConversations(conversationsWithDetails)
    } catch (error: any) {
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conversation History</h1>
        <p className="text-gray-600">Your past conversations with AI agents</p>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start a conversation with an AI agent to see your history here.
          </p>
          <div className="mt-6">
            <Link
              to="/app/agents"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200"
              style={{ backgroundColor: '#1043FA' }}
            >
              Browse Agents
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/app/chat/${conversation.agent_id}/${conversation.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {conversation.agent?.image_url ? (
                      <img
                        src={conversation.agent.image_url}
                        alt={conversation.agent.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200" style={{ backgroundColor: '#f0f9ff' }}>
                        <Bot className="h-6 w-6" style={{ color: '#1043FA' }} />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {conversation.title || `Chat with ${conversation.agent?.name || 'AI Agent'}`}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.agent?.name} • {conversation.message_count} messages
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {conversation.last_message_date ? formatDate(conversation.last_message_date) : formatDate(conversation.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
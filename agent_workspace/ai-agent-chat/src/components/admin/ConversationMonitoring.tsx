import React, { useState, useEffect } from 'react'
import { supabase, type Profile, type Agent, type Conversation, type Message } from '@/lib/supabase'
import { MessageCircle, Users, Download, Search, Eye, Clock, Bot, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface ConversationWithDetails extends Conversation {
  user?: Profile
  agent?: Agent
  message_count?: number
  last_activity?: string
}

interface ConversationMessages {
  conversation: ConversationWithDetails
  messages: Message[]
}

export default function ConversationMonitoring() {
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showConversationModal, setShowConversationModal] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      loadUserConversations(selectedUser.id)
    }
  }, [selectedUser])

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserConversations(userId: string) {
    try {
      setLoading(true)
      
      // Get conversations for the user
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (convError) throw convError

      if (!conversationData || conversationData.length === 0) {
        setConversations([])
        return
      }

      // Get agent info for each conversation
      const agentIds = [...new Set(conversationData.map(conv => conv.agent_id))]
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .in('id', agentIds)

      if (agentError) throw agentError

      // Get message counts and last activity for each conversation
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
          const lastActivity = messageData && messageData.length > 0 ? messageData[0].created_at : conv.created_at

          return {
            ...conv,
            user: selectedUser,
            agent,
            message_count: count || 0,
            last_activity: lastActivity
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

  async function loadConversationMessages(conversation: ConversationWithDetails) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      setSelectedConversation({
        conversation,
        messages: messages || []
      })
      setShowConversationModal(true)
    } catch (error: any) {
      toast.error('Failed to load conversation messages')
    }
  }

  async function downloadTranscript(conversation: ConversationWithDetails) {
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          action: 'get_conversation_transcript',
          data: { conversationId: conversation.id }
        }
      })

      if (error) throw error

      // Create and download the transcript file
      const blob = new Blob([data.data.transcript], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `conversation-${conversation.id}-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Transcript downloaded successfully')
    } catch (error: any) {
      toast.error('Failed to download transcript')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredConversations = conversations.filter(conv =>
    conv.agent?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conversation Monitoring</h1>
        <p className="text-gray-600">Monitor and analyze user conversations with AI agents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" style={{ color: '#1043FA' }} />
              Users ({filteredUsers.length})
            </h3>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 text-sm"
                  
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded mb-1"></div>
                      <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 ${
                      selectedUser?.id === user.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: user.role === 'admin' ? '#1043FA' : '#f0f9ff' }}>
                          {user.role === 'admin' ? (
                            <UserIcon className="h-5 w-5 text-white" />
                          ) : (
                            <UserIcon className="h-5 w-5" style={{ color: '#1043FA' }} />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || 'No name provided'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" style={{ color: '#1043FA' }} />
              Conversations
              {selectedUser && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  for {selectedUser.full_name || selectedUser.email}
                </span>
              )}
            </h3>
          </div>
          
          {!selectedUser ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a user</h3>
              <p className="mt-1 text-sm text-gray-500">Choose a user from the left to view their conversations.</p>
            </div>
          ) : loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
              <p className="mt-1 text-sm text-gray-500">This user hasn't started any conversations yet.</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredConversations.map((conversation) => (
                <div key={conversation.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {conversation.agent?.image_url ? (
                        <img
                          src={conversation.agent.image_url}
                          alt={conversation.agent.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200" style={{ backgroundColor: '#f0f9ff' }}>
                          <Bot className="h-6 w-6" style={{ color: '#1043FA' }} />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.title || `Chat with ${conversation.agent?.name || 'AI Agent'}`}
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.agent?.name} • {conversation.message_count} messages
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          Last activity: {formatDate(conversation.last_activity!)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadConversationMessages(conversation)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => downloadTranscript(conversation)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors duration-200"
                        style={{ backgroundColor: '#21A35B' }}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation Modal */}
      {showConversationModal && selectedConversation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedConversation.conversation.title || `Chat with ${selectedConversation.conversation.agent?.name}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedConversation.messages.length} messages • 
                  {selectedConversation.conversation.user?.full_name} with {selectedConversation.conversation.agent?.name}
                </p>
              </div>
              <button
                onClick={() => setShowConversationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: '#f9fafb' }}>
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                    <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                      {message.role === 'user' ? (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1043FA' }}>
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      ) : (
                        selectedConversation.conversation.agent?.image_url ? (
                          <img
                            src={selectedConversation.conversation.agent.image_url}
                            alt={selectedConversation.conversation.agent.name}
                            className="h-8 w-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center border border-gray-200" style={{ backgroundColor: '#f0f9ff' }}>
                            <Bot className="h-5 w-5" style={{ color: '#1043FA' }} />
                          </div>
                        )
                      )}
                    </div>
                    <div
                      className={`px-4 py-2 rounded-2xl ${message.role === 'user'
                        ? 'text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                      style={{
                        backgroundColor: message.role === 'user' ? '#1043FA' : undefined
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => downloadTranscript(selectedConversation.conversation)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200"
                style={{ backgroundColor: '#21A35B' }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Transcript
              </button>
              <button
                onClick={() => setShowConversationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
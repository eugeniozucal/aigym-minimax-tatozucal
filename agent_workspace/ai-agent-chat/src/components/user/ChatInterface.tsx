import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Agent, type Conversation, type Message } from '@/lib/supabase'
import { Send, Bot, User, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChatInterface() {
  const { agentId, conversationId } = useParams<{ agentId: string; conversationId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentId && user) {
      initializeChat()
    }
  }, [agentId, conversationId, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function initializeChat() {
    try {
      // Load agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('is_enabled', true)
        .maybeSingle()

      if (agentError) throw agentError
      if (!agentData) {
        toast.error('Agent not found')
        navigate('/app/agents')
        return
      }

      setAgent(agentData)

      if (conversationId) {
        // Load existing conversation
        await loadConversation(conversationId)
      } else {
        // Create new conversation
        await createNewConversation(agentData.id)
      }
    } catch (error: any) {
      toast.error('Failed to initialize chat')
      navigate('/app/agents')
    } finally {
      setLoading(false)
    }
  }

  async function loadConversation(convId: string) {
    try {
      // Load conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', convId)
        .eq('user_id', user?.id)
        .maybeSingle()

      if (convError) throw convError
      if (!convData) throw new Error('Conversation not found')

      setConversation(convData)

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      setMessages(messagesData || [])
    } catch (error: any) {
      toast.error('Failed to load conversation')
      await createNewConversation(agentId!)
    }
  }

  async function createNewConversation(agentIdParam: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user?.id!,
          agent_id: agentIdParam,
          title: `Chat with ${agent?.name || 'AI Agent'}`,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      setConversation(data)
      
      // Update URL to include conversation ID
      navigate(`/app/chat/${agentIdParam}/${data.id}`, { replace: true })
    } catch (error: any) {
      toast.error('Failed to create conversation')
    }
  }

  async function sendMessage() {
    console.log('sendMessage called', {
      hasMessage: !!newMessage.trim(),
      hasConversation: !!conversation,
      hasAgent: !!agent,
      isSending: sending
    })

    if (!newMessage.trim()) {
      console.log('No message content, returning')
      return
    }
    if (!conversation) {
      console.log('No conversation, returning')
      toast.error('No active conversation')
      return
    }
    if (!agent) {
      console.log('No agent, returning')
      toast.error('No agent selected')
      return
    }
    if (sending) {
      console.log('Already sending, returning')
      return
    }

    const messageContent = newMessage.trim()
    console.log('Sending message:', messageContent)
    setNewMessage('')
    setSending(true)

    try {
      console.log('Calling chat-handler with:', {
        message: messageContent,
        conversationId: conversation.id,
        agentId: agent.id
      })

      // Call the working chat handler edge function (bypasses auth issues)
      const { data, error } = await supabase.functions.invoke('working-chat-handler', {
        body: {
          message: messageContent,
          conversationId: conversation.id,
          agentId: agent.id
        }
      })

      console.log('Chat handler response:', { data, error })

      if (error) {
        console.error('Chat handler error:', error)
        throw error
      }

      console.log('Message sent successfully, refreshing messages...')
      // Refresh messages
      await loadMessages()
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error(`Failed to send message: ${error.message}`)
      setNewMessage(messageContent) // Restore message
    } finally {
      setSending(false)
    }
  }

  async function loadMessages() {
    if (!conversation) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#1043FA' }}></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Agent not found</h3>
          <button
            onClick={() => navigate('/app/agents')}
            className="mt-2 text-sm text-blue-600 hover:text-blue-500"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/app/agents')}
            className="mr-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          
          {agent.image_url ? (
            <img
              src={agent.image_url}
              alt={agent.name}
              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center border-2 border-gray-200" style={{ backgroundColor: '#f0f9ff' }}>
              <Bot className="h-6 w-6" style={{ color: '#1043FA' }} />
            </div>
          )}
          
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">{agent.name}</h1>
            <p className="text-sm text-gray-500">{agent.short_description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#f9fafb' }}>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-white rounded-lg p-6 max-w-md mx-auto shadow-sm">
              <Bot className="mx-auto h-12 w-12 mb-4" style={{ color: '#1043FA' }} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-sm text-gray-600">Send a message to begin chatting with {agent.name}</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md xl:max-w-lg flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                  {message.role === 'user' ? (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1043FA' }}>
                      <User className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    agent.image_url ? (
                      <img
                        src={agent.image_url}
                        alt={agent.name}
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
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center border border-gray-200" style={{ backgroundColor: '#f0f9ff' }}>
                <Bot className="h-5 w-5" style={{ color: '#1043FA' }} />
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl border border-gray-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none max-h-32"
              
              rows={1}
              disabled={sending}
            />
          </div>
          <button
            onClick={() => {
              console.log('Send button clicked')
              sendMessage()
            }}
            disabled={!newMessage.trim() || sending}
            className="p-3 rounded-xl text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#21A35B' }}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
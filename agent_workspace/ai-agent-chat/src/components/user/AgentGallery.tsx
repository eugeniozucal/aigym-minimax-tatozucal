import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Agent } from '@/lib/supabase'
import { MessageCircle, Bot } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgentGallery() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (error: any) {
      toast.error('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Agent Gallery</h1>
        <p className="text-gray-600">Choose an AI agent to start a conversation</p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No agents available</h3>
          <p className="mt-1 text-sm text-gray-500">Contact your administrator to add AI agents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to={`/app/chat/${agent.id}`}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 p-6"
            >
              <div className="text-center">
                {agent.image_url ? (
                  <img
                    src={agent.image_url}
                    alt={agent.name}
                    className="w-16 h-16 rounded-full mx-auto mb-4 object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors duration-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-300 transition-colors duration-200" style={{ backgroundColor: '#f0f9ff' }}>
                    <Bot className="h-8 w-8" style={{ color: '#1043FA' }} />
                  </div>
                )}
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                  {agent.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {agent.short_description}
                </p>
                
                <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-200" style={{ backgroundColor: '#1043FA' }}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Chat
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
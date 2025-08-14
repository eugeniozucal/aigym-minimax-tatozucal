import React, { useState, useEffect, useRef } from 'react'
import { supabase, type Agent } from '@/lib/supabase'
import { Bot, Plus, Edit3, Search, Eye, EyeOff, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    system_prompt: '',
    is_enabled: true
  })
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (error: any) {
      toast.error('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    try {
      // Convert file to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string
            const fileName = `agent-${Date.now()}-${file.name}`

            // Upload via edge function
            const { data, error } = await supabase.functions.invoke('image-upload', {
              body: {
                imageData: base64Data,
                fileName,
                bucketName: 'agent-images'
              }
            })

            if (error) throw error
            resolve(data.data.publicUrl)
          } catch (err: any) {
            reject(err)
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    } catch (error: any) {
      toast.error('Failed to upload image')
      return null
    }
  }

  async function createAgent() {
    if (!formData.name || !formData.system_prompt) {
      toast.error('Name and system prompt are required')
      return
    }

    setSaving(true)
    try {
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: formData.name,
          short_description: formData.short_description,
          system_prompt: formData.system_prompt,
          image_url: imageUrl,
          is_enabled: formData.is_enabled
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Agent created successfully')
      setShowCreateModal(false)
      resetForm()
      loadAgents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create agent')
    } finally {
      setSaving(false)
    }
  }

  async function updateAgent() {
    if (!selectedAgent) return

    setSaving(true)
    try {
      let imageUrl = selectedAgent.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) imageUrl = uploadedUrl
      }

      const { error } = await supabase
        .from('agents')
        .update({
          name: formData.name,
          short_description: formData.short_description,
          system_prompt: formData.system_prompt,
          image_url: imageUrl,
          is_enabled: formData.is_enabled
        })
        .eq('id', selectedAgent.id)

      if (error) throw error

      toast.success('Agent updated successfully')
      setShowEditModal(false)
      resetForm()
      loadAgents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAgentStatus(agent: Agent) {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_enabled: !agent.is_enabled })
        .eq('id', agent.id)

      if (error) throw error

      toast.success(`Agent ${!agent.is_enabled ? 'enabled' : 'disabled'} successfully`)
      loadAgents()
    } catch (error: any) {
      toast.error('Failed to update agent status')
    }
  }

  function resetForm() {
    setFormData({ name: '', short_description: '', system_prompt: '', is_enabled: true })
    setSelectedAgent(null)
    setImageFile(null)
    setImagePreview(null)
  }

  function openEditModal(agent: Agent) {
    setSelectedAgent(agent)
    setFormData({
      name: agent.name,
      short_description: agent.short_description || '',
      system_prompt: agent.system_prompt,
      is_enabled: agent.is_enabled
    })
    setImagePreview(agent.image_url)
    setShowEditModal(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.short_description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  )

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Management</h1>
          <p className="text-gray-600">Create and manage AI agents for your platform</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-200"
          style={{ backgroundColor: '#1043FA' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
            
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No agents found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new AI agent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="text-center mb-4">
                  {agent.image_url ? (
                    <img
                      src={agent.image_url}
                      alt={agent.name}
                      className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 border-gray-200" style={{ backgroundColor: '#f0f9ff' }}>
                      <Bot className="h-8 w-8" style={{ color: '#1043FA' }} />
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  {agent.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 text-center line-clamp-2">
                  {agent.short_description || 'No description provided'}
                </p>
                
                <div className="flex items-center justify-center mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    agent.is_enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {agent.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(agent)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleAgentStatus(agent)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200"
                    style={{ backgroundColor: agent.is_enabled ? '#dc2626' : '#21A35B' }}
                  >
                    {agent.is_enabled ? (
                      <><EyeOff className="w-4 h-4 mr-1" />Disable</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" />Enable</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Agent</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent Image</label>
                <div className="flex items-center space-x-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-200 bg-gray-50">
                      <Bot className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
                  
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Assistant"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  
                  rows={2}
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="Brief description of what this agent does..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  
                  rows={6}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Define the agent's behavior, personality, and capabilities..."
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_enabled"
                  className="h-4 w-4 rounded border-gray-300 focus:ring-2"
                  style={{ color: '#1043FA'}}
                  checked={formData.is_enabled}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                />
                <label htmlFor="is_enabled" className="ml-2 text-sm font-medium text-gray-700">
                  Enable agent for users
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={createAgent}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50"
                style={{ backgroundColor: '#21A35B' }}
              >
                {saving ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {showEditModal && selectedAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Agent</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent Image</label>
                <div className="flex items-center space-x-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-200 bg-gray-50">
                      <Bot className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
                  
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  
                  rows={2}
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  
                  rows={6}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_enabled"
                  className="h-4 w-4 rounded border-gray-300 focus:ring-2"
                  style={{ color: '#1043FA'}}
                  checked={formData.is_enabled}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                />
                <label htmlFor="edit_is_enabled" className="ml-2 text-sm font-medium text-gray-700">
                  Enable agent for users
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={updateAgent}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50"
                style={{ backgroundColor: '#21A35B' }}
              >
                {saving ? 'Updating...' : 'Update Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
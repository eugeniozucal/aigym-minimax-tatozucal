import React, { useState, useEffect, useRef } from 'react'
import { supabase, type Setting } from '@/lib/supabase'
import { Settings as SettingsIcon, Upload, Save, RefreshCw, Palette, Image } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    app_logo_url: '',
    brand_color: '#1043FA',
    app_name: 'AI Agent Chat'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')

      if (error) throw error

      const settingsMap: Record<string, string> = {}
      data?.forEach((setting: Setting) => {
        settingsMap[setting.setting_key] = setting.setting_value || ''
      })

      setSettings({
        app_logo_url: settingsMap.app_logo_url || 'https://i.ibb.co/GzB7Wg5/aiw-logo.png',
        brand_color: settingsMap.brand_color || '#1043FA',
        app_name: settingsMap.app_name || 'AI Agent Chat'
      })
      setLogoPreview(settingsMap.app_logo_url || 'https://i.ibb.co/GzB7Wg5/aiw-logo.png')
    } catch (error: any) {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function uploadLogo(file: File): Promise<string | null> {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string
            const fileName = `logo-${Date.now()}-${file.name}`

            // Upload via edge function
            const { data, error } = await supabase.functions.invoke('image-upload', {
              body: {
                imageData: base64Data,
                fileName,
                bucketName: 'logos'
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
      toast.error('Failed to upload logo')
      return null
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      let logoUrl = settings.app_logo_url
      
      // Upload new logo if selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile)
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        }
      }

      // Update settings in database
      const settingsToUpdate = [
        { key: 'app_logo_url', value: logoUrl },
        { key: 'brand_color', value: settings.brand_color },
        { key: 'app_name', value: settings.app_name }
      ]

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            setting_key: setting.key,
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          })

        if (error) throw error
      }

      // Update local state
      setSettings(prev => ({ ...prev, app_logo_url: logoUrl }))
      setLogoFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      toast.success('Settings saved successfully')
    } catch (error: any) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file must be smaller than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function resetLogo() {
    setLogoFile(null)
    setLogoPreview(settings.app_logo_url)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Settings</h1>
        <p className="text-gray-600">Customize your AI Agent Chat platform branding and configuration</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" style={{ color: '#1043FA' }} />
            Client Customization
          </h3>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">Application Logo</label>
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 object-contain border border-gray-300 rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="h-16 w-16 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {logoFile ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {logoFile && (
                    <button
                      onClick={resetLogo}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Recommended: Square logo, max 5MB. Supports JPG, PNG, WebP formats.
                </p>
                {logoFile && (
                  <p className="mt-1 text-xs text-blue-600">
                    New logo selected: {logoFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* App Name */}
          <div>
            <label htmlFor="app_name" className="block text-sm font-medium text-gray-700 mb-2">
              Application Name
            </label>
            <input
              type="text"
              id="app_name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              
              value={settings.app_name}
              onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
              placeholder="Enter application name"
            />
            <p className="mt-1 text-xs text-gray-500">
              This name will appear in the user interface and browser title.
            </p>
          </div>

          {/* Brand Color */}
          <div>
            <label htmlFor="brand_color" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Color
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="brand_color"
                  className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                  value={settings.brand_color}
                  onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                />
                <input
                  type="text"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 text-sm font-mono"
                  
                  value={settings.brand_color}
                  onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#1043FA"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Preview:</span>
                <div 
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: settings.brand_color }}
                ></div>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This color will be used for buttons, links, and accent elements throughout the application.
            </p>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Presets</label>
            <div className="flex space-x-2">
              {[
                { name: 'Default Blue', color: '#1043FA' },
                { name: 'Green', color: '#21A35B' },
                { name: 'Purple', color: '#8B5CF6' },
                { name: 'Red', color: '#EF4444' },
                { name: 'Orange', color: '#F97316' },
                { name: 'Dark Blue', color: '#0D0095' }
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setSettings({ ...settings, brand_color: preset.color })}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors duration-200"
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">Preview</label>
            <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-8 w-8 object-contain"
                    />
                  )}
                  <h3 className="text-lg font-bold" style={{ color: settings.brand_color }}>
                    {settings.app_name}
                  </h3>
                </div>
                <button
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: settings.brand_color }}
                >
                  Sample Button
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center px-6 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#21A35B' }}
            >
              {saving ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Settings</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, Users, Bot, MessageCircle, Settings, LogOut, Menu, X, Shield, ArrowLeft } from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Agent Management', href: '/admin/agents', icon: Bot },
    { name: 'Conversations', href: '/admin/conversations', icon: MessageCircle },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${mobileMenuOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 ${mobileMenuOpen ? 'opacity-75' : 'opacity-0'} transition-opacity ease-linear duration-300`} />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform ease-in-out duration-300`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Shield className="h-8 w-8" style={{ color: '#1043FA' }} />
              <h1 className="ml-2 text-lg font-bold text-gray-900">Admin Panel</h1>
            </div>
            
            {/* Back to User View Button - Mobile */}
            <div className="px-4 mt-4 mb-2">
              <button
                onClick={() => {
                  navigate('/app')
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
              >
                <ArrowLeft className="mr-3 h-4 w-4" />
                Back to User View
              </button>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1043FA' }}>
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{profile?.full_name}</p>
                <p className="text-sm font-medium text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-4">
              <Shield className="h-8 w-8" style={{ color: '#1043FA' }} />
              <h1 className="ml-2 text-xl font-bold" style={{ color: '#1043FA' }}>Admin Panel</h1>
            </div>
            
            {/* Back to User View Button */}
            <div className="px-4 mb-6">
              <button
                onClick={() => navigate('/app')}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-3 h-4 w-4 group-hover:text-blue-600" />
                Back to User View
              </button>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-colors duration-200`}
                    style={{
                      backgroundColor: isActive(item.href) ? '#1043FA' : 'transparent'
                    }}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1043FA' }}>
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-10 bg-white shadow">
          <div className="px-4 py-2 flex items-center justify-between">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <Shield className="h-6 w-6" style={{ color: '#1043FA' }} />
              <span className="ml-2 font-semibold" style={{ color: '#1043FA' }}>Admin</span>
            </div>
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
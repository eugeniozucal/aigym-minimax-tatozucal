import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AdminLayout from '@/components/admin/AdminLayout'
import UserManagement from '@/components/admin/UserManagement'
import AgentManagement from '@/components/admin/AgentManagement'
import ConversationMonitoring from '@/components/admin/ConversationMonitoring'
import Settings from '@/components/admin/Settings'
import Dashboard from '@/components/admin/Dashboard'

export default function AdminPanel() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="agents" element={<AgentManagement />} />
        <Route path="conversations" element={<ConversationMonitoring />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </AdminLayout>
  )
}
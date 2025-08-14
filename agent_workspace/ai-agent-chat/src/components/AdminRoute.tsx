import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth()

  console.log('AdminRoute - Loading:', loading, 'User:', user?.email, 'Profile:', profile, 'IsAdmin:', isAdmin)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('AdminRoute - No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    console.log('AdminRoute - User not admin, redirecting to app')
    return <Navigate to="/app" replace />
  }

  console.log('AdminRoute - Admin user authenticated, rendering admin panel')
  return <>{children}</>
}
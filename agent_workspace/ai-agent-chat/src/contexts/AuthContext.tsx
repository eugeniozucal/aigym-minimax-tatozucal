import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, type Profile } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.role === 'admin'

  // Load user and profile on mount
  useEffect(() => {
    let mounted = true
    let loadingTimeout: NodeJS.Timeout
    
    async function loadUser() {
      try {
        setLoading(true)
        
        // Set loading timeout to prevent eternal loading
        loadingTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('Loading timeout reached, setting loading to false')
            setLoading(false)
          }
        }, 10000) // 10 second timeout
        
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!mounted) return
        setUser(user)
        
        if (user) {
          await loadProfile(user.id)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
          if (loadingTimeout) clearTimeout(loadingTimeout)
        }
      }
    }
    
    loadUser()

    // Set up auth listener - KEEP SIMPLE, avoid async operations in callback per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        console.log('Auth state changed:', event, session?.user?.email)
        setUser(session?.user || null)
        
        // Load profile in a separate async function to avoid async in callback
        if (session?.user) {
          loadProfile(session.user.id).catch(error => {
            console.error('Error loading profile after auth change:', error)
            setProfile(null)
          })
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      if (loadingTimeout) clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId: string) {
    try {
      console.log('Loading profile for user:', userId)
      
      // Add retry logic for profile loading
      let retries = 3
      let data = null
      
      while (retries > 0 && !data) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.error('Profile load error:', error)
          if (retries === 1) throw error
          retries--
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        data = profileData
        break
      }
      
      console.log('Profile loaded:', data)
      setProfile(data)
      
      // If no profile exists, create one (fallback)
      if (!data) {
        console.warn('No profile found for user, this should not happen with triggers')
      }
      
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
      // Don't throw - let the app continue without profile
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      toast.error(error.message)
      throw error
    }
    
    toast.success('Successfully signed in!')
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (error) {
      toast.error(error.message)
      throw error
    }
    
    toast.success('Successfully signed up!')
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      toast.error(error.message)
      throw error
    }
    
    toast.success('Successfully signed out!')
  }

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
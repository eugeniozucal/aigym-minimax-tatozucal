import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailVerificationProps {
  email: string
  onBack: () => void
}

export default function EmailVerification({ email, onBack }: EmailVerificationProps) {
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  async function handleResendEmail() {
    if (resending || resendCooldown > 0) return
    
    setResending(true)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      if (error) {
        toast.error(error.message)
        throw error
      }
      
      toast.success('Confirmation email sent successfully!')
      
      // Start 60-second cooldown
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
    } catch (error: any) {
      console.error('Error resending email:', error)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Check Your Email
          </h2>
          
          <div className="mt-6 text-sm text-gray-600 space-y-3">
            <p className="text-base leading-relaxed">
              We've sent a confirmation email to:
            </p>
            <p className="font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg">
              {email}
            </p>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Email Details:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><span className="font-medium">From:</span> Supabase Auth</p>
                <p><span className="font-medium">Email:</span> noreply@mail.app.supabase.io</p>
                <p><span className="font-medium">Subject:</span> "Asking to confirm your Sign Up"</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 leading-relaxed">
              <p>
                Please click on the link in the email and log in with the email and password you created.
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3">
                Didn't receive the email? Check your spam folder or request a new one.
              </p>
              
              <button
                onClick={handleResendEmail}
                disabled={resending || resendCooldown > 0}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              >
                {resending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Confirmation Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center space-y-4">
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition duration-150 ease-in-out"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Registration
          </button>
          
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600">
              Already confirmed your email?{' '}
              <Link 
                to="/login" 
                className="font-medium hover:underline transition duration-150 ease-in-out"
                style={{ color: '#1043FA' }}
              >
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
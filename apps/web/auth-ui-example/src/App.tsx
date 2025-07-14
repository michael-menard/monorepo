import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Import auth components directly
import { LoginComponent } from '@repo/auth/src/components/LoginComponent'
import SignupComponent from '@repo/auth/src/components/Signup'
import ForgotPasswordComponent from '@repo/auth/src/components/ForgotPassword'
import ResetPasswordComponent from '@repo/auth/src/components/ResetPassword'
import EmailVerificationComponent from '@repo/auth/src/components/EmailVerification'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Auth UI Example</h1>
            <p className="text-xl">Welcome to the auth package example</p>
            <div className="mt-8 space-x-4">
              <a href="/login" className="text-green-400 hover:underline">Login</a>
              <a href="/signup" className="text-green-400 hover:underline">Signup</a>
            </div>
          </div>
        </div>} />
        <Route path="/login" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <LoginComponent />
        </div>} />
        <Route path="/signup" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <SignupComponent />
        </div>} />
        <Route path="/forgot-password" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <ForgotPasswordComponent />
        </div>} />
        <Route path="/reset-password/:token" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <ResetPasswordComponent />
        </div>} />
        <Route path="/verify-email" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <EmailVerificationComponent />
        </div>} />
        <Route path="/dashboard" element={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
            <p className="text-xl">You are logged in!</p>
          </div>
        </div>} />
      </Routes>
    </div>
  )
}

export default App 
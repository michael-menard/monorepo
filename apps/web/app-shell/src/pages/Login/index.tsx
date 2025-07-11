import React from 'react'
import { LoginComponent } from '@react-constructs/ui-auth'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <LoginComponent />
    </div>
  )
}
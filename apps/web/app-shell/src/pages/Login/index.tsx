import React from 'react'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <iframe 
          src="/auth-ui" 
          className="w-full h-[600px] border-0 rounded-lg shadow-lg"
          title="Login"
        />
      </div>
    </div>
  )
}
import React from 'react'

export const LoginComponent: React.FC = () => {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-xl p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-600">Enter your credentials to access your account</p>
        </div>
        
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Sign in
          </button>
        </form>
        
        <div className="text-center mt-4">
          <a href="/reset-password" className="text-sm text-blue-600 hover:underline">
            Forgot your password?
          </a>
          <div className="text-sm text-gray-600 mt-2">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 
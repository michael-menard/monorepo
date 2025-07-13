function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to React Constructs
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          A monorepo for building modern web applications
        </p>
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Available Apps
            </h2>
            <ul className="text-left space-y-2">
              <li className="text-gray-600">
                • <a href="/auth-ui-example" className="text-blue-600 hover:underline">Auth UI Example</a> - Authentication components demo
              </li>
              <li className="text-gray-600">
                • <a href="/lego-projects-ui" className="text-blue-600 hover:underline">Lego Projects UI</a> - Project management interface
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App 
import Layout from './components/Layout';
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import Home from "./pages/Home.tsx";
import Signup from "./pages/SignUp.tsx";
import Login from "./pages/Login.tsx";
import EmailVerification from "./pages/EmailVerification.tsx";
import {Toaster} from "react-hot-toast";
import {useAuthStore} from "./store/auth.store.ts";
import {useEffect} from "react";
import Dashboard from "./pages/Dashboard.tsx";

const ProtectedRoute = ({ children }) => {
  const {isAuthenticated, user} = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}
const RedirectAuthenticatedUser = ({children}) => {
  const {isAuthenticated, user} = useAuthStore()
  // @ts-ignore
  if (isAuthenticated && user?.isVerified ) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const { isCheckingAuth, checkAuth, isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  console.log('isAuthenticated: ', isAuthenticated)
  console.log('user: ', user)


  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute> } />
          <Route path="/signup" element={
            <RedirectAuthenticatedUser>
              <Signup />
            </RedirectAuthenticatedUser>} />
          <Route path="/login" element={
            <RedirectAuthenticatedUser>
              <Login />
            </RedirectAuthenticatedUser>} />
          <Route path="/verify-email" element={<EmailVerification />} />
        </Routes>
        <Toaster />
      </Layout>
    </BrowserRouter>
  )
}

export default App
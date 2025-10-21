import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WebRTCProvider, useWebRTC } from './contexts/WebRTCContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CallPage from './pages/CallPage'
import IncomingCallModal from './components/IncomingCallModal'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? <Navigate to="/dashboard" /> : children
}

function AppContent() {
  const { incomingCall } = useWebRTC()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/call/:callId?" 
          element={
            <ProtectedRoute>
              <CallPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
      
      {/* Global Incoming Call Modal */}
      {incomingCall && <IncomingCallModal />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <WebRTCProvider>
        <AppContent />
      </WebRTCProvider>
    </AuthProvider>
  )
}

export default App
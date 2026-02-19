import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getPendingBookingsForDriver } from './api/bookings'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { RidesList } from './pages/RidesList'
import { RideDetail } from './pages/RideDetail'
import { CreateRide } from './pages/CreateRide'
import { MyBookings } from './pages/MyBookings'
import { PendingDriverBookings } from './pages/PendingDriverBookings'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Profile } from './pages/Profile'
import './index.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-main"><p>Зареждане...</p></div>
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, token } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setPendingCount(0)
      return
    }
    getPendingBookingsForDriver(token)
      .then((list) => setPendingCount(list.length))
      .catch(() => setPendingCount(0))
  }, [isAuthenticated, token])

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="logo">
          <span className="logo-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h14v-5H5v5z" />
              <path d="M5 9h14V4H5v5z" />
              <circle cx="7.5" cy="6.5" r="1.5" />
              <circle cx="16.5" cy="14.5" r="1.5" />
            </svg>
          </span>
          Споделено пътуване
        </Link>
        <nav>
          {isAuthenticated && (
            <>
              <Link to="/rides">Пътувания</Link>
              <Link to="/rides/new">Създай пътуване</Link>
              <Link to="/my-bookings">Мои резервации</Link>
              <Link to="/pending-bookings">
                Чакащи резервации{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Link>
              <Link to="/profile">Профил</Link>
            </>
          )}
          {isAuthenticated ? (
            <>
              <span className="user-name">{user?.name}</span>
              <button type="button" onClick={logout} className="btn-link">Изход</button>
            </>
          ) : (
            <>
              <Link to="/login">Вход</Link>
              <Link to="/register">Регистрация</Link>
            </>
          )}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/rides" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/rides" element={<ProtectedRoute><RidesList /></ProtectedRoute>} />
      <Route path="/rides/new" element={<ProtectedRoute><CreateRide /></ProtectedRoute>} />
      <Route path="/rides/:id" element={<ProtectedRoute><RideDetail /></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
      <Route path="/pending-bookings" element={<ProtectedRoute><PendingDriverBookings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/rides" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}

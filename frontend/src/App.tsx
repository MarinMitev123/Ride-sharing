import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { setGlobalErrorHandler } from './api/client'
import { getPendingBookingsForDriver, getActiveBookingsForDriver } from './api/bookings'
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
import { Admin } from './pages/Admin'
import './index.css'

function ToastList() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null
  return (
    <div className="toast-list" role="alert" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

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
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)
  const [hasDriverRides, setHasDriverRides] = useState(false)
  const [driverRidesChecked, setDriverRidesChecked] = useState(false)
  const logoutRef = useRef(logout)
  const addToastRef = useRef(addToast)
  const navigateRef = useRef(navigate)
  logoutRef.current = logout
  addToastRef.current = addToast
  navigateRef.current = navigate

  useEffect(() => {
    setGlobalErrorHandler((message, status) => {
      if (status === 401) {
        logoutRef.current()
        navigateRef.current('/login', { replace: true })
        addToastRef.current('Сесията изтече. Влезте отново.', 'info')
      } else if (status === 403) {
        addToastRef.current(message || 'Нямате права за това действие. Влезте с друг акаунт или не отваряйте Админ.', 'error')
      } else {
        addToastRef.current(message, 'error')
      }
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setPendingCount(0)
      setHasDriverRides(false)
      setDriverRidesChecked(false)
      return
    }
    getPendingBookingsForDriver(token)
      .then((list) => setPendingCount(list.length))
      .catch(() => setPendingCount(0))
    getActiveBookingsForDriver(token)
      .then((bookings) => {
        setHasDriverRides(Array.isArray(bookings) && bookings.length > 0)
        setDriverRidesChecked(true)
      })
      .catch(() => {
        setHasDriverRides(false)
        setDriverRidesChecked(true)
      })
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
              {driverRidesChecked && hasDriverRides && (
                <>
                  <Link to="/pending-bookings">Маршрут при тръгване</Link>
                  <Link to="/pending-bookings">
                    Чакащи резервации{pendingCount > 0 ? ` (${pendingCount})` : ''}
                  </Link>
                </>
              )}
              <Link to="/profile">Профил</Link>
              {user?.role === 'ROLE_ADMIN' && (
                <Link to="/admin">Админ</Link>
              )}
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
      <ToastList />
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
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
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
        <ToastProvider>
          <Layout>
            <AppRoutes />
          </Layout>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

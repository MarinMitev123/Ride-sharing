import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { setGlobalErrorHandler } from './api/client'
import { approveBooking, getPendingBookingsForDriver, getActiveBookingsForDriver, rejectBooking } from './api/bookings'
import { getNotifications, markNotificationRead } from './api/notifications'
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
import { Messages } from './pages/Messages'
import { PaymentSuccess } from './pages/PaymentSuccess'
import { PaymentCancel } from './pages/PaymentCancel'
import type { NotificationDto } from './types/api'
import './index.css'

const NAV_DATA_POLL_INTERVAL_MS = 25000

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
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationActionBookingId, setNotificationActionBookingId] = useState<number | null>(null)
  const [markingReadId, setMarkingReadId] = useState<number | null>(null)
  const [hasDriverRides, setHasDriverRides] = useState(false)
  const [driverRidesChecked, setDriverRidesChecked] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
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

  const loadNavData = async () => {
    if (!isAuthenticated || !token) {
      setPendingCount(0)
      setHasDriverRides(false)
      setDriverRidesChecked(false)
      setNotifications([])
      return
    }
    try {
      const [pending, active, allNotifications] = await Promise.all([
        getPendingBookingsForDriver(token).catch(() => []),
        getActiveBookingsForDriver(token).catch(() => []),
        getNotifications(token).catch(() => []),
      ])
      setPendingCount(pending.length)
      setHasDriverRides(Array.isArray(active) && active.length > 0)
      setDriverRidesChecked(true)
      setNotifications(allNotifications)
    } catch {
      setPendingCount(0)
      setHasDriverRides(false)
      setDriverRidesChecked(true)
      setNotifications([])
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setPendingCount(0)
      setHasDriverRides(false)
      setDriverRidesChecked(false)
      setNotifications([])
      return
    }
    void loadNavData()
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!isAuthenticated || !token) return
    const intervalId = window.setInterval(() => {
      void loadNavData()
    }, NAV_DATA_POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current) return
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkRead = async (notificationId: number) => {
    if (!token) return
    setMarkingReadId(notificationId)
    try {
      await markNotificationRead(notificationId, token)
      await loadNavData()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при маркиране на известие', 'error')
    } finally {
      setMarkingReadId(null)
    }
  }

  const handleBookingActionFromNotification = async (bookingId: number, action: 'approve' | 'reject') => {
    if (!token) return
    setNotificationActionBookingId(bookingId)
    try {
      if (action === 'approve') {
        await approveBooking(bookingId, token)
        addToast('Резервацията беше одобрена.', 'success')
      } else {
        await rejectBooking(bookingId, token)
        addToast('Резервацията беше отказана.', 'info')
      }
      await loadNavData()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при обработка на заявката', 'error')
    } finally {
      setNotificationActionBookingId(null)
    }
  }

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
              <Link to="/messages">Съобщения</Link>
              <div className="notifications-nav" ref={notificationsRef}>
                <button
                  type="button"
                  className="notifications-bell-btn"
                  onClick={() => setNotificationsOpen((v) => !v)}
                  aria-label="Известия"
                >
                  <span aria-hidden>🔔</span>
                  {unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
                </button>
                {notificationsOpen && (
                  <div className="notifications-dropdown">
                    <div className="notifications-header">
                      <strong>Известия</strong>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="notifications-empty">Нямате известия.</div>
                    ) : (
                      <ul className="notifications-list">
                        {notifications.slice(0, 25).map((n) => (
                          <li key={n.id} className={`notification-item ${n.isRead ? '' : 'notification-item-unread'}`}>
                            <div className="notification-item-title">{n.title}</div>
                            <div className="notification-item-message">{n.message}</div>
                            <div className="notification-item-meta">
                              <span>{new Date(n.createdAt).toLocaleString('bg-BG')}</span>
                              {!n.isRead && (
                                <button
                                  type="button"
                                  className="notification-action-link"
                                  onClick={() => void handleMarkRead(n.id)}
                                  disabled={markingReadId === n.id}
                                >
                                  {markingReadId === n.id ? '...' : 'Прочетено'}
                                </button>
                              )}
                            </div>
                            {n.type === 'BOOKING_REQUEST' && n.bookingId && (
                              <div className="notification-actions-row">
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                                  onClick={() => void handleBookingActionFromNotification(n.bookingId!, 'approve')}
                                  disabled={notificationActionBookingId === n.bookingId}
                                >
                                  Одобри
                                </button>
                                <button
                                  type="button"
                                  className="notification-reject-btn"
                                  onClick={() => void handleBookingActionFromNotification(n.bookingId!, 'reject')}
                                  disabled={notificationActionBookingId === n.bookingId}
                                >
                                  Откажи
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/pending-bookings" element={<ProtectedRoute><PendingDriverBookings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/payment-cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminUsers, blockUser, unblockUser, getAdminStats } from '../api/admin'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { UserDto, AdminStatsDto } from '../types/api'

export function Admin() {
  const { user, token } = useAuth()
  const { addToast } = useToast()
  const [users, setUsers] = useState<UserDto[]>([])
  const [stats, setStats] = useState<AdminStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)

  const isAdmin = user?.role === 'ROLE_ADMIN'

  useEffect(() => {
    if (!token || !isAdmin) {
      setLoading(false)
      return
    }
    getAdminUsers(token)
      .then(setUsers)
      .catch((err) => addToast(err instanceof Error ? err.message : 'Грешка при зареждане', 'error'))
      .finally(() => setLoading(false))
    getAdminStats(token)
      .then(setStats)
      .catch(() => {})
  }, [token, isAdmin, addToast])

  async function handleBlock(id: number) {
    if (!token) return
    setActionId(id)
    try {
      const updated = await blockUser(id, token)
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      addToast('Потребителят е блокиран.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка', 'error')
    } finally {
      setActionId(null)
    }
  }

  async function handleUnblock(id: number) {
    if (!token) return
    setActionId(id)
    try {
      const updated = await unblockUser(id, token)
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      addToast('Потребителят е отблокиран.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка', 'error')
    } finally {
      setActionId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="app-main page-content">
        <h1>Админ</h1>
        <p className="form-error">Нямате права за достъп до тази страница.</p>
        <p><Link to="/rides">← Обратно към пътуванията</Link></p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-main">
        <p>Зареждане...</p>
      </div>
    )
  }

  return (
    <div className="app-main page-content">
      <h1>Админ панел</h1>
      <p style={{ marginBottom: 16 }}>
        <Link to="/rides">← Обратно към пътуванията</Link>
      </p>
      {stats != null && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ padding: '12px 20px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
            <strong>Потребители:</strong> {stats.usersCount}
          </div>
          <div style={{ padding: '12px 20px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
            <strong>Пътувания:</strong> {stats.ridesCount}
          </div>
        </div>
      )}
      <h2 style={{ fontSize: '1.2rem', marginBottom: 12 }}>Потребители</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Име</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Имейл</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Роля</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Статус</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px' }}>{u.name}</td>
                <td style={{ padding: '12px 16px' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>{u.role}</td>
                <td style={{ padding: '12px 16px' }}>{u.status}</td>
                <td style={{ padding: '12px 16px' }}>
                  {u.status === 'BANNED' ? (
                    <button
                      type="button"
                      disabled={actionId === u.id}
                      onClick={() => handleUnblock(u.id)}
                      style={{ padding: '6px 12px', cursor: 'pointer', marginRight: 8 }}
                    >
                      {actionId === u.id ? '...' : 'Отблокирай'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionId === u.id || u.id === user?.id}
                      onClick={() => handleBlock(u.id)}
                      style={{ padding: '6px 12px', cursor: 'pointer', color: '#b91c1c' }}
                    >
                      {actionId === u.id ? '...' : 'Блокирай'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

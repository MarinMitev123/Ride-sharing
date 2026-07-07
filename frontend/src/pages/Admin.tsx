import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminUsers,
  blockUser,
  unblockUser,
  getAdminStats,
  getAdminReports,
  dismissAdminReport,
  blockUserFromReport,
} from '../api/admin'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { REASON_LABELS } from '../components/ReportUserModal'
import type { UserDto, AdminStatsDto, UserReportDto } from '../types/api'

type AdminTab = 'users' | 'reports'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Чака преглед',
  REVIEWED: 'Прегледан',
  DISMISSED: 'Отхвърлен',
}

export function Admin() {
  const { user, token } = useAuth()
  const { addToast } = useToast()
  const [tab, setTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<UserDto[]>([])
  const [reports, setReports] = useState<UserReportDto[]>([])
  const [stats, setStats] = useState<AdminStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [reportActionId, setReportActionId] = useState<number | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null)

  const isAdmin = user?.role === 'ROLE_ADMIN'

  useEffect(() => {
    if (!token || !isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getAdminUsers(token),
      getAdminReports(token),
      getAdminStats(token),
    ])
      .then(([usersData, reportsData, statsData]) => {
        setUsers(usersData)
        setReports(reportsData)
        setStats(statsData)
      })
      .catch((err) => addToast(err instanceof Error ? err.message : 'Грешка при зареждане', 'error'))
      .finally(() => setLoading(false))
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

  async function handleDismissReport(id: number) {
    if (!token) return
    setReportActionId(id)
    try {
      const updated = await dismissAdminReport(id, token)
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setStats((prev) =>
        prev ? { ...prev, pendingReportsCount: Math.max(0, prev.pendingReportsCount - 1) } : prev
      )
      addToast('Докладът е отхвърлен.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка', 'error')
    } finally {
      setReportActionId(null)
    }
  }

  async function handleBlockFromReport(report: UserReportDto) {
    if (!token) return
    setReportActionId(report.id)
    try {
      const updated = await blockUserFromReport(report.id, token)
      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)))
      setUsers((prev) =>
        prev.map((u) => (u.id === report.reportedUserId ? { ...u, status: 'BLOCKED' } : u))
      )
      setStats((prev) =>
        prev ? { ...prev, pendingReportsCount: Math.max(0, prev.pendingReportsCount - 1) } : prev
      )
      addToast(`${report.reportedUserName} е блокиран след преглед на доклада.`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка', 'error')
    } finally {
      setReportActionId(null)
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

  const pendingReports = reports.filter((r) => r.status === 'PENDING')

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
          <div style={{ padding: '12px 20px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
            <strong>Чакащи доклади:</strong> {stats.pendingReportsCount}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setTab('users')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: tab === 'users' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            background: tab === 'users' ? '#eff6ff' : '#fff',
            cursor: 'pointer',
            fontWeight: tab === 'users' ? 600 : 400,
          }}
        >
          Потребители
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: tab === 'reports' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            background: tab === 'reports' ? '#eff6ff' : '#fff',
            cursor: 'pointer',
            fontWeight: tab === 'reports' ? 600 : 400,
          }}
        >
          Доклади за блокиране
          {pendingReports.length > 0 && (
            <span style={{ marginLeft: 6, background: '#b91c1c', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12 }}>
              {pendingReports.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'users' && (
        <>
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
                    <td style={{ padding: '12px 16px' }}>{u.status === 'BLOCKED' ? 'Блокиран' : 'Активен'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.status === 'BLOCKED' ? (
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
        </>
      )}

      {tab === 'reports' && (
        <>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 12 }}>Доклади за блокиране</h2>
          {reports.length === 0 ? (
            <p style={{ color: '#64748b' }}>Няма подадени доклади.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: 16,
                    background: '#fff',
                    borderRadius: 8,
                    border: r.status === 'PENDING' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {r.reportedUserName} ({r.reportedUserEmail})
                      </div>
                      <div style={{ fontSize: 14, color: '#64748b' }}>
                        Докладван от: {r.reporterName} ({r.reporterEmail})
                      </div>
                      <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                        Пътуване:{' '}
                        <Link to={`/rides/${r.rideId}`}>
                          {r.rideFromCity} → {r.rideToCity}
                        </Link>
                        {' · '}
                        {formatDateTime(r.createdAt)}
                      </div>
                      <div style={{ fontSize: 14, marginTop: 6 }}>
                        <strong>Причина:</strong> {REASON_LABELS[r.reason]}
                        {' · '}
                        <strong>Статус:</strong> {STATUS_LABELS[r.status] ?? r.status}
                      </div>
                    </div>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={reportActionId === r.id}
                          onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                          style={{ padding: '6px 12px', cursor: 'pointer' }}
                        >
                          {expandedReportId === r.id ? 'Скрий' : 'Прочети'}
                        </button>
                        <button
                          type="button"
                          disabled={reportActionId === r.id}
                          onClick={() => void handleDismissReport(r.id)}
                          style={{ padding: '6px 12px', cursor: 'pointer' }}
                        >
                          Отхвърли
                        </button>
                        <button
                          type="button"
                          disabled={reportActionId === r.id}
                          onClick={() => void handleBlockFromReport(r)}
                          style={{ padding: '6px 12px', cursor: 'pointer', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 6 }}
                        >
                          {reportActionId === r.id ? '...' : 'Блокирай'}
                        </button>
                      </div>
                    )}
                  </div>
                  {(expandedReportId === r.id || r.status !== 'PENDING') && (
                    <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
                      <strong>Обосновка от докладващия:</strong>
                      <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{r.justification}</p>
                      {r.adminNote && (
                        <p style={{ marginTop: 12, color: '#475569' }}>
                          <strong>Бележка на админа:</strong> {r.adminNote}
                        </p>
                      )}
                      {r.reviewedAt && (
                        <p style={{ marginTop: 8, fontSize: 13, color: '#94a3b8' }}>
                          Прегледан на: {formatDateTime(r.reviewedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

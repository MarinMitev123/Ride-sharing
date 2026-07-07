import { useState } from 'react'
import type { ReportReason } from '../types/api'

const REASON_LABELS: Record<ReportReason, string> = {
  HARASSMENT: 'Обидно поведение / тормоз',
  NO_SHOW: 'Не се яви / отмени в последния момент',
  UNSAFE_DRIVING: 'Опасно шофиране',
  FRAUD: 'Измама / проблем с плащане',
  OTHER: 'Друго',
}

interface ReportUserModalProps {
  reportedUserId: number
  reportedUserName: string
  rideId: number
  rideLabel: string
  onClose: () => void
  onSubmit: (reason: ReportReason, justification: string) => Promise<void>
}

export function ReportUserModal({
  reportedUserName,
  rideId,
  rideLabel,
  onClose,
  onSubmit,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<ReportReason>('HARASSMENT')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const text = justification.trim()
    if (text.length < 20) {
      setError('Обосновката трябва да е поне 20 символа.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(reason, text)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при изпращане')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="report-modal-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
          Докладвай профил за блокиране
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Докладвате: <strong>{reportedUserName}</strong>
          <br />
          Пътуване: {rideLabel} (ID {rideId})
        </p>
        <p style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
          Опишете защо смятате, че този профил трябва да бъде блокиран. Администратор ще прегледа
          доклада и ще вземе решение.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
            Причина
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
              }}
            >
              {(Object.keys(REASON_LABELS) as ReportReason[]).map((key) => (
                <option key={key} value={key}>
                  {REASON_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
            Обосновка (задължителна, мин. 20 символа)
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={5}
              required
              minLength={20}
              maxLength={1000}
              placeholder="Опишете какво се е случило и защо профилът трябва да бъде блокиран..."
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                resize: 'vertical',
              }}
            />
          </label>
          {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={submitting} style={{ padding: '8px 16px' }}>
              Отказ
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                background: '#b91c1c',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Изпращане…' : 'Изпрати доклад'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { REASON_LABELS }

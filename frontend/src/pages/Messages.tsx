import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getConversationMessages, getConversations, sendConversationMessage } from '../api/chat'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { ConversationDto, MessageDto } from '../types/api'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Messages() {
  const { token } = useAuth()
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  )
  const queryConversationId = useMemo(() => {
    const raw = searchParams.get('conversationId')
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isInteger(parsed) ? parsed : null
  }, [searchParams])

  const conversationLabel = (conversation: ConversationDto) => {
    const first = conversation.otherUser.firstName?.trim() ?? ''
    const last = conversation.otherUser.lastName?.trim() ?? ''
    const fullName = `${first} ${last}`.trim()
    return fullName || conversation.otherUser.username
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)

    const loadConversations = async () => {
      try {
        const list = await getConversations(token)
        if (cancelled) return
        setConversations(list)
        if (list.length > 0) {
          if (queryConversationId && list.some((c) => c.id === queryConversationId)) {
            setSelectedConversationId(queryConversationId)
          } else if (!selectedConversationId || !list.some((c) => c.id === selectedConversationId)) {
            setSelectedConversationId(list[0].id)
          }
        } else {
          setSelectedConversationId(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadConversations()
    return () => {
      cancelled = true
    }
  }, [token, selectedConversationId, queryConversationId])

  useEffect(() => {
    if (!token || !selectedConversation) {
      setMessages([])
      return
    }
    let cancelled = false

    const refreshConversation = async () => {
      try {
        const data = await getConversationMessages(selectedConversation.id, token)
        if (!cancelled) setMessages(data)
      } catch {
        if (!cancelled) setMessages([])
      }
    }

    void refreshConversation()
    const intervalId = setInterval(() => {
      void refreshConversation()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [token, selectedConversation?.id])

  useEffect(() => {
    if (!chatScrollRef.current) return
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [messages])

  const handleSendMessage = async () => {
    if (!token || !selectedConversation || !chatInput.trim()) return
    setChatSending(true)
    try {
      const sent = await sendConversationMessage(
        selectedConversation.id,
        { content: chatInput.trim() },
        token
      )
      setMessages((prev) => [...prev, sent])
      setChatInput('')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Грешка при изпращане', 'error')
    } finally {
      setChatSending(false)
    }
  }

  if (loading) {
    return <div className="app-main"><p>Зареждане...</p></div>
  }

  return (
    <div className="app-main page-content">
      <h1>Съобщения</h1>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
        <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, maxHeight: 560, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>Още нямате активни разговори.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConversationId(c.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: 8,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: selectedConversationId === c.id ? '#0f766e' : '#fff',
                  color: selectedConversationId === c.id ? '#fff' : '#1f2937',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600 }}>{conversationLabel(c)}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{c.ride.origin} → {c.ride.destination}</div>
              </button>
            ))
          )}
        </aside>

        <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, minHeight: 420 }}>
          {!selectedConversation ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>Изберете разговор отляво.</p>
          ) : (
            <>
              <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700 }}>{conversationLabel(selectedConversation)}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {selectedConversation.ride.origin} → {selectedConversation.ride.destination} · <Link to={`/rides/${selectedConversation.ride.id}`}>Отвори пътуване</Link>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                style={{ maxHeight: 390, overflowY: 'auto', marginBottom: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}
              >
                {messages.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: 14 }}>Няма съобщения в този разговор. Напишете първи.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        marginBottom: 8,
                        display: 'flex',
                        justifyContent: m.senderId === selectedConversation.otherUser.id ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '80%',
                          fontSize: 14,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: m.senderId === selectedConversation.otherUser.id ? '#f1f5f9' : '#ccfbf1',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {m.senderId === selectedConversation.otherUser.id
                            ? conversationLabel(selectedConversation)
                            : 'Ти'}
                        </div>
                        <div>{m.content}</div>
                        <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 12 }}>
                          {formatDateTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Напишете съобщение..."
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                />
                <button type="button" onClick={handleSendMessage} disabled={chatSending || !chatInput.trim()} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                  {chatSending ? 'Изпращане...' : 'Изпрати'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

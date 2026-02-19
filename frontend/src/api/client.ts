const DEFAULT_API_BASE = 'http://localhost:8080'
const API_BASE = import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE

export function getApiUrl(path: string): string {
  const base = String(API_BASE).replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api/v1${p}`
}

export function getApiBaseUrl(): string {
  return String(API_BASE).replace(/\/$/, '') || DEFAULT_API_BASE
}

const getNetworkErrorMessage = (): string =>
  `Не може да се свърже със сървъра (${getApiBaseUrl()}). Уверете се, че бекендът работи.`

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options
  const url = getApiUrl(path)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch (e) {
    if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message.includes('fetch'))) {
      throw new Error(getNetworkErrorMessage())
    }
    throw e
  }
  if (!res.ok) {
    const body = await res.text()
    let message = body
    try {
      const json = JSON.parse(body)
      message = json.message ?? body
    } catch {
      // keep body
    }
    throw new Error(message || `Грешка ${res.status}`)
  }
  const text = await res.text()
  if (!text.trim()) return undefined as T
  return JSON.parse(text) as T
}

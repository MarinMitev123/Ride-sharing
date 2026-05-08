/** Месеци на български – за падащи менюта (ред: ден, месец, година) */
export const MONTHS_BG = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
] as const

export const DAYS_IN_MONTH = (month: number, year: number) => {
  if (month < 1 || month > 12) return 31
  const d = new Date(year, month, 0)
  return d.getDate()
}

/** Преобразува ден, месец, година в YYYY-MM-DD */
export function toApiDate(day: number, month: number, year: number): string {
  const d = String(day).padStart(2, '0')
  const m = String(month).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Преобразува ден, месец, година, час, минути в ISO за API */
export function toApiDateTime(
  day: number,
  month: number,
  year: number,
  hour: number,
  minute: number
): string {
  const date = toApiDate(day, month, year)
  const h = String(hour).padStart(2, '0')
  const min = String(minute).padStart(2, '0')
  return `${date}T${h}:${min}:00`
}

/** Локален календарен ден (не UTC) → YYYY-MM-DD за API/филтри */
export function localDateToYYYYMMDD(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Преобразува YYYY-MM-DD → dd/mm/yyyy за показ в полето */
export function apiDateToBg(apiDate: string): string {
  const [y, m, d] = apiDate.split('-').map(Number)
  if (!d || !m || !y) return ''
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

/** Парсва дата от български формат ДД.ММ.ГГГГ или ДД.М.ГГГГ → YYYY-MM-DD или null */
export function parseBgDate(input: string): string | null {
  const s = input.trim().replace(/\s/g, '')
  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/)
  if (!m) return null
  const [, d, mon, y] = m
  const day = parseInt(d!, 10)
  const month = parseInt(mon!, 10)
  const year = parseInt(y!, 10)
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return null
  const maxDay = DAYS_IN_MONTH(month, year)
  if (day > maxDay) return null
  return toApiDate(day, month, year)
}

/** Парсва "ДД.ММ.ГГГГ" + "ЧЧ:ММ" (или "ЧЧ:ММ:СС") → ISO за API */
export function parseBgDateTime(dateStr: string, timeStr: string): string | null {
  const date = parseBgDate(dateStr)
  if (!date) return null
  const t = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!t) return null
  const hour = parseInt(t[1], 10)
  const minute = parseInt(t[2], 10)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

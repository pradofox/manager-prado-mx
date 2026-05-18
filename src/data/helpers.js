import { CLASS_TYPES } from './seed.js'
import { todayStr, addDays, ymd } from './date.js'

export { addDays, todayStr }

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const classLabel = (t) => CLASS_TYPES[t] || t

export function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('es-MX')
}

// '2026-05-18' -> { dow:'Lun', day:18, month:'may', full:'Lun 18 may', short:'18 may' }
export function parseDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    dow: DOW[d.getDay()],
    day: d.getDate(),
    month: MONTH[d.getMonth()],
    full: `${DOW[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`,
    short: `${d.getDate()} ${MONTH[d.getMonth()]}`,
  }
}

// 'Hoy' / 'Mañana' / 'Ayer' / 'Lun 18 may'
export function relativeDay(dateStr) {
  const t = todayStr()
  if (dateStr === t) return 'Hoy'
  if (dateStr === addDays(t, 1)) return 'Mañana'
  if (dateStr === addDays(t, -1)) return 'Ayer'
  return parseDate(dateStr).full
}

export function effectiveCoachId(session) {
  return session.substitutedBy || session.coachId
}

export function isToday(dateStr) {
  return dateStr === todayStr()
}

export function isPast(dateStr) {
  return dateStr < todayStr()
}

// Estado por defecto de una clase nueva según su fecha.
export function defaultStatus(dateStr) {
  return dateStr < todayStr() ? 'completed' : 'scheduled'
}

// Quincena que contiene a una fecha: [1,15] o [16, fin de mes].
export function quincenaOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const y = d.getFullYear()
  const m = d.getMonth()
  if (d.getDate() <= 15) return { from: ymd(y, m, 1), to: ymd(y, m, 15) }
  const lastDay = new Date(y, m + 1, 0).getDate()
  return { from: ymd(y, m, 16), to: ymd(y, m, lastDay) }
}

export function currentQuincena() {
  return quincenaOf(todayStr())
}

export function previousQuincena() {
  return quincenaOf(addDays(currentQuincena().from, -1))
}

// Mes en curso: primer y último día.
export function currentMonth() {
  const d = new Date(todayStr() + 'T00:00:00')
  const y = d.getFullYear()
  const m = d.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  return { from: ymd(y, m, 1), to: ymd(y, m, lastDay) }
}

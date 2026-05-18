import { CLASS_TYPES, TODAY } from './seed.js'

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const classLabel = (t) => CLASS_TYPES[t] || t

export function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('es-MX')
}

// '2026-05-18' -> { dow: 'Lun', day: 18, month: 'may', full: 'Lun 18 may' }
export function parseDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    dow: DOW[d.getDay()],
    day: d.getDate(),
    month: MONTH[d.getMonth()],
    full: `${DOW[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`,
  }
}

export function effectiveCoachId(session) {
  return session.substitutedBy || session.coachId
}

export function isToday(dateStr) {
  return dateStr === TODAY
}

// Estado por defecto de una clase según su fecha.
export function defaultStatus(dateStr) {
  return dateStr < TODAY ? 'completed' : 'scheduled'
}

// Quincena que contiene a TODAY: [16, fin de mes] o [1, 15].
export function currentQuincena() {
  const d = new Date(TODAY + 'T00:00:00')
  const y = d.getFullYear()
  const m = d.getMonth()
  if (d.getDate() <= 15) {
    return { from: dateStr(y, m, 1), to: dateStr(y, m, 15) }
  }
  const lastDay = new Date(y, m + 1, 0).getDate()
  return { from: dateStr(y, m, 16), to: dateStr(y, m, lastDay) }
}

function dateStr(y, m, day) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

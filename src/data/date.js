// Utilidades de fecha — todo en formato 'YYYY-MM-DD', hora local.

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr() {
  return fmt(new Date())
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return fmt(d)
}

export function ymd(y, m, day) {
  return `${y}-${pad(m + 1)}-${pad(day)}`
}

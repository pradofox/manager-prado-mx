// Datos mock para el prototipo. Sin backend: todo vive en memoria + localStorage.
// Fecha ancla del demo — mantiene una mezcla creíble de clases pasadas y futuras.
export const TODAY = '2026-05-18'

export const CLASS_TYPES = {
  lagree: 'Lagree',
  reformer: 'Reformer',
  hiit: 'HIIT',
  cycling: 'Cycling',
}

export const studios = [
  { id: 's_energee', name: 'Energee', location: 'Polanco' },
  { id: 's_impulse', name: 'Impulse', location: 'Roma Norte' },
  { id: 's_reforma', name: 'Reforma House', location: 'Condesa' },
]

export const coaches = [
  { id: 'c_hugo', name: 'Hugo Prado', whatsapp: '+52 55 1234 5678', primary: true },
  { id: 'c_dani', name: 'Daniela Sosa', whatsapp: '+52 55 2345 6789' },
  { id: 'c_marco', name: 'Marco Reyna', whatsapp: '+52 55 3456 7890' },
  { id: 'c_ana', name: 'Ana Lucía Vega', whatsapp: '+52 55 4567 8901' },
]

// Tarifa por coach × estudio × tipo de clase (MXN por clase).
export const rates = [
  { coachId: 'c_hugo', studioId: 's_energee', classType: 'lagree', rateMxn: 450 },
  { coachId: 'c_hugo', studioId: 's_energee', classType: 'reformer', rateMxn: 420 },
  { coachId: 'c_hugo', studioId: 's_impulse', classType: 'hiit', rateMxn: 350 },
  { coachId: 'c_hugo', studioId: 's_impulse', classType: 'lagree', rateMxn: 400 },
  { coachId: 'c_hugo', studioId: 's_reforma', classType: 'reformer', rateMxn: 500 },
  { coachId: 'c_hugo', studioId: 's_reforma', classType: 'cycling', rateMxn: 380 },
  { coachId: 'c_dani', studioId: 's_energee', classType: 'reformer', rateMxn: 380 },
  { coachId: 'c_dani', studioId: 's_energee', classType: 'lagree', rateMxn: 360 },
  { coachId: 'c_marco', studioId: 's_impulse', classType: 'hiit', rateMxn: 320 },
  { coachId: 'c_ana', studioId: 's_reforma', classType: 'cycling', rateMxn: 340 },
  { coachId: 'c_ana', studioId: 's_reforma', classType: 'reformer', rateMxn: 400 },
]

export function rateFor(coachId, studioId, classType) {
  const r = rates.find(
    (x) => x.coachId === coachId && x.studioId === studioId && x.classType === classType,
  )
  return r ? r.rateMxn : null
}

// Plantilla semanal recurrente. dow: 0=Dom .. 6=Sab
const template = [
  // Energee — Polanco
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'lagree', dow: 1, time: '07:00', room: 'Sala A' },
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'reformer', dow: 1, time: '19:00', room: 'Sala B' },
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'lagree', dow: 3, time: '07:00', room: 'Sala A' },
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'lagree', dow: 5, time: '18:00', room: 'Sala A' },
  { studioId: 's_energee', coachId: 'c_dani', classType: 'reformer', dow: 2, time: '08:00', room: 'Sala B' },
  { studioId: 's_energee', coachId: 'c_dani', classType: 'lagree', dow: 4, time: '19:00', room: 'Sala A' },
  // Impulse — Roma Norte
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'hiit', dow: 1, time: '09:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'hiit', dow: 3, time: '09:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'lagree', dow: 3, time: '20:00', room: 'Studio 2' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'hiit', dow: 5, time: '09:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_marco', classType: 'hiit', dow: 2, time: '18:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_marco', classType: 'hiit', dow: 4, time: '09:00', room: 'Studio 1' },
  // Reforma House — Condesa
  { studioId: 's_reforma', coachId: 'c_hugo', classType: 'reformer', dow: 2, time: '07:00', room: 'Loft' },
  { studioId: 's_reforma', coachId: 'c_hugo', classType: 'reformer', dow: 4, time: '07:00', room: 'Loft' },
  { studioId: 's_reforma', coachId: 'c_hugo', classType: 'cycling', dow: 6, time: '10:00', room: 'Ride Room' },
  { studioId: 's_reforma', coachId: 'c_ana', classType: 'cycling', dow: 1, time: '18:00', room: 'Ride Room' },
  { studioId: 's_reforma', coachId: 'c_ana', classType: 'reformer', dow: 4, time: '18:00', room: 'Loft' },
  { studioId: 's_reforma', coachId: 'c_ana', classType: 'reformer', dow: 6, time: '09:00', room: 'Loft' },
]

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Genera sesiones para el rango [from, to] a partir de la plantilla semanal.
function generateSessions(from, to) {
  const out = []
  const start = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    const dateStr = fmtDate(d)
    template.forEach((t, i) => {
      if (t.dow !== dow) return
      out.push({
        id: `${dateStr}_${i}`,
        studioId: t.studioId,
        coachId: t.coachId,
        classType: t.classType,
        date: dateStr,
        time: t.time,
        durationMin: 50,
        room: t.room,
        status: dateStr < TODAY ? 'completed' : 'scheduled',
        substitutedBy: null,
        notes: '',
      })
    })
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

export function buildSeedSessions() {
  const sessions = generateSessions('2026-05-04', '2026-05-31')
  // Una sustitución de ejemplo: una clase pasada de Hugo cubierta por Daniela.
  const sub = sessions.find((s) => s.coachId === 'c_hugo' && s.studioId === 's_energee' && s.status === 'completed')
  if (sub) {
    sub.status = 'substituted'
    sub.substitutedBy = 'c_dani'
    sub.notes = 'Hugo fuera de la ciudad — cubrió Daniela.'
  }
  return sessions
}

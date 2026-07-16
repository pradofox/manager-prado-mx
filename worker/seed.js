// Datos de arranque del demo. Vive en el Worker: el servidor siembra la BD la
// primera vez (o al resetear), anclado a la fecha local que envía el cliente.
import { addDays } from '../src/data/date.js'
import { snapshotRate } from '../src/data/money.js'

const studios = [
  { id: 's_energee', name: 'Energee', location: 'Polanco' },
  { id: 's_impulse', name: 'Impulse', location: 'Roma Norte' },
  { id: 's_reforma', name: 'Reforma House', location: 'Condesa' },
]

const coaches = [
  { id: 'c_hugo', name: 'Hugo Prado', whatsapp: '+52 55 1234 5678', email: '', isPrimary: 1 },
  { id: 'c_dani', name: 'Daniela Sosa', whatsapp: '+52 55 2345 6789', email: '', isPrimary: 0 },
  { id: 'c_marco', name: 'Marco Reyna', whatsapp: '+52 55 3456 7890', email: '', isPrimary: 0 },
  { id: 'c_ana', name: 'Ana Lucía Vega', whatsapp: '+52 55 4567 8901', email: '', isPrimary: 0 },
]

// Tarifas con vigencia abierta desde siempre.
const RATE_BASE = [
  ['c_hugo', 's_energee', 'lagree', 450],
  ['c_hugo', 's_energee', 'reformer', 420],
  ['c_hugo', 's_impulse', 'hiit', 350],
  ['c_hugo', 's_impulse', 'lagree', 400],
  ['c_hugo', 's_reforma', 'reformer', 500],
  ['c_hugo', 's_reforma', 'cycling', 380],
  ['c_dani', 's_energee', 'reformer', 380],
  ['c_dani', 's_energee', 'lagree', 360],
  ['c_marco', 's_impulse', 'hiit', 320],
  ['c_ana', 's_reforma', 'cycling', 340],
  ['c_ana', 's_reforma', 'reformer', 400],
]

// Plantilla semanal recurrente. dow: 0=Dom .. 6=Sab
const template = [
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'lagree', dow: 1, time: '07:00', room: 'Sala A' },
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'reformer', dow: 1, time: '19:00', room: 'Sala B' },
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'lagree', dow: 3, time: '07:00', room: 'Sala A' },
  { studioId: 's_energee', coachId: 'c_hugo', classType: 'lagree', dow: 5, time: '18:00', room: 'Sala A' },
  { studioId: 's_energee', coachId: 'c_dani', classType: 'reformer', dow: 2, time: '08:00', room: 'Sala B' },
  { studioId: 's_energee', coachId: 'c_dani', classType: 'lagree', dow: 4, time: '19:00', room: 'Sala A' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'hiit', dow: 1, time: '09:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'hiit', dow: 3, time: '09:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'lagree', dow: 3, time: '20:00', room: 'Studio 2' },
  { studioId: 's_impulse', coachId: 'c_hugo', classType: 'hiit', dow: 5, time: '09:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_marco', classType: 'hiit', dow: 2, time: '18:00', room: 'Studio 1' },
  { studioId: 's_impulse', coachId: 'c_marco', classType: 'hiit', dow: 4, time: '09:00', room: 'Studio 1' },
  { studioId: 's_reforma', coachId: 'c_hugo', classType: 'reformer', dow: 2, time: '07:00', room: 'Loft' },
  { studioId: 's_reforma', coachId: 'c_hugo', classType: 'reformer', dow: 4, time: '07:00', room: 'Loft' },
  { studioId: 's_reforma', coachId: 'c_hugo', classType: 'cycling', dow: 6, time: '10:00', room: 'Ride Room' },
  { studioId: 's_reforma', coachId: 'c_ana', classType: 'cycling', dow: 1, time: '18:00', room: 'Ride Room' },
  { studioId: 's_reforma', coachId: 'c_ana', classType: 'reformer', dow: 4, time: '18:00', room: 'Loft' },
  { studioId: 's_reforma', coachId: 'c_ana', classType: 'reformer', dow: 6, time: '09:00', room: 'Loft' },
]

// Construye el dataset seed anclado a `today` ('YYYY-MM-DD'), con snapshots de
// pago ya congelados para las clases pasadas (para que Pagos funcione al instante).
export function buildSeedData(today, nowIso) {
  const rates = RATE_BASE.map(([coachId, studioId, classType, rateMxn], i) => ({
    id: `r_seed_${i}`,
    coachId,
    studioId,
    classType,
    rateMxn,
    effectiveFrom: '2000-01-01',
    effectiveTo: null,
  }))

  const sessions = []
  const from = addDays(today, -14)
  const to = addDays(today, 28)
  let date = from
  let guard = 0
  while (date <= to && guard++ < 400) {
    const dow = new Date(date + 'T00:00:00').getDay()
    template.forEach((t, ti) => {
      if (t.dow !== dow) return
      const past = date < today
      const session = {
        id: `s_seed_${date}_${ti}`,
        studioId: t.studioId,
        coachId: t.coachId,
        classType: t.classType,
        date,
        time: t.time,
        durationMin: 50,
        room: t.room,
        status: past ? 'completed' : 'scheduled',
        substitutedBy: null,
        paidRateMxn: null,
        seriesId: null,
        notes: '',
      }
      if (past) session.paidRateMxn = snapshotRate(session, rates)
      sessions.push(session)
    })
    date = addDays(date, 1)
  }

  // Una sustitución de ejemplo: la primera clase pasada de Hugo en Energee.
  const sub = sessions.find(
    (s) => s.coachId === 'c_hugo' && s.studioId === 's_energee' && s.status === 'completed',
  )
  if (sub) {
    sub.status = 'substituted'
    sub.substitutedBy = 'c_dani'
    sub.notes = 'Hugo fuera de la ciudad — cubrió Daniela.'
    sub.paidRateMxn = snapshotRate(sub, rates) // recalcula con el coach efectivo (Daniela)
  }

  sessions.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const now = nowIso
  return {
    studios: studios.map((s) => ({ ...s, createdAt: now })),
    coaches: coaches.map((c) => ({ ...c, createdAt: now })),
    rates,
    sessions: sessions.map((s) => ({ ...s, createdAt: now })),
  }
}

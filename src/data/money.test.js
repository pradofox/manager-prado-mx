import { describe, it, expect } from 'vitest'
import { resolveRate, computePay, snapshotRate, effectiveCoachId, isPaid } from './money.js'
import { quincenaOf } from './helpers.js'

const rates = [
  // Tarifa de Hugo·Energee·lagree: $450 hasta el 31 may, luego $500 desde el 1 jun.
  { coachId: 'c_hugo', studioId: 's_e', classType: 'lagree', rateMxn: 450, effectiveFrom: '2000-01-01', effectiveTo: '2026-05-31' },
  { coachId: 'c_hugo', studioId: 's_e', classType: 'lagree', rateMxn: 500, effectiveFrom: '2026-06-01', effectiveTo: null },
  // Tarifa de Daniela (la sustituta) en el mismo estudio·tipo.
  { coachId: 'c_dani', studioId: 's_e', classType: 'lagree', rateMxn: 360, effectiveFrom: '2000-01-01', effectiveTo: null },
]

describe('resolveRate — tarifa por fecha (vigencia)', () => {
  it('devuelve la tarifa vigente antes del cambio', () => {
    expect(resolveRate(rates, 'c_hugo', 's_e', 'lagree', '2026-05-20')).toBe(450)
  })
  it('devuelve la nueva tarifa después del cambio', () => {
    expect(resolveRate(rates, 'c_hugo', 's_e', 'lagree', '2026-06-15')).toBe(500)
  })
  it('respeta el límite exacto effectiveTo/effectiveFrom', () => {
    expect(resolveRate(rates, 'c_hugo', 's_e', 'lagree', '2026-05-31')).toBe(450)
    expect(resolveRate(rates, 'c_hugo', 's_e', 'lagree', '2026-06-01')).toBe(500)
  })
  it('null si no hay tarifa para la combinación', () => {
    expect(resolveRate(rates, 'c_hugo', 's_e', 'hiit', '2026-06-01')).toBe(null)
  })
})

describe('computePay — snapshot manda sobre tarifa vigente', () => {
  const base = { coachId: 'c_hugo', studioId: 's_e', classType: 'lagree', date: '2026-05-20', status: 'completed', substitutedBy: null }

  it('usa la tarifa por fecha si NO hay snapshot (proyección)', () => {
    expect(computePay({ ...base, paidRateMxn: null }, rates)).toBe(450)
  })
  it('usa el snapshot congelado aunque la tarifa vigente cambie', () => {
    // Clase de mayo dada a $450; hoy la tarifa es $500. Debe seguir pagando $450.
    expect(computePay({ ...base, paidRateMxn: 450 }, rates)).toBe(450)
  })
  it('una clase futura proyecta con la tarifa nueva', () => {
    const fut = { ...base, date: '2026-06-10', status: 'scheduled', paidRateMxn: null }
    expect(computePay(fut, rates)).toBe(500)
  })
})

describe('sustitución — el pago sigue al coach efectivo', () => {
  it('effectiveCoachId devuelve el sustituto', () => {
    expect(effectiveCoachId({ coachId: 'c_hugo', substitutedBy: 'c_dani' })).toBe('c_dani')
    expect(effectiveCoachId({ coachId: 'c_hugo', substitutedBy: null })).toBe('c_hugo')
  })
  it('snapshotRate de una clase sustituida usa la tarifa de la sustituta', () => {
    const s = { coachId: 'c_hugo', studioId: 's_e', classType: 'lagree', date: '2026-05-20', substitutedBy: 'c_dani', status: 'substituted' }
    expect(snapshotRate(s, rates)).toBe(360) // tarifa de Daniela, no la de Hugo
  })
})

describe('isPaid', () => {
  it('completed y substituted cuentan como dadas', () => {
    expect(isPaid({ status: 'completed' })).toBe(true)
    expect(isPaid({ status: 'substituted' })).toBe(true)
    expect(isPaid({ status: 'scheduled' })).toBe(false)
    expect(isPaid({ status: 'cancelled' })).toBe(false)
  })
})

describe('quincenaOf — periodos mexicanos', () => {
  it('primera quincena', () => {
    expect(quincenaOf('2026-05-08')).toEqual({ from: '2026-05-01', to: '2026-05-15' })
  })
  it('segunda quincena termina en fin de mes', () => {
    expect(quincenaOf('2026-05-20')).toEqual({ from: '2026-05-16', to: '2026-05-31' })
  })
  it('febrero: segunda quincena hasta el 28', () => {
    expect(quincenaOf('2026-02-25')).toEqual({ from: '2026-02-16', to: '2026-02-28' })
  })
})

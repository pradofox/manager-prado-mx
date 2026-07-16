// Lógica de dinero — funciones puras, sin React ni APIs de navegador.
// Se comparte entre el Worker (snapshot autoritativo), el frontend (proyección
// y UI optimista) y los tests. Es la única fuente de verdad del cálculo de pago.
//
// Formas de dato (camelCase, como habla el API):
//   rate    = { coachId, studioId, classType, rateMxn, effectiveFrom, effectiveTo|null }
//   session = { coachId, studioId, classType, date, status, substitutedBy|null, paidRateMxn|null }

// El coach que EFECTIVAMENTE da la clase (el sustituto si lo hay).
export function effectiveCoachId(session) {
  return session.substitutedBy || session.coachId
}

// Tarifa vigente en `date` para coach × estudio × tipo.
// Vigencia: effectiveFrom <= date <= effectiveTo (effectiveTo null = abierta).
// Si hay traslape, gana la de effectiveFrom más reciente. Devuelve número o null.
export function resolveRate(rates, coachId, studioId, classType, date) {
  let best = null
  for (const r of rates) {
    if (r.coachId !== coachId || r.studioId !== studioId || r.classType !== classType) continue
    if (r.effectiveFrom > date) continue
    if (r.effectiveTo && date > r.effectiveTo) continue
    if (best === null || r.effectiveFrom > best.effectiveFrom) best = r
  }
  return best === null ? null : best.rateMxn
}

// ¿La clase ya se dio? (pago congelado)
export function isPaid(session) {
  return session.status === 'completed' || session.status === 'substituted'
}

// Pago de una sesión.
// - Si tiene snapshot (paidRateMxn), ESE manda: una tarifa cambiada después no
//   altera lo ya devengado.
// - Si no, proyecta con la tarifa vigente a la fecha de la clase para el coach efectivo.
export function computePay(session, rates) {
  if (session.paidRateMxn != null) return session.paidRateMxn
  return resolveRate(
    rates,
    effectiveCoachId(session),
    session.studioId,
    session.classType,
    session.date,
  )
}

// Calcula el snapshot que debe congelarse al marcar una clase como dada.
// (Se usa en el Worker al pasar a completed/substituted.)
export function snapshotRate(session, rates) {
  return resolveRate(
    rates,
    effectiveCoachId(session),
    session.studioId,
    session.classType,
    session.date,
  )
}

// Deterministic clinical rules used by the clinician views. Scores and dose maths are
// calculated here, not by Claude, so they are reproducible and work offline.
// No DOM access: this file is also imported by the node:test suite.

/* ---------- NEWS2 (Royal College of Physicians, 2017; SpO2 scale 1) ---------- */
const band = (v, rules) => rules.find(([test]) => test(v))[1];

export function news2Parts(o) {
  return {
    rr: band(o.rr, [[(v) => v <= 8, 3], [(v) => v <= 11, 1], [(v) => v <= 20, 0], [(v) => v <= 24, 2], [() => true, 3]]),
    spo2: band(o.spo2, [[(v) => v <= 91, 3], [(v) => v <= 93, 2], [(v) => v <= 95, 1], [() => true, 0]]),
    oxygen: o.oxygen ? 2 : 0,
    sbp: band(o.sbp, [[(v) => v <= 90, 3], [(v) => v <= 100, 2], [(v) => v <= 110, 1], [(v) => v <= 219, 0], [() => true, 3]]),
    hr: band(o.hr, [[(v) => v <= 40, 3], [(v) => v <= 50, 1], [(v) => v <= 90, 0], [(v) => v <= 110, 1], [(v) => v <= 130, 2], [() => true, 3]]),
    avpu: o.avpu === "A" ? 0 : 3,
    temp: band(o.temp, [[(v) => v <= 35.0, 3], [(v) => v <= 36.0, 1], [(v) => v <= 38.0, 0], [(v) => v <= 39.0, 1], [() => true, 2]]),
  };
}

export function news2(o) {
  const parts = news2Parts(o);
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  const redScore = Object.values(parts).some((p) => p === 3);
  return { parts, total, redScore, response: news2Response(total, redScore) };
}

// Clinical response thresholds from the NEWS2 chart.
export function news2Response(total, redScore) {
  if (total >= 7) return { level: "emergency", label: "Emergency response", frequency: "Continuous monitoring", action: "Emergency assessment by a critical-care competent team; consider transfer to a higher level of care." };
  if (total >= 5) return { level: "urgent", label: "Urgent response", frequency: "At least hourly", action: "Registered nurse informs the medical team immediately; urgent review by a clinician competent in acute illness." };
  if (redScore) return { level: "urgent-ward", label: "Urgent ward-based response", frequency: "At least hourly", action: "A single parameter scores 3: registered nurse informs the medical team, who decide whether escalation is needed." };
  if (total >= 1) return { level: "low", label: "Low: ward-based response", frequency: "At least every 4–6 hours", action: "Registered nurse assesses and decides whether to increase monitoring or escalate." };
  return { level: "none", label: "Routine", frequency: "At least every 12 hours", action: "Continue routine monitoring." };
}

/* ---------- Paediatric dose check (local formulary for the demo) ---------- */
export const FORMULARY = {
  paracetamol: { name: "Paracetamol", mgPerKgDose: 15, maxMgPerKgDay: 60, maxMgDose: 1000, maxMgDay: 4000 },
  ibuprofen: { name: "Ibuprofen", mgPerKgDoseMin: 5, mgPerKgDose: 10, maxMgPerKgDay: 30, maxMgDose: 400, holdIfDehydrated: true },
  amoxicillin: { name: "Amoxicillin (high dose, otitis media)", mgPerKgDayMin: 80, mgPerKgDayMax: 90, dosesPerDay: 2, durationDays: (age) => (age < 2 ? 10 : 7) },
  ondansetron: { name: "Ondansetron", bands: [[8, 15, 2], [15, 30, 4], [30, Infinity, 8]] },
  codeine: { name: "Codeine-containing product", minAge: 12 },
  ors: { name: "Oral rehydration solution", mlPerKgMild: 50, hours: 4 },
};

export const PER_DAY = { "every 4 hours": 6, "every 6 hours": 4, "every 8 hours": 3, "twice daily": 2, "three times daily": 3, "once daily": 1, once: 1, "at night": 1 };
const round1 = (n) => Math.round(n * 10) / 10;

// Returns the mg per dose for an order (liquid volume × strength, or a direct mg dose).
export function mgPerDose(order) {
  if (order.form === "liquid") return order.strengthMg == null ? null : (order.volumeMl * order.strengthMg) / order.strengthMl;
  return order.doseMg ?? null;
}

// Checks one order against the formulary. Returns { verdict: ok|warn|error, mgDose, mgKgDose, mgKgDay, recommended, findings[], fix }.
export function checkOrder(order, { weightKg, ageYears, dehydrated }) {
  const f = FORMULARY[order.drug];
  const perDay = PER_DAY[order.frequency] ?? 1;
  const mg = mgPerDose(order);
  const out = { verdict: "ok", mgDose: mg, mgKgDose: mg != null ? round1(mg / weightKg) : null, mgKgDay: mg != null ? round1((mg * perDay) / weightKg) : null, recommended: "", findings: [], fix: null };
  const flag = (verdict, text) => {
    out.findings.push(text);
    if (verdict === "error" || (verdict === "warn" && out.verdict === "ok")) out.verdict = verdict;
  };
  const mlFor = (mgDose) => round1((mgDose * order.strengthMl) / order.strengthMg);

  switch (order.drug) {
    case "paracetamol": {
      const target = Math.min(f.mgPerKgDose * weightKg, f.maxMgDose);
      out.recommended = `${f.mgPerKgDose} mg/kg/dose (${round1(target)} mg); max ${f.maxMgPerKgDay} mg/kg/day`;
      const ratio = mg / target;
      if (ratio > 1.1) flag("error", `${round1(ratio)}× the recommended dose (${round1(mg)} mg vs ${round1(target)} mg)`);
      if (out.mgKgDay > f.maxMgPerKgDay) flag("error", `${out.mgKgDay} mg/kg/day exceeds the ${f.maxMgPerKgDay} mg/kg/day maximum`);
      const fixMg = Math.round(target / 10) * 10;
      out.fix = { volumeMl: mlFor(fixMg), frequency: "every 6 hours", note: `${fixMg} mg = ${mlFor(fixMg)} mL, maximum 4 doses in 24 hours` };
      break;
    }
    case "ibuprofen": {
      const target = Math.min(f.mgPerKgDose * weightKg, f.maxMgDose);
      out.recommended = `${f.mgPerKgDoseMin}–${f.mgPerKgDose} mg/kg/dose; max ${f.maxMgPerKgDay} mg/kg/day`;
      if (mg > target * 1.1) flag("error", `Above ${f.mgPerKgDose} mg/kg per dose (${round1(mg)} mg vs ${round1(target)} mg)`);
      if (out.mgKgDay > f.maxMgPerKgDay) flag("error", `${out.mgKgDay} mg/kg/day exceeds ${f.maxMgPerKgDay} mg/kg/day`);
      if (dehydrated) flag("warn", "Withhold while dehydrated (kidney risk); use paracetamol until drinking and passing urine");
      out.fix = { volumeMl: mlFor(Math.floor(target / 10) * 10), frequency: "every 8 hours", note: dehydrated ? "Only once drinking normally and passing urine" : "When needed, maximum 3 doses in 24 hours" };
      break;
    }
    case "amoxicillin": {
      const lo = f.mgPerKgDayMin * weightKg;
      const hi = f.mgPerKgDayMax * weightKg;
      const day = mg * perDay;
      out.recommended = `${f.mgPerKgDayMin}–${f.mgPerKgDayMax} mg/kg/day in ${f.dosesPerDay} doses (${round1(hi / f.dosesPerDay)} mg twice daily)`;
      if (day > hi * 1.1) flag("error", `${out.mgKgDay} mg/kg/day is above the ${f.mgPerKgDayMax} mg/kg/day high-dose range`);
      else if (day > hi) flag("warn", `${out.mgKgDay} mg/kg/day is slightly above ${f.mgPerKgDayMax} mg/kg/day`);
      else if (day < lo) flag("warn", `${out.mgKgDay} mg/kg/day is below the ${f.mgPerKgDayMin} mg/kg/day high-dose range`);
      if (perDay !== f.dosesPerDay) flag("warn", `High-dose amoxicillin is given twice daily (written ${order.frequency})`);
      const days = f.durationDays(ageYears);
      if (order.durationDays && order.durationDays !== days) flag("warn", `${days} days is the course for this age (written ${order.durationDays})`);
      const fixMg = round1(hi / f.dosesPerDay);
      out.fix = { volumeMl: mlFor(fixMg), frequency: "twice daily", durationDays: days, note: `${fixMg} mg = ${mlFor(fixMg)} mL twice daily for ${days} days` };
      break;
    }
    case "ondansetron": {
      const bandFor = f.bands.find(([min, max]) => weightKg >= min && weightKg < max);
      const target = bandFor ? bandFor[2] : null;
      out.recommended = target ? `${bandFor[0]}–${bandFor[1] === Infinity ? "" : bandFor[1]} kg band: ${target} mg single dose` : "Under 8 kg: seek specialist advice";
      if (target == null) flag("error", "Weight below the ondansetron weight bands");
      else if (mg > target) flag("error", `${round1(mg / target)}× the weight-band dose (${mg} mg vs ${target} mg)`);
      out.fix = target ? { doseMg: target, frequency: "once", note: `${target} mg once` } : null;
      break;
    }
    case "codeine": {
      out.recommended = `Contraindicated under ${f.minAge} years`;
      if (ageYears < f.minAge) flag("error", `Contraindicated under ${f.minAge} years (breathing suppression in ultra-rapid metabolisers)`);
      out.fix = { remove: true, note: "Remove from the prescription" };
      break;
    }
    case "ors": {
      const ml = f.mlPerKgMild * weightKg;
      out.recommended = `Mild dehydration: ${f.mlPerKgMild} mL/kg over ${f.hours} h (${ml} mL)`;
      if (dehydrated && !order.totalMl) flag("warn", `Specify a volume: ${ml} mL over ${f.hours} hours`);
      out.fix = { totalMl: ml, note: `${ml} mL over ${f.hours} hours, 5–10 mL every 1–2 minutes` };
      break;
    }
  }
  return out;
}

/* ---------- Apixaban dose criteria (reduced dose needs ≥2 of 3) ---------- */
export function apixabanCriteria({ ageYears, weightKg, creatinine }) {
  const met = [ageYears >= 80 && "age ≥80", weightKg <= 60 && "weight ≤60 kg", creatinine >= 1.5 && "creatinine ≥1.5 mg/dL"].filter(Boolean);
  return { met, reducedDoseIndicated: met.length >= 2, correctDose: met.length >= 2 ? "2.5 mg twice daily" : "5 mg twice daily" };
}

/* ---------- Clock helpers (HH:MM on one day) ---------- */
export const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.round(min) % 60).padStart(2, "0")}`;
export const fmtDur = (min) => (min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")} min`);

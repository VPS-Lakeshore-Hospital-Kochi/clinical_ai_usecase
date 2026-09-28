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

/* ---------- Rule-based medicine check (demo rule set) ---------- */
// meds: [{ name, cls: ["nsaid" | "acei" | "arb" | "loop" | "thiazide" | "antiplatelet" | "metformin" | "betablocker" | ...] }]
// ctx: { k, creatinine, creatinineBaseline, spo2, heartFailure }
export function medicineCheck(meds, ctx = {}) {
  const has = (c) => meds.filter((m) => m.cls.includes(c));
  const names = (list) => list.map((m) => m.name).join(" + ");
  const out = [];
  const nsaid = has("nsaid"), raas = [...has("acei"), ...has("arb")], diuretic = [...has("loop"), ...has("thiazide")];
  if (nsaid.length && raas.length && diuretic.length) out.push({ severity: "High", title: `${names([...nsaid, ...raas, ...diuretic])}`, detail: "NSAID + ACE inhibitor/ARB + diuretic (\"triple whammy\"): acute kidney injury and fluid retention risk" });
  if (nsaid.length && ctx.heartFailure) out.push({ severity: "High", title: `${names(nsaid)} in heart failure`, detail: "NSAIDs cause sodium and water retention and can precipitate decompensation" });
  if (nsaid.length && has("antiplatelet").length) out.push({ severity: "Moderate", title: `${names([...nsaid, ...has("antiplatelet")])}`, detail: "GI bleeding risk; NSAIDs may reduce aspirin's antiplatelet effect" });
  const rise = ctx.creatinine != null && ctx.creatinineBaseline != null ? Math.round((ctx.creatinine - ctx.creatinineBaseline) * 100) / 100 : 0;
  if (has("metformin").length && ((ctx.spo2 != null && ctx.spo2 < 92) || rise >= 0.2)) out.push({ severity: "High", title: `${names(has("metformin"))} during acute illness`, detail: `Lactic acidosis risk (${[ctx.spo2 < 92 && `SpO2 ${ctx.spo2}%`, rise >= 0.2 && `creatinine ${ctx.creatinineBaseline} → ${ctx.creatinine}`].filter(Boolean).join(", ")})` });
  if (raas.length && ctx.k >= 5.0) out.push({ severity: "Moderate", title: `${names(raas)} with K ${ctx.k}`, detail: "Hyperkalaemia risk; recheck potassium and renal function" });
  return out;
}

/* ---------- Imaging rules ---------- */
// ACR incidental adrenal mass: unenhanced attenuation ≤10 HU = lipid-rich adenoma.
export function adrenalRule(hu) {
  return hu <= 10
    ? { label: "Lipid-rich adenoma (≤10 HU unenhanced)", followUp: "Benign: no imaging follow-up" }
    : { label: "Indeterminate (>10 HU unenhanced)", followUp: "Adrenal-protocol washout CT or chemical-shift MRI" };
}

// Finds verbatim quotes in a text; returns non-overlapping [start, end, tag] ranges in order.
export function locateQuotes(text, items) {
  const ranges = [];
  items.forEach((quotes, tag) => {
    for (const q of quotes) {
      const start = text.indexOf(q);
      if (start >= 0) ranges.push([start, start + q.length, tag]);
    }
  });
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges.filter((r, i) => i === 0 || r[0] >= ranges[i - 1][1]);
}

/* ---------- Colon cancer stage group (AJCC 8th edition) ---------- */
export function colonStage(T, N, M) {
  if (M === "M1a") return "IVA";
  if (M === "M1b") return "IVB";
  if (M === "M1c") return "IVC";
  if (N === "N0") return { Tis: "0", T1: "I", T2: "I", T3: "IIA", T4a: "IIB", T4b: "IIC" }[T];
  const n1 = N === "N1a" || N === "N1b" || N === "N1c" || N === "N1";
  if (T === "T4b") return "IIIC";
  if (n1) return ["T1", "T2"].includes(T) ? "IIIA" : "IIIB";
  if (N === "N2a") return T === "T1" ? "IIIA" : T === "T4a" ? "IIIC" : "IIIB";
  if (N === "N2b") return ["T1", "T2"].includes(T) ? "IIIB" : "IIIC";
  return "Unknown";
}

// Adjuvant duration for stage III colon cancer (IDEA collaboration): low risk T1–3 N1, high risk T4 or N2.
export function adjuvantGuide(T, N, M) {
  const stage = colonStage(T, N, M);
  if (stage.startsWith("IV")) return "Metastatic: systemic therapy plan, not adjuvant";
  if (!stage.startsWith("III")) return stage.startsWith("II") ? "Stage II: adjuvant therapy only if high-risk features; discuss" : "No adjuvant chemotherapy";
  const high = T.startsWith("T4") || N.startsWith("N2");
  return high ? "High-risk stage III: CAPOX 6 months (or FOLFOX 6 months)" : "Low-risk stage III: CAPOX 3 months (IDEA)";
}

/* ---------- ICU calculations ---------- */
export const anionGap = ({ na, cl, hco3 }) => na - (cl + hco3);
// KDIGO AKI stage from the creatinine ratio to baseline (≥4.0 mg/dL also counts as stage 3).
export function kdigoStage(creatinine, baseline) {
  const ratio = creatinine / baseline;
  const stage = creatinine >= 4 || ratio >= 3 ? 3 : ratio >= 2 ? 2 : ratio >= 1.5 || creatinine - baseline >= 0.3 ? 1 : 0;
  return { ratio: Math.round(ratio * 100) / 100, stage };
}
export const dkaInsulinRate = (weightKg) => Math.round(weightKg * 0.1 * 10) / 10; // fixed-rate 0.1 U/kg/h
export const K_INSULIN_THRESHOLD = 3.3;

/* ---------- Insurance: room-rent proportionate deduction (policy clause 5.1 pattern) ---------- */
// heads: [{ key, label, amount, rule: "room" | "icu" | "proportional" | "exempt" | "excluded" }]
export function preauthEstimate({ heads, roomRate, roomDays, sumInsured, bonus = 0, includeBonus = false, roomPct = 0.01, icuPct = 0.02 }) {
  const base = sumInsured + (includeBonus ? bonus : 0);
  const roomCap = base * roomPct;
  const icuCap = base * icuPct;
  const proportion = roomRate > roomCap ? roomCap / roomRate : 1;
  const rows = heads.map((h) => {
    let payable = h.amount;
    let note = "";
    if (h.rule === "room") { payable = Math.min(roomRate, roomCap) * roomDays; note = roomRate > roomCap ? `Capped at ₹${roomCap.toLocaleString("en-IN")}/day` : "Within cap"; }
    if (h.rule === "icu") { payable = Math.min(h.amount, icuCap * (h.days ?? 1)); note = h.amount / (h.days ?? 1) > icuCap ? "Capped" : `Within ₹${icuCap.toLocaleString("en-IN")} cap`; }
    if (h.rule === "proportional") { payable = Math.round(h.amount * proportion); note = proportion < 1 ? `× ${(proportion * 100).toFixed(1)}% (proportionate)` : "Payable in full"; }
    if (h.rule === "exempt") note = "Exempt from the proportion";
    if (h.rule === "excluded") { payable = 0; note = "Excluded (non-medical consumables)"; }
    return { ...h, amount: h.rule === "room" ? roomRate * roomDays : h.amount, payable, note };
  });
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const payable = rows.reduce((a, r) => a + r.payable, 0);
  return { rows, roomCap, icuCap, proportion, total, payable, patientShare: total - payable };
}

/* ---------- Unit conversions and eGFR ---------- */
export const hba1cIfccToNgsp = (mmolMol) => Math.round((mmolMol / 10.929 + 2.15) * 10) / 10;
export const glucoseMmolToMg = (mmol) => Math.round(mmol * 18.016);
export const creatinineUmolToMg = (umol) => Math.round((umol / 88.4) * 100) / 100;
// CKD-EPI 2021 (race-free) creatinine equation, mL/min/1.73 m².
export function egfrCkdEpi2021(creatinineMgDl, age, sex) {
  const f = sex === "female";
  const k = f ? 0.7 : 0.9;
  const a = f ? -0.241 : -0.302;
  const r = creatinineMgDl / k;
  return Math.round(142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age * (f ? 1.012 : 1));
}

// Splits the outside-records bundle into lettered documents: [{ letter, title, text }].
export function splitDocuments(bundle) {
  const re = /DOCUMENT ([A-Z]): ([^\n]+)\n([\s\S]*?)(?=\n\nDOCUMENT [A-Z]:|\n\nHospital record|$)/g;
  const docs = [];
  for (const m of bundle.matchAll(re)) docs.push({ letter: m[1], title: m[2].trim(), text: m[3].trim() });
  const rec = bundle.match(/Hospital record[^\n]*[\s\S]*$/);
  if (rec) docs.push({ letter: "Record", title: "Hospital record (Lakeshore)", text: rec[0].trim() });
  return docs;
}

/* ---------- Peri-operative medicine holds (demo rule set) ---------- */
// Hours between two "D Mon HH:MM" style timestamps in the same year (e.g. "14 Aug 08:00").
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
export function hoursBetween(a, b) {
  const t = (s) => { const [d, mo, hm] = s.split(" "); const [h, m] = hm.split(":").map(Number); return Date.UTC(2026, MONTHS[mo], Number(d), h, m); };
  return Math.round((t(b) - t(a)) / 36e5);
}
export const HOLD_RULES = {
  sglt2: { minHours: 72, label: "SGLT2 inhibitor: stop at least 3 days before surgery (DKA risk)" },
  arb: { minHours: 24, label: "ACE inhibitor / ARB: omit for 24 h before surgery (hypotension)" },
  metformin: { minHours: 0, label: "Metformin: omit on the day of surgery" },
};
export function holdCheck(cls, lastDose, surgery) {
  const rule = HOLD_RULES[cls];
  const h = hoursBetween(lastDose, surgery);
  return { hours: h, ok: h >= rule.minHours, rule: rule.label };
}
export const basalNightBefore = (units) => Math.round(units * 0.8); // 80% of usual basal insulin

/* ---------- Discharge date maths ---------- */
const DAY = 864e5;
const parseDay = (s) => { const [d, mo] = s.split(" "); return Date.UTC(2026, MONTHS[mo], Number(d)); };
const fmtDay = (t) => { const x = new Date(t); return `${x.getUTCDate()} ${Object.keys(MONTHS)[x.getUTCMonth()]}`; };
export const addDays = (day, n) => fmtDay(parseDay(day) + n * DAY);
export const daysInclusive = (from, to) => Math.round((parseDay(to) - parseDay(from)) / DAY) + 1;

/* ---------- Pharmacy calculations ---------- */
// Devine ideal body weight and adjusted body weight (kg), height in cm.
export const idealBodyWeight = (heightCm, sex) => Math.round(((sex === "female" ? 45.5 : 50) + 0.906 * (heightCm - 152.4)) * 10) / 10;
export const adjustedBodyWeight = (weightKg, ibw) => Math.round((ibw + 0.4 * (weightKg - ibw)) * 10) / 10;
export function cockcroftGault({ age, weightKg, creatinine, sex }) {
  return Math.round(((140 - age) * weightKg * (sex === "female" ? 0.85 : 1)) / (72 * creatinine));
}
export const QT_DRUGS = ["ondansetron", "domperidone", "haloperidol", "levofloxacin", "moxifloxacin", "azithromycin", "clarithromycin", "citalopram", "amiodarone"];
export function qtRisk(qtc, sex, drugs) {
  const limit = sex === "female" ? 470 : 450;
  const onList = drugs.filter((d) => QT_DRUGS.some((q) => d.toLowerCase().includes(q)));
  return { prolonged: qtc > limit, limit, drugs: onList, flag: qtc > limit && onList.length >= 1, severe: qtc >= 500 };
}

/* ---------- Remote monitoring rules ---------- */
export const STANDARD_THRESHOLDS = { hr: 110, sbp: 100, temp: 38.0, glucose: 300, stools: 6, weightLoss: 1.5 };
export const EPISODE_THRESHOLDS = { hr: 100, sbp: 105, temp: 37.8, glucose: 250, stools: 3, weightLoss: 1.0 };

// Single-reading threshold breaches.
export function thresholdAlerts(r, th) {
  const out = [];
  if (r.hr >= th.hr) out.push(`HR ${r.hr} ≥ ${th.hr}`);
  if (r.sbp < th.sbp) out.push(`SBP ${r.sbp} < ${th.sbp}`);
  if (r.temp >= th.temp) out.push(`Temp ${r.temp} ≥ ${th.temp}`);
  if (r.glucose > th.glucose) out.push(`Glucose ${r.glucose} > ${th.glucose}`);
  if (r.glucose < 70) out.push(`Glucose ${r.glucose} < 70`);
  return out;
}

// Trend rules against the first (discharge) reading and the previous 24 h.
export function trendAlerts(readings, i) {
  const first = readings[0], r = readings[i];
  const out = [];
  if (r.hr - first.hr >= 15) out.push(`HR up ${r.hr - first.hr} since discharge (${first.hr} → ${r.hr})`);
  if (first.sbp - r.sbp >= 12) out.push(`SBP down ${first.sbp - r.sbp} since discharge (${first.sbp} → ${r.sbp})`);
  if (Math.round((r.temp - first.temp) * 10) / 10 >= 0.8) out.push(`Temperature rising (${first.temp.toFixed(1)} → ${r.temp.toFixed(1)})`);
  if (r.weightKg != null) {
    const prev = readings.slice(0, i).reverse().find((x) => x.weightKg != null && hoursApart(x.time, r.time) <= 26);
    if (prev && Math.round((prev.weightKg - r.weightKg) * 10) / 10 >= 1.0) out.push(`Weight down ${(prev.weightKg - r.weightKg).toFixed(1)} kg in ${hoursApart(prev.time, r.time)} h`);
  }
  return out;
}
const hoursApart = (a, b) => Math.round((new Date(b) - new Date(a)) / 36e5);

export function stoolTrend(days) {
  const rising = days.every((d, i) => i === 0 || d.count > days[i - 1].count);
  return { rising, latest: days[days.length - 1].count };
}

import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: ED board (app-scored NEWS2, lab flags, rule-based medicine check) → Claude's decision support.
export default {
  instructions: `Give point-of-care decision support for this emergency department patient, as JSON for the ED doctor's sidebar. The app has already scored NEWS2 and run a rule-based medicine check (listed); build on them rather than repeating them.
- mostLikely: the leading diagnosis and its likely precipitant.
- differential: ranked by likelihood and danger, with evidence for and against from the data, and the next test.
- cantMiss: dangerous alternatives with the specific check that excludes each, and whether the data so far excludes it.
- first6h: actions with doses and targets, each tagged with its guideline source.
- medicines: interactions, drugs to hold, and anything that caused or worsened the presentation, with the action.
- escalation: results or responses that should change the plan.`,
  schema: obj({
    mostLikely: obj({ diagnosis: str(), precipitant: str() }),
    differential: list(obj({ diagnosis: str(), likelihood: oneOf(["Most likely", "Possible", "Less likely"]), for: str(), against: str(), nextTest: str() })),
    cantMiss: list(obj({ condition: str(), check: str(), status: oneOf(["Excluded so far", "Not yet excluded", "Present"]) })),
    first6h: list(obj({ action: str(), guideline: str() })),
    medicines: list(obj({ medicines: str(), problem: str(), action: str(), severity: oneOf(["High", "Moderate", "Low"]) })),
    escalation: list(obj({ trigger: str(), action: str() })),
  }),
  toText(payload) {
    const findings = (payload.appFindings || []).map((f) => `- [${f.severity}] ${f.title}: ${f.detail}`);
    return `${payload.presentation || ""}\n\nApp-calculated NEWS2: ${payload.news2 ?? "not calculated"}\nApp rule-based medicine check:\n${findings.join("\n") || "- none"}`;
  },
  demo: {
    mostLikely: { diagnosis: "Acute decompensated heart failure (warm and wet)", precipitant: "Diclofenac (sodium and fluid retention, blunting the diuretic and ACE inhibitor) plus a recent salt load" },
    differential: [
      { diagnosis: "Acute decompensated heart failure", likelihood: "Most likely", for: "Orthopnoea, JVP to the jaw, crackles, oedema; NT-proBNP 9,800; pulmonary oedema on X-ray; LVEF 30%", against: "—", nextTest: "Bedside echo (LV function, MR, IVC); response to diuretic" },
      { diagnosis: "NSTEMI as the trigger", likelihood: "Possible", for: "Troponin raised; known CAD", against: "Small delta 38 → 41; no chest pain; LBBB unchanged, Sgarbossa negative", nextTest: "Troponin at 3 h; echo for a new wall-motion abnormality" },
      { diagnosis: "Pneumonia", likelihood: "Less likely", for: "Cough, WBC 11.2", against: "No fever; CRP 18; no consolidation", nextTest: "Clinical course; procalcitonin if in doubt" },
      { diagnosis: "Pulmonary embolism", likelihood: "Less likely", for: "Tachycardia, hypoxia", against: "Clear alternative; bilateral oedema on X-ray", nextTest: "Only if hypoxia is out of proportion after diuresis" },
      { diagnosis: "Arrhythmia-driven decompensation", likelihood: "Less likely", for: "Tachycardia", against: "Sinus rhythm", nextTest: "Telemetry" },
    ],
    cantMiss: [
      { condition: "Acute coronary syndrome", check: "Serial troponin and echo for a new wall-motion abnormality; not a STEMI equivalent on Sgarbossa", status: "Not yet excluded" },
      { condition: "Cardiogenic shock", check: "Warm peripheries, BP 152/92, lactate 1.6", status: "Excluded so far" },
      { condition: "Hypercapnic respiratory failure", check: "pH 7.33, pCO2 48: repeat the VBG after 1 hour of treatment", status: "Not yet excluded" },
      { condition: "Hyperkalaemia / AKI", check: "K 5.1, creatinine 1.5 on ACE inhibitor + NSAID: recheck at 6 h", status: "Present" },
    ],
    first6h: [
      { action: "Sit upright; oxygen to SpO2 94–98%. CPAP/NIV if still hypoxic or working hard", guideline: "ESC 2021 HF" },
      { action: "IV furosemide 40–80 mg bolus (at least equal to the daily oral dose, up to 2–2.5×); reassess at 2 h; double if urine sodium <50–70 mmol/L or output <100–150 mL/h at 6 h", guideline: "ESC 2021 HF diuretic algorithm" },
      { action: "Consider a GTN infusion for symptom relief while systolic BP >110", guideline: "ESC 2021 HF (IIb)" },
      { action: "Stop diclofenac; hold metformin; continue metoprolol; hold ramipril tonight if creatinine or K rise", guideline: "ESC 2021 HF" },
      { action: "Troponin at 3 h, repeat ECG, bedside echo", guideline: "ESC 2023 ACS" },
      { action: "Strict fluid balance, daily weights; U&E and K at 6 h and in the morning", guideline: "ESC 2021 HF" },
      { action: "Enoxaparin 40 mg SC daily", guideline: "VTE prophylaxis" },
      { action: "Correction insulin; glucose 140–180 mg/dL while acutely unwell", guideline: "ADA inpatient" },
    ],
    medicines: [
      { medicines: "Diclofenac + ramipril + furosemide", problem: "\"Triple whammy\": reduced kidney perfusion (creatinine 1.3 → 1.5) and sodium retention; likely precipitated the decompensation", action: "Stop diclofenac permanently; paracetamol for the knee; record an NSAID alert", severity: "High" },
      { medicines: "Metformin", problem: "Lactic acidosis risk with hypoxia and rising creatinine", action: "Hold until stable and eating; restart if eGFR ≥30", severity: "High" },
      { medicines: "Ramipril, K 5.1, CKD", problem: "Hyperkalaemia risk, worse with the NSAID", action: "Continue if K ≤5.5 and creatinine stable; recheck at 6 h", severity: "Moderate" },
      { medicines: "Diclofenac + aspirin", problem: "GI bleeding risk; NSAID may blunt aspirin's antiplatelet effect", action: "Resolved by stopping diclofenac", severity: "Moderate" },
      { medicines: "Metoprolol", problem: "Beta-blocker in acute HF", action: "Continue: not in shock, not bradycardic; do not stop abruptly", severity: "Low" },
      { medicines: "Guideline gaps", problem: "No SGLT2 inhibitor, no MRA, low-dose ACE inhibitor", action: "Flag for the HF team before discharge", severity: "Low" },
    ],
    escalation: [
      { trigger: "SpO2 <90% despite oxygen, RR >30, or pH <7.30 / pCO2 rising", action: "NIV; discuss with ICU" },
      { trigger: "Systolic BP <90, cold peripheries or rising lactate", action: "Cardiogenic shock pathway: CCU, inotropes, stop nitrates" },
      { trigger: "Troponin rising substantially at 3 h, or a new wall-motion abnormality", action: "Treat as NSTEMI: cardiology, antithrombotics, angiography timing" },
      { trigger: "Poor diuretic response at 6 h", action: "Double the loop diuretic; consider metolazone or acetazolamide" },
      { trigger: "K >6.0 or creatinine up >0.3 mg/dL", action: "Hold ramipril, treat hyperkalaemia, involve nephrology" },
    ],
  },
};

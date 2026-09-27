export default {
  id: "decision",
  order: 29,
  patientId: "syn-000342",
  title: "Decision-Support Sidebar",
  specialty: "Emergency / Internal Medicine",
  stage: "consultation",
  date: "2026-09-14",
  summary:
    "Sits beside the clinician during an acute assessment: a ranked differential with evidence for and against, the likely trigger, guideline-based next steps in the first hours, and a drug-interaction check across the current medicine list.",
  claudeRole: "Organises the differential, finds the precipitant and interactions, and cites the guideline for each step. The treating doctor decides.",
  inputLabel: "ED assessment",
  inputHint: "History, examination and first results as the clinician enters them. Claude updates the differential against the chart.",
  outputLabel: "Draft decision support",
  system: `Task: point-of-care clinical decision support in the emergency department.

Rank possibilities by likelihood and danger. For each, give evidence for and against from the data provided. Cite the guideline behind each recommendation (for example ESC 2021 heart failure, ESC 2023 ACS, NICE). Produce in order:
1. "## Most likely diagnosis": one line, with the likely precipitant.
2. "## Differential": a table of diagnosis | for | against | next test to confirm or exclude.
3. "## Can't-miss checks": dangerous alternatives with the specific test or finding that excludes each.
4. "## First 6 hours": numbered actions with doses and targets, each tagged with its guideline source.
5. "## Drug-interaction and medicine check": a table of medicine(s) | problem | action, covering interactions, drugs to hold, and anything that could have caused or worsened the presentation.
6. "## What would change the plan": results or responses that should prompt escalation (NIV, ICU, cath lab).`,
  buildPrompt: (input) => `ED assessment:\n\n${input}`,
  defaultInput: `Emergency department, 14 Sep 2026, 02:30. Rajan Pillai, 67.
History: 3 days of increasing breathlessness, now breathless at rest; orthopnoea (sleeping sitting up), ankle swelling. No chest pain. Mild cough, no fever. Knee pain for 2 weeks: GP prescribed diclofenac 50 mg twice daily 10 days ago. Admits eating pickles and dried fish more often during a family function last week.
Background: HFrEF (LVEF 30% in 2022), old anterior MI with LAD stent (2019), LBBB, T2DM, CKD 3a.
Medicines: ramipril 2.5 mg, metoprolol succinate 25 mg, furosemide 40 mg daily, aspirin 75 mg, atorvastatin 80 mg, metformin 500 mg twice daily, diclofenac 50 mg twice daily.
Exam: RR 28, SpO2 89% on air, BP 152/92, HR 108 sinus, temp 37.1. Speaking in short sentences. JVP to the angle of the jaw, bilateral crackles to mid-zones, pitting oedema to the knees. Warm peripheries.
ECG: sinus tachycardia 108, LBBB (known, unchanged from 2024), no concordant ST changes.
Bloods: hs-troponin I 38 ng/L (ref <20); repeat at 1 h: 41. NT-proBNP 9,800. Creatinine 1.5 (baseline 1.3), K 5.1, Na 134. Glucose 240 mg/dL. WBC 11.2, CRP 18. VBG: pH 7.33, pCO2 48, lactate 1.6.
Chest X-ray: cardiomegaly, upper-lobe diversion, bilateral interstitial and alveolar oedema, small bilateral effusions. No focal consolidation.`,
  demoOutput: `## Most likely diagnosis
**Acute decompensated heart failure (warm and wet)**, most likely **triggered by diclofenac** (sodium and fluid retention, blunting of diuretic and ACE-inhibitor effect) plus a recent salt load.

## Differential
| Diagnosis | For | Against | Next test |
|---|---|---|---|
| **Acute decompensated HF** | Orthopnoea, raised JVP, crackles, oedema; NT-proBNP 9,800; pulmonary oedema on X-ray; known LVEF 30% | — | Bedside echo (LV function, MR, IVC); response to diuretic |
| **Acute coronary syndrome (NSTEMI)** as trigger | Troponin raised; known CAD | Delta 38 → 41 (small rise); no chest pain; LBBB unchanged, no concordant ST changes (Sgarbossa negative) | Troponin at 3 h; echo for new regional wall-motion change |
| **Pneumonia** | Cough, WBC 11.2 | No fever; CRP 18; no consolidation on X-ray | Clinical course; procalcitonin if doubt |
| **Pulmonary embolism** | Tachycardia, hypoxia | Clear alternative explanation; bilateral oedema on X-ray | Only if hypoxia is out of proportion after diuresis (Wells/CTPA) |
| **Arrhythmia-driven decompensation** | Tachycardia | Sinus rhythm on ECG | Telemetry |

## Can't-miss checks
- **ACS:** serial troponin (the 1-hour delta is small, which supports myocardial strain over infarction) and echo for a new wall-motion abnormality. **Not a STEMI equivalent** on the Sgarbossa criteria.
- **Cardiogenic shock:** warm peripheries, BP 152/92, lactate 1.6: **not present.** Recheck if BP falls.
- **Hypercapnic respiratory failure:** pH 7.33, pCO2 48, so early fatigue is possible. Reassess the VBG after 1 hour of treatment.
- **Hyperkalaemia / AKI:** K 5.1 and creatinine 1.5 on ACE inhibitor + NSAID. Monitor closely.

## First 6 hours
1. **Sit upright; oxygen to SpO2 94–98%.** If still hypoxic or working hard, **CPAP/NIV** (ESC 2021 HF).
2. **IV furosemide 40–80 mg bolus** (at least equal to the daily oral dose, up to 2–2.5× in the DOSE-trial approach), then reassess at 2 hours. Aim for urine sodium >50–70 mmol/L at 2 hours or urine output >100–150 mL/h at 6 hours; **double the dose** if the response is inadequate (ESC 2021 HF diuretic algorithm).
3. **IV nitrate (GTN infusion)** can be considered for symptom relief while systolic BP >110 (ESC 2021 HF, class IIb).
4. **Stop diclofenac.** Hold metformin (see below). Continue metoprolol at the current dose (warm, not in shock). Hold ramipril tonight if creatinine or K rise further.
5. **Serial troponin at 3 h**, ECG repeat, **bedside echo** (ESC 2023 ACS / HF).
6. **Strict fluid balance, daily weights, catheter if needed**; U&E and K at 6 hours and next morning.
7. **VTE prophylaxis** (enoxaparin 40 mg SC daily; renal function acceptable).
8. **Glucose:** correction insulin; target 140–180 mg/dL while acutely unwell.

## Drug-interaction and medicine check
| Medicine(s) | Problem | Action |
|---|---|---|
| **Diclofenac + ramipril + furosemide** | "Triple whammy": NSAID + ACE inhibitor + diuretic reduces kidney perfusion (creatinine 1.3 → 1.5) and causes sodium retention, likely precipitating HF decompensation | **Stop diclofenac permanently.** Paracetamol for knee pain. Record NSAID avoidance as an alert |
| Diclofenac + aspirin | Higher GI bleeding risk; NSAID may reduce aspirin's antiplatelet effect | Resolved by stopping diclofenac |
| **Metformin** with hypoxia and rising creatinine | Risk of lactic acidosis during acute illness | **Hold** until stable and eating; restart if eGFR ≥30 |
| Ramipril + K 5.1 + CKD | Hyperkalaemia risk, worse with NSAID | Continue if K ≤5.5 and creatinine stable; recheck at 6 h |
| Metoprolol | Beta-blocker in acute HF | **Continue** (not in shock, not bradycardic). Do not stop abruptly |
| Guideline gaps (for discharge, not tonight) | No SGLT2 inhibitor, no MRA, low-dose ACE inhibitor | Flag for the HF team to optimise before discharge and at clinic |

## What would change the plan
- **SpO2 <90% despite oxygen, RR >30, or pCO2 rising / pH <7.30** → NIV, discuss with ICU.
- **Systolic BP <90 or cold peripheries / rising lactate** → cardiogenic shock pathway: CCU, inotropes, stop nitrates.
- **Troponin rising substantially at 3 h, or new regional wall-motion abnormality** → treat as NSTEMI: cardiology, antithrombotic therapy, and angiography timing (ESC 2023 ACS).
- **Poor diuretic response at 6 h** → double the loop diuretic; consider adding a thiazide-type diuretic (metolazone) or acetazolamide.
- **K >6.0 or creatinine rising >0.3 mg/dL** → hold ramipril, treat hyperkalaemia, involve nephrology.
`,
};

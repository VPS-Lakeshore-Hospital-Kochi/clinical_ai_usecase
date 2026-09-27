export default {
  id: "nephrology",
  order: 10,
  title: "Kidney Co-pilot",
  specialty: "Nephrology",
  stage: "recovery",
  date: "2026-09-03",
  summary:
    "Reviews the kidney-function trend, stages CKD, checks chemotherapy dosing and contrast safety, and writes the sick-day and kidney-protection plans before chemotherapy starts.",
  claudeRole: "Calculates kidney function, checks dosing, and drafts the sick-day plan and advice note. The nephrologist decides.",
  inputLabel: "Nephrology e-consult",
  inputHint: "The referral question from Oncology. Claude pulls the creatinine, eGFR, UACR and medication history from the chart and shows its calculations.",
  outputLabel: "Draft nephrology advice",
  system: `Task: nephrology e-consult answer (KDIGO 2024 CKD guideline, KDIGO 2022 diabetes-in-CKD guideline).

Show the arithmetic for any calculated value. Produce in order:
1. "## Answer for the referring team": 3–5 direct answers to the questions asked.
2. "## Kidney function assessment": a table of date | creatinine | eGFR | UACR | context, then the CKD stage (G and A categories), whether chronicity (>3 months) is established, and the likely causes of any change. Include Cockcroft-Gault creatinine clearance with actual and adjusted body weight.
3. "## Drug dosing": a table of drug | renal threshold | this patient | action, for the planned treatment and current medicines.
4. "## Sick-day plan": when to pause which medicines, how to restart, and when to seek care, written for the patient.
5. "## Contrast imaging": guidance for surveillance CT.
6. "## Albuminuria & long-term kidney protection": BP target, RAS blockade, SGLT2 inhibitor, other agents and when to consider them, and what to avoid.
7. "## Monitoring schedule": a table of when | test | why.
8. "## Note to Medical Oncology": 4–6 lines, ready to paste.`,
  buildPrompt: (input) => `E-consult:\n\n${input}`,
  defaultInput: `Nephrology e-consult from Medical Oncology, 3 Sep 2026.
Patient is due to start adjuvant CAPOX (capecitabine 1000 mg/m² twice daily, days 1–14, plus oxaliplatin 130 mg/m² every 3 weeks, 4 cycles) on 10 Sep 2026 after laparoscopic anterior resection for stage IIIB sigmoid cancer.
Kidney history: creatinine 1.23 mg/dL (eGFR 68) with UACR 42 mg/g on 6 Jul 2026 while taking aceclofenac daily (stopped 6 Jul). Creatinine 1.0 at discharge on 24 Aug. Today's labs (2 Sep): creatinine 1.02 (eGFR 85), UACR 38 mg/g, K 4.6. Weight 84 kg, height 168 cm, BP 132/80.
Current medicines: metformin 1000 mg BD, insulin glargine 14 U, empagliflozin 10 mg (restarted 27 Aug), telmisartan 40 mg, atorvastatin 40 mg, enoxaparin until 16 Sep.
Questions:
1. Is kidney function adequate for full-dose CAPOX?
2. Does he have CKD, and what is the long-term plan for the albuminuria?
3. How should we handle his diabetes and BP medicines if he gets diarrhoea on capecitabine?
4. Any precautions for contrast CT during surveillance?`,
  demoOutput: `## Answer for the referring team
1. **Yes: full-dose CAPOX.** Creatinine clearance is ~80–94 mL/min, well above the capecitabine (51) and oxaliplatin (30) dose-reduction thresholds.
2. **Probable CKD G2 A2** (diabetic kidney disease), but **chronicity is not yet confirmed**: the two UACR values are only 8 weeks apart. Repeat UACR on or after 6 Oct. The July eGFR dip was most likely NSAID-related and has recovered.
3. **Sick-day rules**: pause metformin, empagliflozin and telmisartan during significant diarrhoea or vomiting. Reduce insulin rather than stopping it. Details below.
4. **Contrast CT is safe** at eGFR ≥45 without extra hydration or stopping metformin.

## Kidney function assessment
| Date | Creatinine (mg/dL) | eGFR (CKD-EPI 2021) | UACR (mg/g) | Context |
|---|---|---|---|---|
| 6 Jul 2026 | 1.23 | 68 | 42 | Daily aceclofenac for ~7 months |
| 24 Aug 2026 | 1.00 | 87 | — | Discharge, NSAID stopped 7 weeks earlier |
| 2 Sep 2026 | 1.02 | 85 | 38 | On telmisartan + empagliflozin |

- **Stage:** G2 (eGFR 60–89) **A2** (UACR 30–300), *provisional*. KDIGO requires abnormality for >3 months; the first UACR was 6 Jul.
- **Why eGFR improved:** stopping the NSAID removed its effect on kidney blood flow. Empagliflozin (restarted 27 Aug) typically causes a small initial eGFR dip, which is expected and not harmful.
- **Why albuminuria persists:** most likely diabetic kidney disease (12 years of T2DM, hypertension, neuropathy as another microvascular complication). SGLT2 inhibition may lower UACR further over the coming weeks.

**Creatinine clearance (Cockcroft-Gault)**
- Actual weight: (140 − 58) × 84 ÷ (72 × 1.02) = **93.8 mL/min**
- Ideal body weight (168 cm): 50 + 2.3 × (66.1 − 60) = 64.1 kg. Adjusted body weight = 64.1 + 0.4 × (84 − 64.1) = 72.1 kg
- Adjusted weight: (140 − 58) × 72.1 ÷ (72 × 1.02) = **80.5 mL/min**. Use this more conservative value for dosing, since BMI is 29.8.

## Drug dosing
| Drug | Renal threshold | This patient | Action |
|---|---|---|---|
| Capecitabine | CrCl 30–50: start at 75%; <30: contraindicated | ~80 mL/min | **Full dose.** Recheck creatinine before each cycle |
| Oxaliplatin | CrCl <30: reduce dose | ~80 mL/min | **Full dose** |
| Metformin | eGFR <30 stop; 30–44 max 1000 mg/day | 85 | Continue 1000 mg BD; pause on sick days |
| Empagliflozin | Initiate if eGFR ≥20 | 85 | Continue; pause on sick days |
| Telmisartan | Monitor K and creatinine | K 4.6 | Continue; consider 80 mg (see below) |
| Enoxaparin 40 mg | Adjust if CrCl <30 | ~80 | No change; ends 16 Sep |
| NSAIDs | Avoid in CKD with RAS blocker + SGLT2i | — | **Avoid permanently**; paracetamol for knee pain |

## Sick-day plan
*For you, Mr. Thomas.* If you have **diarrhoea 4 or more times a day, vomiting, or cannot eat and drink normally**:
- **Stop** metformin, empagliflozin and telmisartan until you are eating and drinking normally for 24–48 hours, then restart them.
- **Do not stop your insulin.** Check your sugar every 4 hours. If you are eating little, take about 20% less insulin at night (for example 11 units instead of 14).
- Drink small amounts often: oral rehydration solution, kanji water or tender-coconut water.
- **Call the oncology helpline the same day.** Capecitabine may need to be paused, and that is the oncology team's decision.
- **Come to hospital** if you cannot keep fluids down for 12 hours, pass very little urine, feel dizzy on standing, or your sugar stays above 300 or below 70.

## Contrast imaging
- eGFR ≥45 and stable: **no prophylactic IV hydration and no need to stop metformin** (ACR–NKF 2020 consensus; ACR Manual on Contrast Media).
- Do not schedule contrast CT during an episode of chemotherapy-related dehydration or AKI. Check creatinine within 1 week before the scan while he is on chemotherapy.

## Albuminuria & long-term kidney protection
- **BP target <130/80** (systolic <120 if tolerated, per KDIGO). Current 132/80, so **increase telmisartan to 80 mg**, with K and creatinine checked 1–2 weeks later. Consider waiting until after cycle 1 if diarrhoea is a concern.
- **Continue empagliflozin** long term for kidney and heart protection.
- **If UACR is still ≥30 mg/g on maximum telmisartan** after chemotherapy: consider **finerenone** (KDIGO 2022; FIDELIO/FIGARO), provided K ≤4.8. A **GLP-1 receptor agonist** (FLOW trial) can be discussed once weight is stable and oncology agrees.
- LDL goal <70 mg/dL (<55 if CAD is confirmed).
- **Avoid** NSAIDs, and nephrotoxic herbal or ayurvedic preparations unless reviewed.

## Monitoring schedule
| When | Test | Why |
|---|---|---|
| Before each CAPOX cycle | Creatinine, eGFR, K, CBC | Capecitabine dosing; dehydration |
| 1–2 weeks after telmisartan increase | K, creatinine | Hyperkalaemia / eGFR dip |
| On or after 6 Oct 2026 | UACR | Confirm chronicity (CKD A2) |
| End of chemotherapy (~Dec 2026) | Creatinine, UACR, K | Decide on finerenone |
| Every 6 months thereafter | eGFR, UACR | KDIGO monitoring for G2 A2 |

## Note to Medical Oncology
Kidney function is adequate for full-dose CAPOX (CrCl ~80 mL/min by adjusted body weight; eGFR 85). The July eGFR of 68 was NSAID-related and has recovered. Probable CKD G2 A2 from diabetes; UACR to be repeated after 6 Oct to confirm. Please check creatinine and K before each cycle and apply sick-day rules (pause metformin, empagliflozin and telmisartan; continue insulin at a reduced dose) during grade ≥2 diarrhoea or vomiting. Contrast CT needs no special precautions at the current eGFR. Nephrology will review after chemotherapy.
`,
};

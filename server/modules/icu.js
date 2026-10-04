export default {
  id: "icu",
  order: 11,
  title: "ICU Round Co-pilot",
  specialty: "Critical Care",
  stage: "inpatient",
  date: "2026-09-20",
  summary:
    "Turns an ICU admission's vitals, labs, drugs and events into a problem-based plan with bundle tracking, drug safety checks, an SBAR handover, a family update and questions for the parent team.",
  claudeRole: "Pulls the data together, checks bundles and drug safety, and drafts the note and handover. The intensivist leads the round and decides.",
  inputLabel: "ICU admission data",
  inputHint: "Bedside monitor, ABG, labs, infusions and nursing notes as they arrive. Claude reads them against the whole chart, including chemotherapy and diabetes history.",
  outputLabel: "Draft ICU note & handover",
  system: `Task: ICU admission and round support.

Prioritise immediately dangerous issues. Tie findings to the patient's history (recent chemotherapy, diabetes drugs, kidney function). Produce in order:
1. "## Immediate safety flags": numbered, most dangerous first, each with the action.
2. "## Problem-based assessment & plan": one short block per problem (diagnosis, supporting data, plan, targets).
3. "## Bundles & protocols": a table of bundle item | status (✅ / ⏳ / ❌) | note, covering the sepsis hour-1 bundle, the DKA protocol steps, and a FAST HUGS BID daily checklist.
4. "## Drug review": a table of drug | action | reason, covering stopped, held, renally adjusted and new drugs.
5. "## SBAR handover": for the night team.
6. "## Family update": plain English, under 120 words.
7. "## Questions for the parent team": for Oncology and Endocrinology.`,
  buildPrompt: (input) => `ICU data:\n\n${input}`,
  defaultInput: `MICU admission, 20 Sep 2026, 06:10. Transferred from ED.
Background: stage IIIB sigmoid cancer, resected 19 Aug. Adjuvant CAPOX cycle 1 started 10 Sep at full dose (oxaliplatin 257 mg day 1; capecitabine 2,000 mg twice daily, days 1–14; BSA 1.98 m²). DPYD genotype sent to an external lab on 6 Aug: no result in chart.
History from wife: diarrhoea from 16 Sep, 8–10 watery stools/day by 18 Sep, mouth ulcers, poor intake. He stopped metformin but **kept taking empagliflozin** ("the kidney tablet") and capecitabine until the morning of 19 Sep. Vomiting since the evening of 19 Sep; drowsy this morning.
Exam: GCS 14 (E4 V4 M6). HR 118, BP 88/54 (MAP 65), RR 28 deep, SpO2 97% on air, temp 37.9 °C. Dry mucosa, grade 3 oral mucositis. Abdomen soft, diffusely tender, no guarding. Port sites healed.
ABG: pH 7.12, pCO2 24 mmHg, HCO3 9 mmol/L, lactate 3.2 mmol/L.
Labs: glucose 212 mg/dL; beta-hydroxybutyrate 5.8 mmol/L; Na 134, K 3.1, Cl 104, Mg 1.4 mg/dL; creatinine 2.4 mg/dL (baseline 1.02 on 2 Sep); urea 88. WBC 1.8 ×10⁹/L, ANC 0.6 ×10⁹/L, Hb 10.6, platelets 88. CRP 96, procalcitonin 1.1.
Cultures: blood ×2 sent 05:40. Stool C. difficile and GI PCR sent.
Given in ED: 1 L Ringer's lactate; no insulin yet; no antibiotics yet.
Current infusions: none. Urine output 15 mL/h since catheter at 05:30.
Home medicines: insulin glargine 14 U HS, empagliflozin 10 mg, telmisartan 40 mg, atorvastatin 40 mg, metformin (stopped by patient 18 Sep).
Allergy: sulfonamide antibiotics (rash).`,
  demoOutput: `## Immediate safety flags
1. **Euglycaemic diabetic ketoacidosis (SGLT2 inhibitor-associated):** pH 7.12, HCO3 9, anion gap 21, beta-hydroxybutyrate 5.8, with glucose only 212. **Do not be reassured by the glucose.** Start DKA management with insulin **plus dextrose**.
2. **Potassium 3.1:** **replace potassium first. Do not start insulin until K ≥3.3 mmol/L** (it will fall further).
3. **Possible neutropenic sepsis:** ANC 0.6, hypotension, lactate 3.2, temp 37.9, procalcitonin 1.1. **Give broad-spectrum antibiotics now.** Cultures are already sent, and he is past the 1-hour target.
4. **Severe early fluoropyrimidine toxicity** (grade 3 diarrhoea, grade 3 mucositis, neutropenia by day 10 of cycle 1): **suspect DPD deficiency.** The DPYD result sent 6 Aug is missing, so chase it today. **Uridine triacetate** is indicated for early-onset severe toxicity within 96 h of the last capecitabine dose (last dose on the morning of 19 Sep, so the window closes on the morning of 23 Sep). Check urgent availability.
5. **AKI, KDIGO stage 2** (creatinine 2.4 vs 1.02 baseline, ×2.35; urine output 15 mL/h). Pre-renal from GI losses. Renally adjust drugs and avoid nephrotoxins.

## Problem-based assessment & plan
**1. Euglycaemic DKA.** Trigger: SGLT2 inhibitor continued during dehydration and poor intake (sick-day rules not followed).
- Stop empagliflozin. Fixed-rate IV insulin 0.1 U/kg/h (≈8.4 U/h) **once K ≥3.3**, with **10% dextrose from the start** because glucose is <250.
- Continue basal glargine at 14 U, reduced to 10 U given poor intake.
- Targets: ketones fall ≥0.5 mmol/L/h, HCO3 rise ≥3 mmol/L/h. Hourly glucose, 2-hourly ketones and VBG, 4-hourly K.

**2. Shock: hypovolaemic ± septic.**
- Balanced crystalloid 500 mL boluses to a MAP target ≥65 and urine output ≥0.5 mL/kg/h, reassessing after each bolus.
- If MAP stays <65 after ~30 mL/kg, start noradrenaline via a central line.
- Repeat lactate in 2 h.

**3. Febrile neutropenia (high risk).**
- **Piperacillin-tazobactam 4.5 g IV now**, then renally adjusted dosing as an extended infusion (sulfonamide allergy does not affect this). Add vancomycin only for line infection, skin infection, MRSA or haemodynamic instability persisting after fluids.
- Consider G-CSF (high-risk febrile neutropenia with sepsis) after discussion with Oncology.
- Neutropenic precautions.

**4. Grade 3 chemotherapy-induced diarrhoea and mucositis.**
- Capecitabine **stopped permanently pending DPYD result**.
- Octreotide 100–150 µg SC three times daily. **Hold loperamide until C. difficile and GI PCR are negative** (febrile and neutropenic).
- Mouth care, analgesic mouthwash. Replace magnesium (1.4) and potassium.

**5. AKI stage 2.**
- Fluids as above. Hold telmisartan and metformin.
- Avoid contrast and NSAIDs. Strict input/output.
- Nephrology aware (reviewed 3 Sep). Renal replacement only for refractory acidosis, hyperkalaemia or fluid overload.

**6. Possible DPD deficiency.**
- Chase DPYD genotype and uridine triacetate availability today. Inform the treating oncologist.

## Bundles & protocols
| Bundle item | Status | Note |
|---|---|---|
| Blood cultures before antibiotics | ✅ | 05:40 |
| Lactate measured | ✅ | 3.2; repeat in 2 h |
| Broad-spectrum antibiotics within 1 h | ❌ | **Give now** (overdue since ED triage) |
| 30 mL/kg crystalloid for hypotension/lactate ≥4 | ⏳ | 1 L given; continue boluses to target |
| Vasopressor if MAP <65 after fluids | ⏳ | Reassess after boluses |
| DKA: potassium ≥3.3 before insulin | ❌ | K 3.1: replace first |
| DKA: fixed-rate insulin + dextrose 10% | ⏳ | Start once K ≥3.3 |
| DKA: continue basal insulin | ⏳ | Glargine, reduced dose |
| Feeding | ⏳ | Sips as tolerated; dietitian once DKA resolves |
| Analgesia / sedation | ✅ | Mucositis analgesia; no sedation |
| Thromboprophylaxis | ⏳ | Platelets 88: enoxaparin 40 mg is acceptable (platelets >50) once not actively bleeding; mechanical until then |
| Head-up, ulcer prophylaxis, glucose control | ⏳ | Glucose per DKA protocol |
| Bowel care, indwelling catheter, de-escalation | ⏳ | Stool charting; review catheter daily; de-escalate antibiotics at 48–72 h |

## Drug review
| Drug | Action | Reason |
|---|---|---|
| Capecitabine | **Stop** | Severe toxicity; suspected DPD deficiency |
| Empagliflozin | **Stop; do not restart during chemotherapy** | Euglycaemic DKA |
| Metformin | Hold | AKI, lactate 3.2 |
| Telmisartan | Hold | Hypotension, AKI |
| Atorvastatin | Continue when taking orally | — |
| Insulin glargine | Continue at 10 U | Basal cover during DKA protocol |
| IV insulin + 10% dextrose | **New** (after K ≥3.3) | DKA |
| Potassium chloride IV | **New** | K 3.1 |
| Magnesium sulfate IV | **New** | Mg 1.4 |
| Piperacillin-tazobactam | **New**, renally adjusted | Febrile neutropenia |
| Octreotide | **New** | Grade 3 diarrhoea |
| Loperamide | **Hold** | Until C. difficile / GI PCR negative |
| Uridine triacetate | **Request urgently** if available | Early severe fluoropyrimidine toxicity within 96 h |

## SBAR handover
- **S:** 58 M, day 10 of CAPOX cycle 1, admitted with euglycaemic DKA, hypovolaemic ± septic shock, febrile neutropenia and AKI stage 2.
- **B:** Stage IIIB sigmoid cancer resected 19 Aug. T2DM on empagliflozin, continued through diarrhoea. DPYD result never received.
- **A:** pH 7.12, BHB 5.8, K 3.1, ANC 0.6, creatinine 2.4, MAP ~65 after 1 L.
- **R:** K replacement then insulin + dextrose; antibiotics given at [time]; fluid boluses to MAP ≥65 and urine output ≥0.5 mL/kg/h; call for noradrenaline if MAP <65 after 30 mL/kg; 2-hourly ketones/VBG, 4-hourly K; chase DPYD and uridine triacetate; escalate if GCS falls or K <3.0.

## Family update
Mr. Thomas is seriously unwell and is in intensive care. The chemotherapy tablets caused severe diarrhoea, which dried out his body and lowered his blood count. One of his diabetes tablets, taken while he was not eating, has made his blood acidic. We are giving fluids, insulin with sugar drip, and antibiotics, and we have stopped the chemotherapy and that diabetes tablet. His kidneys are strained but should recover as he rehydrates. The next 24–48 hours are important. We will update you after the evening round.

## Questions for the parent team
**Oncology**
1. DPYD result: can the external lab release it today? Is uridine triacetate available within the 96-hour window?
2. G-CSF for high-risk febrile neutropenia: agree?
3. Future adjuvant plan: fluoropyrimidine dose per DPYD genotype (CPIC), or an alternative?

**Endocrinology**
4. Diabetes regimen during the rest of chemotherapy, without an SGLT2 inhibitor?
5. How do we prevent sick-day-rule failures (written plan, phone check-ins during each cycle)?
`,
};

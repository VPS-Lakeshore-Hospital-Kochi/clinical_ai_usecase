export default {
  id: "medrec",
  order: 11.5,
  title: "Med Reconciliation & Antibiotic Stewardship",
  specialty: "Clinical Pharmacy",
  stage: "inpatient",
  date: "2026-09-22",
  summary:
    "At a transfer of care, reconciles home, ICU and planned ward medicines line by line, flags interactions and medicines with no ongoing reason, and runs a day-3 antibiotic review against cultures and the clinical course.",
  claudeRole: "Reconciles the lists, finds interactions and stewardship opportunities, and drafts recommendations. The clinical pharmacist and treating team decide.",
  inputLabel: "Transfer medication lists & results",
  inputHint: "Home list, ICU chart and draft ward orders at ICU-to-ward transfer, with microbiology and today's labs.",
  outputLabel: "Draft reconciliation & stewardship review",
  system: `Task: clinical pharmacist medicine reconciliation at ICU-to-ward transfer, with a 48–72-hour antibiotic stewardship review.

Account for every medicine on every list. Show renal-dose calculations. Produce in order:
1. "## Safety flags": numbered, most important first, each with the recommended action.
2. "## Reconciliation": a table of drug | home | ICU | draft ward order | recommendation | reason. Include medicines that should be stopped, restarted, held or newly started.
3. "## Antibiotic stewardship review": indication, day of therapy, microbiology, clinical trajectory, the recommendation (continue, de-escalate, switch to oral, or stop) with guideline basis (IDSA/ASCO febrile neutropenia), and the stop criteria if continued.
4. "## C. difficile risk": modifiable risk factors in this patient and how to reduce them.
5. "## Discharge-ready medicine list (provisional)": what the patient would go home on if discharged in 2–3 days.
6. "## Questions for the teams": for Oncology, Endocrinology and the ward team.`,
  buildPrompt: (input) => `Transfer medication data:\n\n${input}`,
  defaultInput: `ICU → surgical oncology ward transfer, 22 Sep 2026, ICU day 3.
Admission 20 Sep: euglycaemic DKA, septic shock with febrile neutropenia, AKI stage 2, grade 3 capecitabine diarrhoea. DKA resolved 21 Sep (insulin infusion stopped 21 Sep 18:00).
Today: afebrile for 36 h, off vasopressors since 21 Sep 06:00, HR 84, BP 124/76. Diarrhoea 3/day, improving. Eating soft diet.
Labs 22 Sep: creatinine 1.6 (2.4 on admission), K 3.9, Mg 1.9, ANC 1.2 (0.6 on admission), platelets 110, CRP 48 (96), lactate 1.4, beta-hydroxybutyrate 0.3. Weight 84 kg, height 168 cm.
Microbiology: blood cultures ×2 (20 Sep) no growth at 48 h. Stool C. difficile PCR negative (20 Sep). Stool GI panel negative. Urine culture no growth.
ECG today: sinus 82/min, QTc 478 ms.

HOME list (before admission): insulin glargine 14 U HS; empagliflozin 10 mg OD; telmisartan 40 mg OD; atorvastatin 40 mg HS; metformin 1000 mg BD (patient stopped 18 Sep); capecitabine 2000 mg BD (cycle 1, stopped 19 Sep); paracetamol PRN; loperamide 2 mg PRN.

ICU chart (current): piperacillin-tazobactam 4.5 g IV 8-hourly extended infusion (started 20 Sep 06:40; dose reduced for AKI); insulin glargine 10 U HS; correction lispro per scale; octreotide 100 µg SC TDS; pantoprazole 40 mg IV OD (started 20 Sep, "stress ulcer prophylaxis"); ondansetron 4 mg IV 8-hourly PRN; domperidone 10 mg TDS (added 21 Sep for nausea); enoxaparin 40 mg SC OD; filgrastim 300 µg SC OD (20–21 Sep, stopped); potassium and magnesium replacement (completed); paracetamol 1 g 6-hourly.

Draft ward orders (junior doctor): continue all ICU medicines; restart telmisartan 40 mg; restart metformin 1000 mg BD; restart empagliflozin 10 mg; loperamide 2 mg PRN.
Allergy: sulfonamide antibiotics (rash).`,
  demoOutput: `## Safety flags
1. **Empagliflozin restart in the draft ward orders: remove it.** He was admitted with SGLT2 inhibitor-associated euglycaemic DKA 2 days ago and remains at risk of dehydration. Do not restart during chemotherapy (Endocrinology to confirm the long-term plan).
2. **Metformin restart: hold.** Creatinine is 1.6 and still recovering from AKI (eGFR ~49), and diarrhoea is ongoing. Restart when creatinine is stable and he is eating normally.
3. **Telmisartan restart: hold.** He was in septic shock less than 48 hours ago and the AKI is recovering. Restart at outpatient review once creatinine is back to baseline.
4. **QTc 478 ms on ondansetron + domperidone:** two QT-prolonging drugs, recent hypokalaemia and hypomagnesaemia. **Stop domperidone.** Keep ondansetron PRN only, keep K ≥4.0 and Mg ≥2.0, and repeat the ECG in 24 h.
5. **Pantoprazole has no ongoing indication:** he is eating, off vasopressors and not coagulopathic. **Stop it.** It also raises C. difficile risk.
6. **Loperamide PRN on the ward list:** acceptable only while C. difficile is excluded. It was negative on 20 Sep, before antibiotics. **Re-test before any loperamide if diarrhoea increases.**
7. **Piperacillin-tazobactam dose:** the renal reduction is no longer needed (see calculation below). But the stewardship recommendation is to **stop** it.

## Reconciliation
| Drug | Home | ICU | Draft ward order | Recommendation | Reason |
|---|---|---|---|---|---|
| Insulin glargine | 14 U HS | 10 U HS | 10 U HS | **Continue 10 U**, titrate to fasting glucose | Intake still reduced |
| Correction lispro | — | Scale | Scale | Continue | — |
| Empagliflozin | 10 mg OD | Stopped | **Restart** | ❌ **Do not restart** | Recent euglycaemic DKA |
| Metformin | 1000 mg BD (self-stopped) | Held | **Restart** | ⏸ **Hold** | Creatinine 1.6, recovering AKI; diarrhoea |
| Telmisartan | 40 mg OD | Held | **Restart** | ⏸ **Hold** | Recent shock and AKI |
| Atorvastatin | 40 mg HS | Not charted | Not ordered | ✅ **Restart 40 mg HS** | Omitted at ICU admission; no reason to stop |
| Capecitabine | 2000 mg BD | Stopped | — | ❌ **Stopped** until the oncology re-plan | Severe toxicity; DPYD*2A |
| Piperacillin-tazobactam | — | 4.5 g 8-hourly EI | Continue | ❌ **Stop today** (see stewardship) | Cultures negative, recovering |
| Octreotide | — | 100 µg TDS | Continue | Continue; stop when stools ≤2/day for 24 h | Improving diarrhoea |
| Pantoprazole | — | 40 mg IV OD | Continue | ❌ **Stop** | No indication; C. difficile risk |
| Ondansetron | — | 4 mg PRN | Continue | Continue PRN, max 8 mg/day | QTc 478: monitor |
| Domperidone | — | 10 mg TDS | Continue | ❌ **Stop** | QT prolongation with ondansetron |
| Enoxaparin | — | 40 mg OD | Continue | Continue (platelets 110) | VTE prophylaxis |
| Filgrastim | — | Stopped 21 Sep | — | Stopped | ANC recovering (1.2) |
| Paracetamol | PRN | 1 g 6-hourly | Continue | Continue, max 4 g/day | — |
| Loperamide | 2 mg PRN | — | 2 mg PRN | ⚠️ Only if C. difficile re-test negative | See flag 6 |

## Antibiotic stewardship review
- **Indication:** empirical treatment of febrile neutropenia with septic shock (20 Sep). **Day of therapy: 3.**
- **Microbiology:** blood cultures no growth at 48 h, urine negative, stool C. difficile and GI panel negative. No clinical source identified.
- **Trajectory:** afebrile for 36 h, off vasopressors for >24 h, lactate normal, CRP halving, **ANC recovering (0.6 → 1.2)**.
- **Renal dosing check:** Cockcroft-Gault with adjusted body weight 72.1 kg: (140 − 58) × 72.1 ÷ (72 × 1.6) = **51 mL/min**. At CrCl >40, piperacillin-tazobactam needs **no dose reduction**, so the current reduced dose is sub-therapeutic if it were continued.
- **Recommendation: stop piperacillin-tazobactam today.** IDSA/ASCO guidance supports stopping empirical therapy in febrile neutropenia with no identified infection once the patient is afebrile ≥48 h (reached tomorrow morning) and clinically stable, particularly with count recovery. Stopping now or at 48 h afebrile is reasonable.
- **If Oncology prefers to continue** until ANC ≥1.5: correct the dose to 4.5 g 6-hourly (or 8-hourly extended infusion at full dose), and set a hard **stop date of 24 Sep** with review at 48 h afebrile.

## C. difficile risk
- **Present:** broad-spectrum anti-pseudomonal antibiotic, PPI, recent chemotherapy, hospitalisation, age >55.
- **Reduce:** stop the antibiotic as early as safe, **stop the PPI**, avoid laxatives and antimotility drugs without a test, and re-test stool promptly if diarrhoea increases after it had improved.
- **Tell the patient and wife:** new or worsening diarrhoea in the weeks after discharge needs a stool test before any loperamide.

## Discharge-ready medicine list (provisional)
- Insulin glargine 10–12 U at bedtime (titrate), with a glucose log
- Atorvastatin 40 mg at bedtime
- Paracetamol 1 g up to 4 times a day if needed
- Ondansetron 4 mg if needed for nausea (max twice a day)
- **On hold with clear written instructions:** telmisartan, metformin, capecitabine
- **Stopped:** empagliflozin (do not restart without Endocrinology), domperidone, pantoprazole
- **Loperamide: not on the discharge list** unless C. difficile is re-tested and negative

## Questions for the teams
**Oncology:** agree to stop piperacillin-tazobactam today (or at 48 h afebrile)? Plan for re-challenge at a DPYD-guided dose?
**Endocrinology:** long-term diabetes regimen without an SGLT2 inhibitor during chemotherapy?
**Ward team:** repeat ECG in 24 h; K and Mg targets; C. difficile re-test threshold communicated to nursing.
`,
};

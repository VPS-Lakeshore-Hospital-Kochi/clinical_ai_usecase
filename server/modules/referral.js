export default {
  id: "referral",
  order: 1.5,
  title: "Referral & Old-Records Digest",
  specialty: "Medical Records / OPD preparation",
  stage: "before",
  date: "2026-07-04",
  summary:
    "Before the OPD visit, reads everything the patient has sent from outside: the GP referral letter, photographed prescriptions, outside lab reports and old discharge summaries. It builds one structured history with the source of every fact, converts units, flags conflicts and unclear handwriting, and lists the questions to ask.",
  claudeRole: "Extracts and reconciles facts from outside documents, citing the source of each. Front-desk staff scan and upload; the doctor confirms every change before anything enters the hospital record.",
  inputLabel: "Outside documents (OCR text)",
  inputHint: "Text extracted from scans and phone photos the patient sent on WhatsApp. OCR may misread handwriting; low-confidence words are marked [?].",
  outputLabel: "Draft pre-visit digest",
  system: `Task: pre-visit digest of outside medical records (GP referral letters, photographed prescriptions, outside laboratory reports, old discharge summaries) for the OPD doctor, reconciled against the hospital record.

Every fact must name its source document and date, for example "(GP letter, 30 Jun 2026)". Never guess a word that OCR marked [?]: list it for confirmation. Convert units to the hospital's units and show the arithmetic. Record only what the documents say; do not diagnose, but do point out patterns the doctor should see. Produce in order:
1. "## For the doctor in 30 seconds": at most 5 bullets, most important first.
2. "## Red flags in the old records": patterns across documents that need attention at this visit.
3. "## Structured history": problem list table (problem | since | source | status in hospital record: matches / new / conflicts); medicine table (medicine & dose | source(s) | status: matches / discrepancy / needs confirmation); allergies with reaction and source; past surgical and admission history; eye, foot and kidney screening status with due dates.
4. "## Results over time": one table of test | date | value in hospital units | source, combining outside and hospital results, with unit conversions shown beneath.
5. "## Conflicts & unclear readings": a table of item | what each source says | suggested resolution.
6. "## Questions for the visit": what to ask the patient or the GP, and what to bring.
7. "## Suggested record updates": items to add or correct in the hospital record, each marked "pending doctor verification".`,
  buildPrompt: (input) => `Outside documents received before the visit:\n\n${input}`,
  defaultInput: `Received via WhatsApp (Lakeshore Care line) 3 Jul 2026 for OPD visit 6 Jul 2026, Endocrinology. Patient: Thomas Varghese, LH-SYN-000158. All documents synthetic.

DOCUMENT A: GP referral letter (typed), Kakkanad Family Clinic, 30 Jun 2026
"Dear Colleague, I am referring Mr Thomas Varghese, 58, known type 2 diabetic (2014) and hypertensive, for review of uncontrolled sugars despite insulin. HbA1c 8.6% in April. He also has right knee osteoarthritis and is on aceclofenac from the orthopaedic clinic. Haemoglobin was 11.1 in April; I started oral iron. Current medicines: metformin 1 g BD, glimepiride 2 mg OD, glargine 16 U HS, telmisartan 40 mg OD, atorvastatin 20 mg HS, ferrous sulphate 200 mg OD. Allergies: NKDA. Kind regards, Family Physician (synthetic)."

DOCUMENT B: photographed prescription (handwritten, OCR), Kakkanad Family Clinic, 22 Apr 2026
"1. Tab Metformin 1 gm 1-0-1
2. Tab Glimepiride 2 mg 1-0-0 before bkfst
3. Inj Glargine 1[?]6 U at bedtime   (OCR: '16' or '18', low confidence)
4. Tab Telma-H 40 1-0-0
5. Tab Atorva 20 0-0-1
6. Tab Ferrous sulphate 200 mg 0-1-0 x 1 month
Review 1 month."

DOCUMENT C: photographed prescription (printed), Ortho Care Clinic, Edappally, 12 Jan 2026
"Diagnosis: OA right knee. Tab Aceclofenac 100 mg 1-0-1 after food x 10 days. Tab Pantoprazole 40 mg 1-0-0 before food x 10 days. Quadriceps exercises. X-ray: grade 3 OA right knee."

DOCUMENT D: outside laboratory report, Kakkanad Diagnostics, 18 Apr 2026
Haemoglobin 11.1 g/dL (13.0–17.0) L; MCV 78 fL (80–100) L; Platelets 312 x10^9/L
HbA1c (IFCC) 70 mmol/mol
Fasting glucose 9.3 mmol/L
Serum creatinine 97 µmol/L
Ferritin: not done. Stool occult blood: not done.

DOCUMENT E: discharge summary (scanned), St. Jude Medical Centre (synthetic), Aluva, 14 Nov 2019
"Diagnosis: left leg cellulitis. Treated with IV cefuroxime. Started on oral co-trimoxazole on day 1; generalised itchy rash on day 2, stopped and changed to cefuroxime. Rash settled. ALLERGY: Sulpha drugs (co-trimoxazole): rash. Past history: T2DM, right inguinal hernia repair (mesh) 2011."

DOCUMENT F: eye screening report, Kakkanad Eye Clinic, 20 Aug 2025
"Dilated fundus exam: mild non-proliferative diabetic retinopathy both eyes, no maculopathy. Review 12 months."

Hospital record (Lakeshore) already holds: Jan 2025 annual review (HbA1c 7.8%, Hb 13.4 g/dL); allergy: sulfonamide antibiotics (rash); 2 Jul 2026 triage (medicines per patient: metformin, glimepiride, night insulin 16 units, BP tablet, cholesterol tablet, aceclofenac most days).`,
  demoOutput: `## For the doctor in 30 seconds
- **Haemoglobin fell from 13.4 to 11.1 g/dL in 15 months, with a low MCV (78)**, in a 58-year-old man. The GP started iron but **no cause was looked for** (ferritin and stool tests not done). Together with the weight loss reported at triage, this needs investigating at this visit.
- **Aceclofenac was prescribed for 10 days in January but has been taken most days for about 6 months** (Doc C; triage 2 Jul), with no stomach protection after the first 10 days.
- **Allergy conflict:** the GP letter says "NKDA", but a 2019 discharge summary records a **rash with co-trimoxazole (sulpha)**, matching our record. Keep the allergy.
- **Diabetes worsening:** HbA1c 7.8% (Jan 2025) → **8.6%** (Apr 2026). Mild diabetic retinopathy found Aug 2025; eye review is due **Aug 2026**.
- **Two unresolved medicine questions:** Telma-H (telmisartan + hydrochlorothiazide) or plain telmisartan? Glargine 16 or 18 units?

## Red flags in the old records
1. **Falling haemoglobin with microcytosis and no investigation.** Hb 13.4 g/dL (Lakeshore, 10 Jan 2025) → 11.1 g/dL, MCV 78 fL (Doc D, 18 Apr 2026). Iron started empirically (Doc A, Doc B); ferritin and stool occult blood **not done** (Doc D). In a man this age, iron-deficiency anaemia needs a cause, including the gastrointestinal tract. Triage (2 Jul) adds about 4 kg unintentional weight loss and tiredness.
2. **Long-term NSAID use.** Aceclofenac 100 mg BD × 10 days with pantoprazole cover (Doc C, 12 Jan 2026), then "on aceclofenac" (Doc A, 30 Jun) and "most days" (triage, 2 Jul). Pantoprazole was for 10 days only. The risks are GI bleeding (which could explain the anaemia), kidney harm with telmisartan ± a diuretic and metformin, and blood pressure.
3. **Progressive diabetes with an established complication.** HbA1c rising despite basal insulin, plus mild non-proliferative retinopathy (Doc F).

## Structured history
**Problems**
| Problem | Since | Source | Status in hospital record |
|---|---|---|---|
| Type 2 diabetes | 2014 | Doc A | Matches |
| Hypertension | Not stated | Doc A | Matches |
| Right knee osteoarthritis, grade 3 on X-ray | Jan 2026 X-ray | Doc C | Matches (X-ray image not received) |
| Mild non-proliferative diabetic retinopathy, both eyes, no maculopathy | Aug 2025 | Doc F | **New** |
| Microcytic anaemia (Hb 11.1, MCV 78) | Apr 2026 | Doc D | **New** (cause not established) |
| Dyslipidaemia | Not stated | Doc A (on atorvastatin) | Matches |

**Medicines**
| Medicine & dose | Source(s) | Status |
|---|---|---|
| Metformin 1 g twice daily | Doc A, Doc B, triage | Matches |
| Glimepiride 2 mg before breakfast | Doc A, Doc B, triage | Matches |
| Insulin glargine **16 U** at bedtime | Doc A (16 U), Doc B (16 or 18 U, unclear), triage (16 U) | **Needs confirmation**: probably 16 U; check the pen |
| **Telmisartan 40 mg** or **Telma-H 40 (telmisartan 40 mg + hydrochlorothiazide 12.5 mg)** | Doc A (telmisartan), Doc B (Telma-H) | **Discrepancy**: ask which strip he takes |
| Atorvastatin 20 mg at bedtime | Doc A, Doc B, triage | Matches |
| Aceclofenac 100 mg twice daily | Doc C (10 days only), Doc A, triage (most days) | **Discrepancy**: prescribed short course, taken long term |
| Pantoprazole 40 mg daily | Doc C (10 days, Jan) | Course ended; **not taken now** |
| Ferrous sulphate 200 mg daily | Doc A, Doc B (1 month from 22 Apr) | **Needs confirmation**: not in the triage medicine list; ask whether he still takes it |

**Allergies**
- **Sulfonamide antibiotics (co-trimoxazole): generalised itchy rash**, Nov 2019 (Doc E). Already in the hospital record. The GP letter's "NKDA" (Doc A) is incorrect.
- Hydrochlorothiazide (if in Telma-H) is a non-antibiotic sulfonamide. Cross-reactivity with a sulfonamide-antibiotic rash is uncommon; the doctor should know he may already be taking it without a reaction.

**Past surgery and admissions**
- Right inguinal hernia repair with mesh, 2011 (Doc E).
- Admission for left leg cellulitis, Nov 2019, IV cefuroxime (Doc E).

**Screening status**
| Screening | Last done | Result | Next due |
|---|---|---|---|
| Diabetic eye exam | 20 Aug 2025 (Doc F) | Mild NPDR, no maculopathy | **Aug 2026** |
| Diabetic foot exam | No record found | — | **Overdue: examine at this visit** |
| Urine albumin-creatinine ratio | No record found | — | **Overdue: send at this visit** |

## Results over time
| Test | Date | Value (hospital units) | Source |
|---|---|---|---|
| HbA1c | 10 Jan 2025 | 7.8% | Lakeshore |
| HbA1c | 18 Apr 2026 | **8.6%** | Doc D (converted) |
| Haemoglobin | 10 Jan 2025 | 13.4 g/dL | Lakeshore |
| Haemoglobin | 18 Apr 2026 | **11.1 g/dL (L)** | Doc D |
| MCV | 18 Apr 2026 | **78 fL (L)** | Doc D |
| Platelets | 18 Apr 2026 | 312 × 10⁹/L | Doc D |
| Fasting glucose | 18 Apr 2026 | 168 mg/dL | Doc D (converted) |
| Creatinine | 18 Apr 2026 | 1.10 mg/dL | Doc D (converted) |
| eGFR (CKD-EPI 2021) | 18 Apr 2026 | **78 mL/min/1.73 m²** (calculated) | Calculated from Doc D |

Conversions:
- HbA1c: 70 mmol/mol ÷ 10.929 + 2.15 = **8.6%**
- Glucose: 9.3 mmol/L × 18.0 = **168 mg/dL**
- Creatinine: 97 µmol/L ÷ 88.4 = **1.10 mg/dL**. eGFR by CKD-EPI 2021 for a 58-year-old man = **78**: stage G2 if persistent; albuminuria not yet measured.

## Conflicts & unclear readings
| Item | What each source says | Suggested resolution |
|---|---|---|
| Drug allergy | Doc A: "NKDA". Doc E and hospital record: sulpha (co-trimoxazole) rash | **Keep the sulfonamide allergy.** Tell the GP their record is incomplete. |
| BP medicine | Doc A: telmisartan 40 mg. Doc B: Telma-H 40 | Ask him to bring the strip; matters for potassium, sodium and glucose |
| Glargine dose | Doc A: 16 U. Doc B: "1[?]6", 16 or 18 U. Triage: 16 U | Confirm from the pen or his diary before any dose change |
| Aceclofenac duration | Doc C: 10 days. Doc A and triage: ongoing | Record as long-term use since about Jan 2026 |
| Iron | Doc B: 1 month from 22 Apr. Not in triage list | Ask whether he took it, for how long, and any side effects |

## Questions for the visit
1. Any black or tarry stools, blood in the stool, or change in bowel habit? Any indigestion or stomach pain on aceclofenac?
2. Did he take the iron? Did it help or upset his stomach?
3. Which BP tablet: Telma or Telma-H? Bring the strip.
4. Glargine dose on the pen: 16 or 18 units?
5. How much aceclofenac, and has he taken other painkillers bought over the counter?
6. Any previous colonoscopy or endoscopy? (none found in the documents)
7. **Ask him to bring:** the knee X-ray film (Jan 2026), all medicine strips, and his glucose diary.
8. **Ask the GP** for any ferritin, stool or endoscopy results since April.

## Suggested record updates
- Add **mild non-proliferative diabetic retinopathy, both eyes (Aug 2025)**; eye review due Aug 2026. *Pending doctor verification.*
- Add **microcytic anaemia, Hb 11.1 g/dL, MCV 78 fL (18 Apr 2026, outside lab)**, cause not established. *Pending doctor verification.*
- Add outside results from 18 Apr 2026 (HbA1c 8.6%, fasting glucose 168 mg/dL, creatinine 1.10 mg/dL) to the lab history, marked "external". *Pending doctor verification.*
- Add past surgical history: **right inguinal hernia mesh repair, 2011**; admission for **left leg cellulitis, Nov 2019**. *Pending doctor verification.*
- Allergy entry: add the reaction detail (**co-trimoxazole, generalised itchy rash, Nov 2019**). *Pending doctor verification.*
- Medicines: mark **aceclofenac as long-term use** and the **antihypertensive and glargine dose as "to confirm"**. *Pending doctor verification.*
`,
};

import { patient } from "../patient.js";

const d = patient.documents;

export default {
  id: "discharge",
  order: 5,
  title: "Intelligent Discharge",
  specialty: "Surgical Gastroenterology",
  stage: "discharge",
  date: "2026-08-24",
  summary:
    "Turns the inpatient stay into a physician discharge summary, reconciled medications, a follow-up plan across specialties and plain-English home instructions.",
  claudeRole: "Drafts the summary, reconciles medicines and writes the patient instructions. The treating team verifies and signs.",
  inputLabel: "Inpatient course & discharge medications",
  inputHint: "Progress notes, key events and the discharge medication list. Claude reconciles them against the pre-admission list in the chart.",
  outputLabel: "Draft discharge pack",
  system: `Task: produce a discharge pack after an inpatient stay.

Produce in order:
1. "## Medication safety check": reconcile pre-admission medications against discharge medications in a table of drug | before admission | at discharge | change | reason. Flag omissions, duplications, interactions, allergy conflicts and drugs needing a restart date.
2. "## Discharge summary (for clinicians)": admission and discharge dates, diagnoses, procedure, key findings including final pathology, hospital course by problem, condition at discharge, pending results.
3. "## Follow-up plan": a table of when | with whom | purpose, covering every specialty involved.
4. "## Instructions for you (patient copy)": plain English at about a 6th-grade reading level, with headings for Your operation, Your medicines, Wound and bowels, Eating, Blood sugar, Activity, and "Come back to hospital or call immediately if..." (specific warning signs). Use "you".
5. "## Medication calendar": a simple table of time of day (morning / afternoon / night) against medicines for the patient.`,
  buildPrompt: (input) =>
    `${input}\n\nOperative note:\n${d.operativeNote}\n\nFinal pathology:\n${d.pathologyResection}`,
  defaultInput: `Admission: 18 Aug 2026 (elective). Planned discharge: 24 Aug 2026 (post-operative day 5).
Procedure: Laparoscopic anterior resection, 19 Aug 2026 (ERAS pathway).
Pre-op: Hb 11.6 after IV iron (6 Aug). Empagliflozin held from 15 Aug. Metformin held on the day of surgery.
Course:
- POD 0–1: Epidural-free, multimodal analgesia. Glucose 220–280 mg/dL; started basal-bolus insulin (glargine 14 U + lispro 4 U with meals + correction).
- POD 2: Mild ileus, nausea; NG tube not required; ondansetron. Chewing gum, early mobilisation.
- POD 3: Passing flatus, tolerating soft diet. Metformin restarted.
- POD 4: Bowels opened. Glucose 140–190 mg/dL. Lispro stopped (eating less than usual). Wound clean, port sites healing.
- POD 5: Afebrile, pain controlled on paracetamol, mobilising independently with a stick (knee). Creatinine 1.0, Hb 10.9, WBC 9.2, CRP falling.
Discharge medications: Metformin 1000 mg BD, insulin glargine 14 U at bedtime, telmisartan 40 mg OD, atorvastatin 40 mg HS, enoxaparin 40 mg SC OD for 28 days total from surgery, paracetamol 1 g QID PRN (max 4 g/day), pantoprazole 40 mg OD for 2 weeks, lactulose 15 mL HS PRN.
Empagliflozin: to restart after discharge once eating and drinking normally.
Pending: none. Oncology clinic referral made.`,
  demoOutput: `## Medication safety check
| Drug | Before admission | At discharge | Change | Reason |
|---|---|---|---|---|
| Metformin | 1000 mg BD | 1000 mg BD | — | Restarted POD 3, creatinine 1.0 |
| Glimepiride | 2 mg OD (stopped 20 Jul) | — | Stopped | Nocturnal hypoglycaemia; do **not** restart |
| Insulin glargine | 12 U HS | **14 U HS** | ↑ 2 U | Post-operative hyperglycaemia; titrate at Endo review |
| Empagliflozin | 10 mg OD (held 15 Aug) | **On hold** | Restart date needed | Restart when eating/drinking normally. **Suggest a named restart date (e.g. 27 Aug) after a phone check** |
| Telmisartan | 40 mg OD | 40 mg OD | — | BP stable |
| Atorvastatin | 20 mg HS | **40 mg HS** | ↑ | LDL above target (Endo recommendation) |
| Aceclofenac | PRN (stopped 6 Jul) | — | Stopped | **Avoid NSAIDs**: new anastomosis, renal function, GI bleed risk |
| Enoxaparin | — | 40 mg SC OD | New | Extended VTE prophylaxis after abdominal cancer surgery, **until 16 Sep (28 days)** |
| Paracetamol | 650 mg PRN | 1 g QID PRN | ↑ | Max 4 g/day |
| Pantoprazole | — | 40 mg OD × 2 weeks | New | Stop date 7 Sep |
| Lactulose | — | 15 mL HS PRN | New | Avoid straining |

**Flags**
- ⚠️ **Enoxaparin**: confirm who injects (patient or wife), teach technique and sharps disposal. Check platelet count if continued beyond 2 weeks per protocol.
- ⚠️ **Sulfonamide allergy**: no sulfonamide drugs on the list. ✅
- ⚠️ Knee pain: paracetamol only. Opioids were not prescribed; review analgesia if knee pain limits mobility.

## Discharge summary (for clinicians)
- **Admitted:** 18 Aug 2026 | **Discharged:** 24 Aug 2026 (POD 5) | **Consultant team:** Surgical Gastroenterology
- **Diagnoses:** (1) Sigmoid adenocarcinoma, **pT3 pN1b (2/18) M0, stage IIIB**, R0, pMMR, KRAS G12D, BRAF wt. (2) T2DM with post-operative hyperglycaemia. (3) Iron-deficiency anaemia, treated. (4) Right knee OA (TKA deferred). (5) Hypertension. (6) Diabetic peripheral neuropathy.
- **Procedure:** Laparoscopic anterior resection with high IMA ligation, stapled anastomosis, no stoma (19 Aug 2026). EBL 150 mL.
- **Course:** ERAS pathway. POD 0–1 hyperglycaemia 220–280 mg/dL managed with basal-bolus insulin. Mild ileus on POD 2 resolved conservatively. Diet advanced POD 3; bowels opened POD 4. No fever, no signs of anastomotic leak.
- **At discharge:** afebrile, mobilising with a stick, wounds clean. Hb 10.9, creatinine 1.0, WBC 9.2, CRP falling.
- **Pending results:** none.
- **Plan:** adjuvant CAPOX, **3 months per MDT criteria for low-risk stage III (pT3 N1)**, to confirm at Oncology. TKA deferred until after chemotherapy.

## Follow-up plan
| When | With whom | Purpose |
|---|---|---|
| 31 Aug (1 week) | Surgical Gastro OPD | Wound check, bowel function, pathology discussion |
| 2 Sep | Endocrinology (tele-consult) | Insulin titration, empagliflozin restart confirmed, **chemo-period glucose plan** |
| 7–14 Sep | Medical Oncology | Start CAPOX within 6–8 weeks of surgery; baseline neuropathy score; antiemetic plan (steroid-sparing) |
| Weekly × 4 | Nurse phone call | Glucose log, enoxaparin adherence, warning signs |
| After chemotherapy | Orthopaedics | Re-plan right TKA |
| 4 weeks | Lab | Hb, ferritin |

## Instructions for you (patient copy)
**Your operation**
You had keyhole surgery to remove the part of your bowel that had the cancer. The surgeon removed all of it that could be seen, and the edges were clear. Some lymph glands had cancer cells, so the cancer doctor will talk to you about tablets and drip treatment (chemotherapy) to lower the chance of it coming back.

**Your medicines**
- Use the medicine calendar below.
- **Do not take aceclofenac, ibuprofen or other "pain killer" tablets.** Use paracetamol only.
- **Enoxaparin injection** once a day under the skin of your tummy until **16 September**. It prevents blood clots.
- **Do not restart empagliflozin yet.** We will phone you to tell you when.

**Wound and bowels**
- Keep the small wounds dry for 48 hours, then you can shower. Pat them dry.
- Your bowel habit may be irregular for a few weeks. Use lactulose at night if you have not passed stool for 2 days.

**Eating**
- Eat small, soft meals 5–6 times a day for 2 weeks: kanji, idli, soft rice with dal, fish curry and cooked vegetables.
- Drink 8–10 glasses of water a day.

**Blood sugar**
- Check your sugar before breakfast and before dinner. Write it down.
- If it is **below 70**, take 3 teaspoons of sugar in water and call us.
- If it is **above 300 twice in a row**, call us.

**Activity**
- Walk around the house several times a day, using your stick for your knee.
- No lifting over 5 kg for 6 weeks. No driving for 2 weeks.

**Come back to hospital or call immediately if you have:**
- Fever over 100.4 °F (38 °C) or shivering
- Tummy pain that is getting worse, or a hard, swollen tummy
- Vomiting and unable to keep fluids down
- Blood from the back passage, or black stools
- Redness, pus or opening of a wound
- Pain, swelling or redness in one leg, or sudden breathlessness or chest pain
- Sugar below 70 that does not improve, or you feel confused

## Medication calendar
| Medicine | Morning | Afternoon | Night |
|---|---|---|---|
| Metformin 1000 mg | ✔ after breakfast | | ✔ after dinner |
| Telmisartan 40 mg | ✔ | | |
| Pantoprazole 40 mg (until 7 Sep) | ✔ before breakfast | | |
| Enoxaparin 40 mg injection (until 16 Sep) | | | ✔ same time daily |
| Insulin glargine 14 units | | | ✔ at bedtime |
| Atorvastatin 40 mg | | | ✔ |
| Paracetamol 1 g (only if pain) | as needed | as needed | as needed |
| Lactulose 15 mL (only if needed) | | | as needed |
`,
};

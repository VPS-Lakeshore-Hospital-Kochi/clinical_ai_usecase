import { patient } from "../patient.js";

export default {
  id: "labs",
  order: 9.7,
  title: "Lab & Report Explainer",
  specialty: "Laboratory / Surgical OPD",
  stage: "consultation",
  date: "2026-08-31",
  summary:
    "Turns a pathology report and a set of lab results into two versions: a trend-aware summary for the clinician, and a plain-language take-home explanation for the patient after the doctor has discussed the results.",
  claudeRole: "Reads results against earlier values, writes the clinician summary and the patient explanation. The doctor discusses results first; Claude explains, it does not break news.",
  inputLabel: "Results to explain & context",
  inputHint: "The report and today's labs, plus what the doctor has already told the patient. Claude compares every value with earlier results in the chart.",
  outputLabel: "Draft summary & explanation",
  system: `Task: explain laboratory and pathology results, producing one version for clinicians and one for the patient.

The patient version is given only after the doctor has discussed the results: never introduce news the doctor has not covered, never give survival figures, and point back to the care team for decisions. Produce in order:
1. "## Clinician summary": a table of result | today | previous (date) | trend | significance, then 2–3 lines on what needs action.
2. "## Needs attention": anything abnormal that needs follow-up, with who should act, or "Nothing urgent".
3. "## Your results explained (patient copy)": plain English at about a 6th-grade reading level, addressed to the patient as "you", with short headings per result. Explain what each test measures, what the result means for them, and what happens next. Be warm and accurate; do not over-reassure.
4. "## Words you may hear": a short glossary of 5–8 terms from the report.
5. "## Questions you may want to ask your doctor": 4–6 suggested questions.`,
  buildPrompt: (input) => `${input}\n\nResection histopathology on file:\n${patient.documents.pathologyResection}`,
  defaultInput: `Surgical OPD, 31 Aug 2026 (post-operative day 12). Wound check done; the surgeon has already discussed the pathology with Mr. Thomas and his wife: all visible cancer removed with clear margins, 2 lymph nodes involved, stage III, chemotherapy recommended to lower the risk of return. Referral to Medical Oncology made.
Patient asked for "something to read at home that explains the report and the blood tests".

Today's labs (31 Aug):
- CEA 2.1 ng/mL (ref <5.0). Previous: 6.8 on 29 Jul (before surgery).
- Haemoglobin 11.2 g/dL (ref 13.0–17.0). Previous: 10.9 on 24 Aug, 9.8 on 4 Aug, 10.2 on 6 Jul.
- Creatinine 1.0 mg/dL. Previous: 1.0 on 24 Aug, 1.23 on 6 Jul.
- HbA1c 8.3% (14 Aug). Previous: 9.1% on 6 Jul.
Reading level: comfortable in English; prefers short sentences.`,
  demoOutput: `## Clinician summary
| Result | Today | Previous (date) | Trend | Significance |
|---|---|---|---|---|
| CEA | 2.1 ng/mL | 6.8 (29 Jul, pre-op) | ↓ Normalised | Consistent with complete resection; establishes the post-operative baseline for surveillance |
| Pathology stage | pT3 pN1b M0, IIIB | cT3 cN1 (CT 1 Aug) | Confirmed | 2/18 nodes; ≥12 nodes examined; R0; no LVI/PNI, no tumour deposits; pMMR |
| Haemoglobin | 11.2 g/dL | 10.9 (24 Aug), 9.8 (4 Aug) | ↑ Improving | Iron repletion and loss of the bleeding source; recheck ferritin at 4–6 weeks |
| Creatinine | 1.0 mg/dL | 1.0 (24 Aug), 1.23 (6 Jul) | Stable | Improved since NSAID stopped |
| HbA1c | 8.3% (14 Aug) | 9.1% (6 Jul) | ↓ Improving | Still above target; Endocrinology review on 2 Sep |

**Action:** proceed with the Medical Oncology referral (adjuvant CAPOX; pT3 N1 = low-risk stage III, consistent with 3 months). Surveillance CEA to follow this baseline. Ferritin at 4–6 weeks.

## Needs attention
- **Nothing urgent.**
- Haemoglobin is still mildly low and improving: ferritin and Hb recheck in 4–6 weeks (Surgical / Oncology team).
- HbA1c is above target before chemotherapy: Endocrinology review already booked for 2 Sep.

## Your results explained (patient copy)
**Your operation report (pathology)**
After your operation, a specialist doctor looked at the removed piece of bowel under a microscope.
- **The cancer was removed completely.** The edges of the removed piece had no cancer cells. Doctors call this "clear margins".
- **2 of the 18 lymph glands** removed with the bowel had cancer cells. Lymph glands are small filters near the bowel. Because some glands were involved, your doctors call this **stage III** and recommend chemotherapy to lower the chance of the cancer coming back.
- **No cancer was seen in the small blood vessels or nerves** near the tumour. This is a helpful finding.

**CEA (a blood marker)**
CEA is a substance some bowel cancers release into the blood. Yours was **6.8 before the operation** and is now **2.1, back in the normal range**. This fits with the tumour having been removed. Your doctors will check it regularly over the coming years. On its own, one normal result does not mean you do not need chemotherapy.

**Haemoglobin (blood count)**
Haemoglobin carries oxygen in your blood. It was low because the tumour was bleeding slowly. It is now **11.2 and rising**, thanks to the iron drip and the operation. You may still feel a little tired; this should improve over the next weeks.

**Kidney test (creatinine)**
Your kidneys are working well (1.0). This is better than in July, after you stopped the aceclofenac pain tablets.

**Sugar control (HbA1c)**
This shows your average sugar over three months. It has come down from **9.1% to 8.3%**, which is good progress, but it is still higher than we would like before chemotherapy. You will see the diabetes doctor on 2 September.

**What happens next**
You will meet the cancer doctor (Medical Oncology) to plan chemotherapy. Keep taking your medicines, and bring this sheet and your questions to that appointment.

## Words you may hear
- **Adenocarcinoma:** the most common type of bowel cancer
- **Margins:** the edges of the removed tissue; "clear" means no cancer at the edges
- **Lymph nodes (glands):** small filters that can trap cancer cells
- **Stage III:** cancer that has reached nearby lymph glands but not other organs
- **Adjuvant chemotherapy:** treatment after surgery to lower the chance of the cancer returning
- **CEA:** a blood marker used to follow bowel cancer over time
- **pMMR:** a result about how the cancer cells repair their genes; it helps doctors choose treatment

## Questions you may want to ask your doctor
1. Which chemotherapy do you recommend, and for how long?
2. What side effects should I watch for, and who do I call?
3. How will chemotherapy affect my diabetes and sugar checks?
4. How often will you check my CEA and do scans after treatment?
5. When can I think about my knee operation again?
6. Is there anything I can do myself (food, walking) to help my recovery?
`,
};

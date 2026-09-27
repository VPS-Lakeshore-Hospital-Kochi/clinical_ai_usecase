import { patient } from "../patient.js";

const d = patient.documents;

export default {
  id: "oncology",
  order: 5,
  title: "Tumour Board Assistant",
  specialty: "Oncology",
  stage: "specialty",
  date: "2026-08-05",
  summary:
    "Condenses colonoscopy, pathology, molecular, CT and comorbidity data into a one-page tumour board pack: staging, guideline options, discussion points and trial eligibility.",
  claudeRole: "Prepares the case, maps it to guideline options and lists questions for the board. The multidisciplinary board decides.",
  inputLabel: "Tumour board referral",
  inputHint: "Referral question plus reports. Claude cross-references the full chart (diabetes, planned knee surgery) automatically.",
  outputLabel: "Draft tumour board pack",
  system: `Task: prepare a multidisciplinary tumour board (MDT) case pack.

Produce in order:
1. "## Case at a glance": 4–6 lines covering who, what was found, stage and the question for the board.
2. "## Staging": clinical TNM (AJCC 8th edition) with the evidence for each component, the stage group, and what would change it.
3. "## Key biology": MMR/MSI status, RAS/BRAF, and what each means now versus if the disease recurs. Mention germline testing considerations.
4. "## Guideline-concordant options": a table of option | sequence | evidence / guideline (NCCN or ESMO) | fit for this patient.
5. "## Patient-specific considerations": comorbidities and how they change the treatment plan (for example chemotherapy toxicities interacting with diabetes, neuropathy or renal function; timing against other planned surgery).
6. "## Questions for the board": numbered, specific decisions to take.
7. "## Clinical trial considerations": trial types or designs to search for (CTRI, ClinicalTrials.gov). Do not invent trial IDs.
8. "## Draft MDT outcome (for board to amend)": a short, structured summary with fields left to confirm.`,
  buildPrompt: (input) =>
    `${input}\n\nReports:\n${d.colonoscopy}\n\n${d.pathologyBiopsy}\n\n${d.ctStaging}`,
  defaultInput: `Referral to GI Multidisciplinary Tumour Board, 5 August 2026.
Referred by: Gastroenterology, after an iron-deficiency anaemia workup triggered at Orthopaedic pre-op optimisation.
Performance status: ECOG 1 (limited by knee OA, not by cancer symptoms).
CEA 6.8 ng/mL (29 July). Hb 9.8 g/dL (4 Aug), IV ferric carboxymaltose 1 g given 6 Aug.
Comorbidities: T2DM (regimen changed 20 July; now metformin, glargine 12 U, empagliflozin 10 mg), diabetic peripheral neuropathy (reduced monofilament), eGFR 68 with albuminuria, hypertension, BMI 31. Right TKA planned but on hold.
Question: Confirm stage and recommend a treatment sequence. Advise on timing of the knee replacement.`,
  demoOutput: `## Case at a glance
- 58-year-old man, ECOG 1, T2DM with peripheral neuropathy, eGFR 68, BMI 31.
- **Sigmoid adenocarcinoma** found on colonoscopy after **iron-deficiency anaemia flagged during knee-replacement optimisation**.
- CT: 4.5 cm sigmoid thickening with pericolic stranding, 3 pericolic nodes (≤11 mm), no distant metastases. CEA 6.8.
- pMMR, KRAS G12D mutant, BRAF wild-type.
- **Question:** confirm stage, treatment sequence, and timing of right TKA.

## Staging
| Component | Assessment | Evidence |
|---|---|---|
| T | **cT3** | Pericolic fat stranding without invasion of adjacent organs |
| N | **cN1** (1–3 nodes) | 3 pericolic nodes, largest 11 mm (CT nodal staging is imprecise) |
| M | **cM0** | No liver/lung lesions, no ascites |
| Stage group | **Clinical stage III (cT3 N1 M0)** | Final stage depends on resection pathology |

**What would change it:** pT4 or ≥4 positive nodes (pN2) would make it *high-risk* stage III and lengthen adjuvant therapy. pN0 would make it stage II.

## Key biology
- **pMMR / MSS**: Lynch syndrome unlikely. Not eligible for neoadjuvant immunotherapy approaches (these apply to dMMR tumours). Standard fluoropyrimidine–oxaliplatin adjuvant therapy applies.
- **KRAS G12D**: no role in the curative setting. If metastatic disease occurs later, it excludes anti-EGFR therapy. KRAS G12D-directed agents are investigational.
- **Germline**: universal MMR screening is reassuring. Formal germline testing is optional given age 58 and no family history; offer counselling per institutional policy.

## Guideline-concordant options
| Option | Sequence | Evidence / guideline | Fit for this patient |
|---|---|---|---|
| **A. Upfront surgery → adjuvant chemo** | Laparoscopic sigmoid colectomy / anterior resection with high IMA ligation (≥12 nodes) → CAPOX 3 mo (low-risk III) or 6 mo (high-risk III) | NCCN Colon; ESMO; IDEA collaboration (3 vs 6 mo) | **Preferred.** Standard of care for resectable non-obstructing colon cancer |
| B. Neoadjuvant FOLFOX → surgery | 6 weeks of FOLFOX pre-op, then surgery | FOxTROT; NCCN option for bulky cT4b | Less compelling for cT3 N1 without local invasion |
| C. Surgery alone | Colectomy, no adjuvant therapy | Not concordant for stage III | Only if unfit for chemotherapy (he is fit) |

## Patient-specific considerations
- **Oxaliplatin + existing diabetic neuropathy**: higher risk of disabling cumulative neuropathy. This favours **CAPOX 3 months if pT1–3 N1** (IDEA: less neuropathy, small DFS difference) and documenting baseline neuropathy scores. Consider early dose modification.
- **Glycaemia during chemotherapy**: dexamethasone antiemetic premedication will cause hyperglycaemia, so plan a steroid-sparing antiemetic regimen or a correction insulin scale. Capecitabine diarrhoea and dehydration raise the **SGLT2 inhibitor DKA / AKI risk**: give sick-day rules and hold empagliflozin during significant GI toxicity.
- **Renal**: eGFR 68 means no capecitabine dose reduction (adjust if CrCl <50). Monitor.
- **Peri-operative**: hold empagliflozin ≥3 days pre-op, metformin on the day of surgery. Aim for glucose <180 mg/dL. ERAS pathway.
- **Anaemia**: continue iron repletion; recheck Hb before surgery.
- **Knee replacement timing**: **defer TKA until adjuvant therapy is complete and blood counts and wound healing have recovered** (typically ≥6–8 weeks after the last cycle), with surveillance CEA/CT showing no recurrence. An intra-articular steroid injection can bridge knee pain if needed (monitor glucose).

## Questions for the board
1. Agree clinical stage III (cT3 N1 M0) and upfront laparoscopic resection?
2. Adjuvant regimen and duration contingent on pathology: CAPOX 3 mo if pT1–3 N1, 6 mo if pT4 or N2?
3. Neuropathy mitigation: baseline assessment and threshold for stopping oxaliplatin early?
4. Referral to genetic counselling: yes/no?
5. Sequence for right TKA: provisional date ≥ 3 months after end of chemotherapy?
6. Role for post-operative ctDNA testing (research / prognostic only)?

## Clinical trial considerations
- Search **CTRI** and **ClinicalTrials.gov** for: *ctDNA-guided adjuvant therapy in stage III colon cancer* (designs similar to DYNAMIC-III / CIRCULATE), *oxaliplatin-induced neuropathy prevention*, and *exercise or lifestyle interventions during adjuvant chemotherapy*.
- Eligibility checks: ECOG 0–1, adequate renal function, diabetes controlled. Confirm site availability in Kerala.

## Draft MDT outcome (for board to amend)
- **Diagnosis:** Sigmoid adenocarcinoma, moderately differentiated, pMMR, KRAS G12D, BRAF wt.
- **Stage:** cT3 cN1 cM0, clinical stage III.
- **Recommendation:** Laparoscopic anterior resection (ERAS) → adjuvant CAPOX, duration per final pathology: ___
- **Supportive:** baseline neuropathy score; steroid-sparing antiemetics; diabetes plan by Endocrinology; continue iron.
- **Knee:** Right TKA deferred until after adjuvant therapy; Ortho to re-review at: ___
- **Genetics referral:** ___ | **Trial screening:** ___
- **Board members present:** ___ | **Date:** 5 Aug 2026
`,
};

import { obj, str, list, bool } from "./schema.js";

// Clinician view: tumour board with app-calculated AJCC stage → Claude's case pack, options and action list.
export default {
  instructions: `Prepare the multidisciplinary tumour board pack as JSON for the board's screen. The app calculates the AJCC 8th edition stage group from the T, N and M the board selects; give the evidence for each component.
- glance: 4–6 short lines. biology: each marker with what it means now and at recurrence.
- options: guideline-concordant options with sequence, evidence (NCCN/ESMO) and fit for this patient; mark the preferred one.
- considerations: comorbidity-specific points that change the plan.
- questions: specific decisions for the board. trials: trial designs to search for; never invent trial IDs.
- actions: tasks that must happen after the meeting, each with an owner and a due point.`,
  schema: obj({
    glance: list(str()),
    stagingEvidence: obj({ t: str(), n: str(), m: str(), wouldChange: str() }),
    biology: list(obj({ marker: str(), result: str(), meaning: str() })),
    options: list(obj({ name: str(), sequence: str(), evidence: str(), fit: str(), preferred: bool() })),
    considerations: list(obj({ topic: str(), detail: str() })),
    questions: list(str()),
    trials: list(str()),
    actions: list(obj({ action: str(), owner: str(), due: str() })),
  }),
  toText(payload) {
    return `${payload.referral || ""}\n\nBoard staging selection: ${payload.t} ${payload.n} ${payload.m} → AJCC stage ${payload.stage} (calculated by the app).`;
  },
  demo: {
    glance: [
      "58-year-old man, ECOG 1, type 2 diabetes with peripheral neuropathy, eGFR 68, BMI 31.",
      "Sigmoid adenocarcinoma found at colonoscopy after iron-deficiency anaemia was flagged during knee-replacement optimisation.",
      "CT: 4.5 cm sigmoid thickening with pericolic stranding, 3 suspicious pericolic nodes (≤11 mm), no distant metastases. CEA 6.8.",
      "pMMR, KRAS G12D mutant, BRAF wild-type.",
      "Question: confirm stage, treatment sequence and timing of the right knee replacement.",
    ],
    stagingEvidence: {
      t: "cT3: pericolic fat stranding with spiculation <5 mm beyond the muscularis; no invasion of adjacent organs",
      n: "cN1: 3 pericolic nodes, largest 11 mm, round, one irregular (CT nodal staging is imprecise)",
      m: "cM0: no liver or lung lesions, no ascites; the 1.6 cm left adrenal nodule is a lipid-rich adenoma (8 HU)",
      wouldChange: "pT4 or 4 or more positive nodes (pN2) would make it high-risk stage III and lengthen adjuvant therapy; pN0 would make it stage II.",
    },
    biology: [
      { marker: "MMR / MSI", result: "pMMR (MSS)", meaning: "Lynch syndrome unlikely; not eligible for neoadjuvant immunotherapy (that applies to dMMR); standard fluoropyrimidine–oxaliplatin adjuvant therapy" },
      { marker: "KRAS", result: "G12D mutant", meaning: "No role in the curative setting; if metastatic later, excludes anti-EGFR therapy; G12D-directed agents are investigational" },
      { marker: "BRAF", result: "Wild-type", meaning: "No adverse BRAF V600E prognosis" },
      { marker: "Germline", result: "Not indicated routinely", meaning: "MMR screening reassuring; offer counselling per institutional policy" },
    ],
    options: [
      { name: "A. Upfront surgery, then adjuvant chemotherapy", sequence: "Laparoscopic anterior resection with high IMA ligation (≥12 nodes) → CAPOX 3 months (low-risk III) or 6 months (high-risk III)", evidence: "NCCN Colon; ESMO; IDEA collaboration", fit: "Preferred: standard of care for resectable, non-obstructing colon cancer", preferred: true },
      { name: "B. Neoadjuvant FOLFOX, then surgery", sequence: "6 weeks of FOLFOX before surgery", evidence: "FOxTROT; NCCN option for bulky cT4b", fit: "Less compelling for cT3 N1 without local invasion", preferred: false },
      { name: "C. Surgery alone", sequence: "Colectomy, no adjuvant therapy", evidence: "Not concordant for stage III", fit: "Only if unfit for chemotherapy; he is fit", preferred: false },
    ],
    considerations: [
      { topic: "Oxaliplatin and existing neuropathy", detail: "Higher risk of disabling cumulative neuropathy: favours CAPOX 3 months if pT1–3 N1; document a baseline neuropathy score; consider early dose modification." },
      { topic: "Glucose during chemotherapy", detail: "Dexamethasone premedication causes hyperglycaemia: plan steroid-sparing antiemetics or a correction scale. Capecitabine diarrhoea raises SGLT2 inhibitor DKA and AKI risk: sick-day rules; hold empagliflozin during GI toxicity." },
      { topic: "DPYD genotyping", detail: "Before the first fluoropyrimidine dose (EMA/ESMO; CPIC dosing if a variant). A send-out test: the result must be back before cycle 1." },
      { topic: "Kidney function", detail: "eGFR 68: no capecitabine dose reduction (adjust if CrCl <50). Monitor." },
      { topic: "Around surgery", detail: "Hold empagliflozin ≥3 days before and metformin on the day; glucose <180 mg/dL; ERAS pathway." },
      { topic: "Knee replacement timing", detail: "Defer until adjuvant therapy is complete and counts and wound healing have recovered (typically ≥6–8 weeks after the last cycle), with no recurrence on surveillance. An intra-articular steroid injection can bridge pain (monitor glucose)." },
    ],
    questions: [
      "Agree clinical stage III (cT3 N1 M0) and upfront laparoscopic resection?",
      "Adjuvant regimen and duration by final pathology: CAPOX 3 months if pT1–3 N1, 6 months if pT4 or N2?",
      "Neuropathy: baseline assessment and threshold for stopping oxaliplatin early?",
      "Referral to genetic counselling: yes or no?",
      "Right knee replacement: provisional date at least 3 months after chemotherapy ends?",
      "Post-operative ctDNA testing (research or prognostic only)?",
    ],
    trials: [
      "ctDNA-guided adjuvant therapy in stage III colon cancer (designs like DYNAMIC-III / CIRCULATE): search CTRI and ClinicalTrials.gov",
      "Prevention of oxaliplatin-induced neuropathy",
      "Exercise or lifestyle interventions during adjuvant chemotherapy",
    ],
    actions: [
      { action: "Send DPYD genotype and track the result", owner: "Medical oncology", due: "Result before chemotherapy cycle 1" },
      { action: "Baseline neuropathy score", owner: "Medical oncology", due: "Before cycle 1" },
      { action: "Diabetes plan for surgery and chemotherapy (steroid-sparing antiemetics, sick-day rules)", owner: "Endocrinology", due: "Before surgery" },
      { action: "Schedule laparoscopic anterior resection (ERAS)", owner: "Surgical gastroenterology", due: "Within 2–3 weeks" },
      { action: "Recheck haemoglobin after IV iron", owner: "Surgical gastroenterology", due: "Pre-operative visit" },
      { action: "Orthopaedic re-review of the knee", owner: "Orthopaedics", due: "After adjuvant therapy" },
    ],
  },
};

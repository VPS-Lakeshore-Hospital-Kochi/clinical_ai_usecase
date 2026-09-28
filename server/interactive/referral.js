import { obj, str, list, oneOf } from "./schema.js";

const src = () => list(obj({ doc: oneOf(["A", "B", "C", "D", "E", "F", "Record"]), quote: str("Verbatim text from that document, or empty for the hospital record") }));

// Clinician view: outside documents with every extracted fact linked back to its source text.
export default {
  instructions: `Build the pre-visit digest from the outside documents below, as JSON for the OPD doctor's screen. The app converts units and calculates eGFR (listed); do not recalculate them.
- Every fact must cite its sources: the document letter (A–F, or "Record" for the hospital record) and a verbatim quote from that document that locates it (exact, case-sensitive substring). Never guess a word OCR marked [?]: list it under conflicts.
- summary: at most 5 bullets for the doctor. redFlags: patterns across documents that need attention at this visit.
- problems, medicines and allergies with their status against the hospital record.
- conflicts: what each source says and the suggested resolution. questions: for the patient or the GP.
- updates: proposed changes to the hospital record, each pending doctor verification.`,
  schema: obj({
    summary: list(str()),
    redFlags: list(obj({ title: str(), detail: str(), sources: src() })),
    problems: list(obj({ problem: str(), since: str(), status: oneOf(["Matches", "New", "Conflicts"]), sources: src() })),
    medicines: list(obj({ medicine: str(), status: oneOf(["Matches", "Discrepancy", "Needs confirmation", "Stopped"]), note: str(), sources: src() })),
    allergies: list(obj({ allergy: str(), reaction: str(), note: str(), sources: src() })),
    conflicts: list(obj({ item: str(), what: str(), resolution: str() })),
    questions: list(str()),
    updates: list(obj({ update: str(), sources: src() })),
  }),
  toText(payload) {
    const conv = (payload.conversions || []).map((c) => `- ${c}`);
    return `${payload.documents || ""}\n\nApp unit conversions:\n${conv.join("\n")}`;
  },
  demo: {
    summary: [
      "Haemoglobin fell from 13.4 to 11.1 g/dL in 15 months with a low MCV (78) in a 58-year-old man; the GP started iron but no cause was looked for.",
      "Aceclofenac was prescribed for 10 days in January but has been taken most days for about 6 months, without stomach protection after the first 10 days.",
      "Allergy conflict: the GP letter says \"NKDA\", but a 2019 discharge summary records a rash with co-trimoxazole, matching our record. Keep the allergy.",
      "Diabetes worsening: HbA1c 7.8% (Jan 2025) → 8.6% (Apr 2026). Mild diabetic retinopathy found Aug 2025; eye review due Aug 2026.",
      "Two medicine questions: Telma-H or plain telmisartan? Glargine 16 or 18 units?",
    ],
    redFlags: [
      { title: "Falling haemoglobin with microcytosis, not investigated", detail: "Iron was started empirically; ferritin and stool occult blood were not done. In a man this age, iron-deficiency anaemia needs a cause, including the gut. Triage adds about 4 kg weight loss and tiredness.", sources: [{ doc: "D", quote: "Haemoglobin 11.1 g/dL (13.0–17.0) L; MCV 78 fL (80–100) L" }, { doc: "D", quote: "Ferritin: not done. Stool occult blood: not done." }, { doc: "A", quote: "Haemoglobin was 11.1 in April; I started oral iron." }] },
      { title: "Long-term NSAID use", detail: "A 10-day course with pantoprazole cover became months of daily use. Risks: GI bleeding (which could explain the anaemia), kidney harm with telmisartan ± diuretic and metformin, and blood pressure.", sources: [{ doc: "C", quote: "Tab Aceclofenac 100 mg 1-0-1 after food x 10 days" }, { doc: "A", quote: "is on aceclofenac from the orthopaedic clinic" }] },
      { title: "Progressive diabetes with an established complication", detail: "HbA1c rising despite basal insulin, plus mild non-proliferative retinopathy.", sources: [{ doc: "D", quote: "HbA1c (IFCC) 70 mmol/mol" }, { doc: "F", quote: "mild non-proliferative diabetic retinopathy both eyes, no maculopathy" }] },
    ],
    problems: [
      { problem: "Type 2 diabetes", since: "2014", status: "Matches", sources: [{ doc: "A", quote: "known type 2 diabetic (2014)" }] },
      { problem: "Hypertension", since: "Not stated", status: "Matches", sources: [{ doc: "A", quote: "and hypertensive" }] },
      { problem: "Right knee osteoarthritis, grade 3 on X-ray", since: "Jan 2026 X-ray", status: "Matches", sources: [{ doc: "C", quote: "X-ray: grade 3 OA right knee." }] },
      { problem: "Mild non-proliferative diabetic retinopathy, both eyes", since: "Aug 2025", status: "New", sources: [{ doc: "F", quote: "mild non-proliferative diabetic retinopathy both eyes, no maculopathy" }] },
      { problem: "Microcytic anaemia (cause not established)", since: "Apr 2026", status: "New", sources: [{ doc: "D", quote: "Haemoglobin 11.1 g/dL (13.0–17.0) L; MCV 78 fL (80–100) L" }] },
      { problem: "Right inguinal hernia repair (mesh)", since: "2011", status: "New", sources: [{ doc: "E", quote: "right inguinal hernia repair (mesh) 2011" }] },
    ],
    medicines: [
      { medicine: "Metformin 1 g twice daily", status: "Matches", note: "GP letter, prescription and triage agree", sources: [{ doc: "A", quote: "metformin 1 g BD" }, { doc: "B", quote: "Tab Metformin 1 gm 1-0-1" }] },
      { medicine: "Glimepiride 2 mg before breakfast", status: "Matches", note: "All sources agree", sources: [{ doc: "B", quote: "Tab Glimepiride 2 mg 1-0-0 before bkfst" }] },
      { medicine: "Insulin glargine 16 U at bedtime", status: "Needs confirmation", note: "Prescription unclear (16 or 18); letter and triage say 16. Check the pen", sources: [{ doc: "B", quote: "Inj Glargine 1[?]6 U at bedtime" }, { doc: "A", quote: "glargine 16 U HS" }] },
      { medicine: "Telmisartan 40 mg, or Telma-H 40 (with hydrochlorothiazide 12.5 mg)", status: "Discrepancy", note: "Letter says telmisartan; prescription says Telma-H. Ask which strip", sources: [{ doc: "A", quote: "telmisartan 40 mg OD" }, { doc: "B", quote: "Tab Telma-H 40 1-0-0" }] },
      { medicine: "Atorvastatin 20 mg at bedtime", status: "Matches", note: "All sources agree", sources: [{ doc: "B", quote: "Tab Atorva 20 0-0-1" }] },
      { medicine: "Aceclofenac 100 mg twice daily", status: "Discrepancy", note: "Prescribed for 10 days; taken long term", sources: [{ doc: "C", quote: "Tab Aceclofenac 100 mg 1-0-1 after food x 10 days" }] },
      { medicine: "Pantoprazole 40 mg daily", status: "Stopped", note: "10-day course in January; not taken now", sources: [{ doc: "C", quote: "Tab Pantoprazole 40 mg 1-0-0 before food x 10 days" }] },
      { medicine: "Ferrous sulphate 200 mg daily", status: "Needs confirmation", note: "One month from 22 Apr; not in the triage list. Ask whether he still takes it", sources: [{ doc: "B", quote: "Tab Ferrous sulphate 200 mg 0-1-0 x 1 month" }] },
    ],
    allergies: [
      { allergy: "Sulfonamide antibiotics (co-trimoxazole)", reaction: "Generalised itchy rash, Nov 2019", note: "Already in the hospital record. The GP letter's \"NKDA\" is incorrect. Hydrochlorothiazide (in Telma-H) is a non-antibiotic sulfonamide; cross-reactivity is uncommon", sources: [{ doc: "E", quote: "ALLERGY: Sulpha drugs (co-trimoxazole): rash." }, { doc: "A", quote: "Allergies: NKDA." }] },
    ],
    conflicts: [
      { item: "Drug allergy", what: "A: \"NKDA\". E and hospital record: sulpha (co-trimoxazole) rash", resolution: "Keep the sulfonamide allergy; tell the GP their record is incomplete" },
      { item: "BP medicine", what: "A: telmisartan 40 mg. B: Telma-H 40", resolution: "Ask him to bring the strip; matters for potassium, sodium and glucose" },
      { item: "Glargine dose", what: "A: 16 U. B: \"1[?]6\", 16 or 18 U. Triage: 16 U", resolution: "Confirm from the pen or diary before any dose change" },
      { item: "Aceclofenac duration", what: "C: 10 days. A and triage: ongoing", resolution: "Record as long-term use since about January 2026" },
    ],
    questions: [
      "Any black or tarry stools, blood in the stool, or change in bowel habit? Indigestion on aceclofenac?",
      "Did he take the iron, for how long, and did it upset his stomach?",
      "Which BP tablet: Telma or Telma-H? Bring the strip.",
      "Glargine dose on the pen: 16 or 18 units?",
      "Any painkillers bought over the counter? Any previous colonoscopy or endoscopy?",
      "Ask the GP for any ferritin, stool or endoscopy results since April.",
    ],
    updates: [
      { update: "Add mild non-proliferative diabetic retinopathy, both eyes (Aug 2025); eye review due Aug 2026", sources: [{ doc: "F", quote: "Review 12 months." }] },
      { update: "Add microcytic anaemia, Hb 11.1 g/dL, MCV 78 fL (18 Apr 2026, outside lab), cause not established", sources: [{ doc: "D", quote: "Haemoglobin 11.1 g/dL (13.0–17.0) L; MCV 78 fL (80–100) L" }] },
      { update: "Add outside results of 18 Apr 2026 (HbA1c 8.6%, fasting glucose 168 mg/dL, creatinine 1.10 mg/dL) as external", sources: [{ doc: "D", quote: "Serum creatinine 97 µmol/L" }] },
      { update: "Add past history: right inguinal hernia mesh repair (2011); left leg cellulitis admission (Nov 2019)", sources: [{ doc: "E", quote: "Diagnosis: left leg cellulitis." }] },
      { update: "Allergy entry: add the reaction detail (co-trimoxazole, generalised itchy rash, Nov 2019)", sources: [{ doc: "E", quote: "generalised itchy rash on day 2" }] },
      { update: "Medicines: mark aceclofenac as long-term use; antihypertensive and glargine dose to confirm", sources: [{ doc: "Record", quote: "" }] },
    ],
  },
};

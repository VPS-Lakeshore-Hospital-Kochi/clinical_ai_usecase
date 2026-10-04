import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: discharge desk. The app builds the medication calendar and end dates from the
// discharge list; Claude reconciles medicines and writes the summary, follow-up and patient copy.
export default {
  instructions: `Prepare the discharge pack as JSON for the discharging team. The app calculates stop dates, dose counts and the medication calendar from the discharge list (listed); do not recalculate them.
- reconciliation: every medicine before admission against discharge, with the change and reason. Include medicines stopped earlier that must not restart.
- flags: omissions, allergy conflicts, teaching needs and anything needing a restart date.
- summary: diagnoses with final pathology, procedure, course by problem, condition at discharge, pending results and the plan.
- followUp: every specialty involved, with when and why.
- patient: short sections in plain English (about a 6th-grade reading level) addressed to the patient as "you", ending with when to come back or call immediately.`,
  schema: obj({
    reconciliation: list(obj({ drug: str(), before: str(), atDischarge: str(), change: oneOf(["Same", "Increased", "Decreased", "New", "Stopped", "On hold"]), reason: str() })),
    flags: list(str()),
    summary: obj({ diagnoses: list(str()), procedure: str(), course: str(), atDischarge: str(), pending: str(), plan: str() }),
    followUp: list(obj({ when: str(), who: str(), purpose: str() })),
    patient: list(obj({ heading: str(), text: str() })),
  }),
  toText(payload) {
    const meds = (payload.meds || []).map((m) => `- ${m}`);
    return `${payload.admission || ""}\n\nApp discharge calculations:\n${meds.join("\n")}`;
  },
  demo: {
    reconciliation: [
      { drug: "Metformin", before: "1000 mg twice daily", atDischarge: "1000 mg twice daily", change: "Same", reason: "Restarted POD 3; creatinine 1.0" },
      { drug: "Glimepiride", before: "2 mg daily (stopped 20 Jul)", atDischarge: "—", change: "Stopped", reason: "Night-time hypoglycaemia; do not restart" },
      { drug: "Insulin glargine", before: "12 U at bedtime", atDischarge: "14 U at bedtime", change: "Increased", reason: "Post-operative hyperglycaemia; titrate at Endocrinology review" },
      { drug: "Empagliflozin", before: "10 mg daily (held 15 Aug)", atDischarge: "On hold", change: "On hold", reason: "Restart when eating and drinking normally; set a named restart date after a phone check" },
      { drug: "Telmisartan", before: "40 mg daily", atDischarge: "40 mg daily", change: "Same", reason: "BP stable" },
      { drug: "Atorvastatin", before: "20 mg at bedtime", atDischarge: "40 mg at bedtime", change: "Increased", reason: "LDL above target (Endocrinology and Cardiology, 8 Aug)" },
      { drug: "Aceclofenac", before: "When needed (stopped 6 Jul)", atDischarge: "—", change: "Stopped", reason: "Avoid NSAIDs: new anastomosis, kidney function, GI bleeding risk" },
      { drug: "Enoxaparin", before: "—", atDischarge: "40 mg SC daily", change: "New", reason: "Extended VTE prophylaxis after abdominal cancer surgery (28 days)" },
      { drug: "Paracetamol", before: "650 mg when needed", atDischarge: "1 g up to four times daily when needed", change: "Increased", reason: "Maximum 4 g a day" },
      { drug: "Pantoprazole", before: "—", atDischarge: "40 mg daily for 2 weeks", change: "New", reason: "Short course after surgery" },
      { drug: "Lactulose", before: "—", atDischarge: "15 mL at night when needed", change: "New", reason: "Avoid straining" },
    ],
    flags: [
      "Enoxaparin: confirm who injects (patient or wife), teach the technique and sharps disposal; check platelets if continued beyond 2 weeks per protocol.",
      "Empagliflozin has no restart date: agree one after a phone check, and give sick-day rules before chemotherapy.",
      "Sulfonamide allergy: no sulfonamide drugs on the discharge list.",
      "Knee pain: paracetamol only; review analgesia if knee pain limits walking.",
    ],
    summary: {
      diagnoses: [
        "Sigmoid adenocarcinoma, pT3 pN1b (2/18) M0, stage IIIB, R0, pMMR, KRAS G12D, BRAF wild-type",
        "Type 2 diabetes with post-operative hyperglycaemia",
        "Iron-deficiency anaemia, treated",
        "Right knee osteoarthritis (knee replacement deferred)",
        "Hypertension; diabetic peripheral neuropathy",
      ],
      procedure: "Laparoscopic anterior resection with high IMA ligation, stapled anastomosis, no stoma (19 Aug 2026). EBL 150 mL.",
      course: "ERAS pathway. POD 0–1 hyperglycaemia 220–280 mg/dL managed with basal-bolus insulin. Post-op hs-troponin 6 → 8 → 7 ng/L with an unchanged ECG: no myocardial injury. Mild ileus on POD 2 resolved conservatively. Diet advanced POD 3; bowels opened POD 4. No fever or signs of anastomotic leak.",
      atDischarge: "Afebrile, mobilising with a stick, wounds clean. Hb 10.9, creatinine 1.0, WBC 9.2, CRP falling.",
      pending: "None.",
      plan: "Adjuvant CAPOX, 3 months for low-risk stage III (pT3 N1), to confirm at Oncology. Knee replacement deferred until after chemotherapy.",
    },
    followUp: [
      { when: "31 Aug", who: "Surgical Gastroenterology OPD", purpose: "Wound check, bowel function, pathology discussion" },
      { when: "2 Sep", who: "Endocrinology (tele-consult)", purpose: "Insulin titration, empagliflozin restart, glucose plan for chemotherapy" },
      { when: "7–14 Sep", who: "Medical Oncology", purpose: "Start CAPOX within 6–8 weeks of surgery; DPYD result; baseline neuropathy score; steroid-sparing antiemetics" },
      { when: "Weekly × 4", who: "Nurse phone call", purpose: "Glucose log, enoxaparin adherence, warning signs" },
      { when: "6–8 weeks", who: "Cardiology", purpose: "Post-op review and lipid profile" },
      { when: "4 weeks", who: "Laboratory", purpose: "Hb and ferritin" },
      { when: "After chemotherapy", who: "Orthopaedics", purpose: "Re-plan the right knee replacement" },
    ],
    patient: [
      { heading: "Your operation", text: "You had keyhole surgery to remove the part of your bowel that had the cancer. The surgeon removed all of it that could be seen, and the edges were clear. Some lymph glands had cancer cells, so the cancer doctor will talk to you about chemotherapy to lower the chance of it coming back." },
      { heading: "Your medicines", text: "Use the medicine calendar. Do not take aceclofenac, ibuprofen or other painkiller tablets; use paracetamol only. Inject enoxaparin once a day under the skin of your tummy until the date on your calendar: it prevents blood clots. Do not restart empagliflozin yet; we will phone you to tell you when." },
      { heading: "Wound and bowels", text: "Keep the small wounds dry for 48 hours, then you can shower. Pat them dry. Your bowel habit may be irregular for a few weeks. Use lactulose at night if you have not passed stool for 2 days." },
      { heading: "Eating", text: "Eat small, soft meals 5–6 times a day for 2 weeks: kanji, idli, soft rice with dal, fish curry and cooked vegetables. Drink 8–10 glasses of water a day." },
      { heading: "Blood sugar", text: "Check your sugar before breakfast and before dinner and write it down. If it is below 70, take 3 teaspoons of sugar in water and call us. If it is above 300 twice in a row, call us." },
      { heading: "Activity", text: "Walk around the house several times a day, using your stick. No lifting over 5 kg for 6 weeks. No driving for 2 weeks." },
      { heading: "Come back or call immediately if you have", text: "Fever over 38 °C or shivering; tummy pain that is getting worse or a hard, swollen tummy; vomiting and cannot keep fluids down; blood from the back passage or black stools; redness, pus or opening of a wound; pain or swelling in one leg, sudden breathlessness or chest pain; sugar below 70 that does not improve, or confusion." },
    ],
  },
};

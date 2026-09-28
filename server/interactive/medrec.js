import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: pharmacist reconciliation at ICU-to-ward transfer, side by side, with app-side
// renal dosing, QT and antibiotic-day calculations.
export default {
  instructions: `Reconcile every medicine at this ICU-to-ward transfer and review the antibiotic, as JSON for the clinical pharmacist's screen. The app calculates creatinine clearance, the QT check and the antibiotic day (listed); do not recalculate them.
- flags: most important first, each with the recommended action. Check every draft ward order against the admission diagnosis.
- rows: every medicine on the home, ICU and draft ward lists, with your recommendation and reason.
- stewardship: indication, day, microbiology, trajectory, recommendation (continue, de-escalate, switch to oral or stop) with the guideline basis, and the alternative if the team prefers to continue.
- cdiff: modifiable risk factors present and how to reduce them. dischargeList: provisional list if discharged in 2–3 days.
- questions: for Oncology, Endocrinology and the ward team.`,
  schema: obj({
    flags: list(obj({ title: str(), action: str() })),
    rows: list(obj({ drug: str(), home: str(), icu: str(), draft: str(), recommendation: oneOf(["Continue", "Change", "Stop", "Hold", "Restart", "Do not restart", "Only if tested"]), detail: str(), reason: str() })),
    stewardship: obj({ indication: str(), micro: str(), trajectory: str(), recommendation: str(), alternative: str() }),
    cdiff: obj({ present: list(str()), reduce: list(str()) }),
    dischargeList: list(str()),
    questions: list(obj({ team: str(), question: str() })),
  }),
  toText(payload) {
    return `${payload.transfer || ""}\n\nApp calculations:\n${(payload.calculations || []).map((c) => `- ${c}`).join("\n")}`;
  },
  demo: {
    flags: [
      { title: "Empagliflozin restart in the draft orders", action: "Remove it. He was admitted with SGLT2 inhibitor-associated euglycaemic DKA 2 days ago and is still at risk of dehydration. Do not restart during chemotherapy." },
      { title: "Metformin restart", action: "Hold. Creatinine 1.6 and still recovering, diarrhoea ongoing. Restart when creatinine is stable and he is eating normally." },
      { title: "Telmisartan restart", action: "Hold. Septic shock less than 48 hours ago and AKI recovering. Restart at outpatient review." },
      { title: "QTc 478 ms on ondansetron + domperidone", action: "Stop domperidone. Ondansetron as needed only; keep K ≥4.0 and Mg ≥2.0; repeat the ECG in 24 h." },
      { title: "Pantoprazole without an indication", action: "Stop: eating, off vasopressors, not coagulopathic. It also raises C. difficile risk." },
      { title: "Loperamide on the ward list", action: "Only while C. difficile is excluded; the negative test was before antibiotics. Re-test before any loperamide if diarrhoea increases." },
      { title: "Piperacillin-tazobactam dose", action: "The renal reduction is no longer needed at CrCl 51, but the stewardship recommendation is to stop it." },
    ],
    rows: [
      { drug: "Insulin glargine", home: "14 U HS", icu: "10 U HS", draft: "10 U HS", recommendation: "Continue", detail: "10 U, titrate to fasting glucose", reason: "Intake still reduced" },
      { drug: "Correction lispro", home: "—", icu: "Scale", draft: "Scale", recommendation: "Continue", detail: "Per scale", reason: "—" },
      { drug: "Empagliflozin", home: "10 mg OD", icu: "Stopped", draft: "Restart", recommendation: "Do not restart", detail: "Remove from ward orders", reason: "Recent euglycaemic DKA" },
      { drug: "Metformin", home: "1000 mg BD (self-stopped)", icu: "Held", draft: "Restart", recommendation: "Hold", detail: "Hold until creatinine stable", reason: "Creatinine 1.6, recovering AKI; diarrhoea" },
      { drug: "Telmisartan", home: "40 mg OD", icu: "Held", draft: "Restart", recommendation: "Hold", detail: "Restart at outpatient review", reason: "Recent shock and AKI" },
      { drug: "Atorvastatin", home: "40 mg HS", icu: "Not charted", draft: "Not ordered", recommendation: "Restart", detail: "40 mg HS", reason: "Omitted at ICU admission; no reason to stop" },
      { drug: "Capecitabine", home: "2000 mg BD", icu: "Stopped", draft: "—", recommendation: "Stop", detail: "Until the oncology re-plan", reason: "Severe toxicity; DPYD result awaited" },
      { drug: "Piperacillin-tazobactam", home: "—", icu: "4.5 g 8-hourly EI (renal dose)", draft: "Continue", recommendation: "Stop", detail: "Stop today (see stewardship)", reason: "Cultures negative, recovering" },
      { drug: "Octreotide", home: "—", icu: "100 µg TDS", draft: "Continue", recommendation: "Continue", detail: "Stop when stools ≤2/day for 24 h", reason: "Improving diarrhoea" },
      { drug: "Pantoprazole", home: "—", icu: "40 mg IV OD", draft: "Continue", recommendation: "Stop", detail: "Stop", reason: "No indication; C. difficile risk" },
      { drug: "Ondansetron", home: "—", icu: "4 mg PRN", draft: "Continue", recommendation: "Continue", detail: "As needed, max 8 mg/day", reason: "QTc 478: monitor" },
      { drug: "Domperidone", home: "—", icu: "10 mg TDS", draft: "Continue", recommendation: "Stop", detail: "Stop", reason: "QT prolongation with ondansetron" },
      { drug: "Enoxaparin", home: "—", icu: "40 mg OD", draft: "Continue", recommendation: "Continue", detail: "40 mg OD", reason: "VTE prophylaxis; platelets 110" },
      { drug: "Paracetamol", home: "PRN", icu: "1 g 6-hourly", draft: "Continue", recommendation: "Continue", detail: "Max 4 g/day", reason: "—" },
      { drug: "Loperamide", home: "2 mg PRN", icu: "—", draft: "2 mg PRN", recommendation: "Only if tested", detail: "Only after a negative C. difficile re-test", reason: "Negative test predates antibiotics" },
    ],
    stewardship: {
      indication: "Empirical treatment of febrile neutropenia with septic shock (20 Sep).",
      micro: "Blood cultures no growth at 48 h; urine negative; stool C. difficile and GI panel negative. No source identified.",
      trajectory: "Afebrile 36 h, off vasopressors >24 h, lactate normal, CRP halving, ANC recovering (0.6 → 1.2).",
      recommendation: "Stop piperacillin-tazobactam today. IDSA/ASCO guidance supports stopping empirical therapy for febrile neutropenia with no identified infection once afebrile ≥48 h and clinically stable, particularly with count recovery.",
      alternative: "If Oncology prefers to continue until ANC ≥1.5: correct to full dose (CrCl >40 needs no reduction) with a hard stop date of 24 Sep and review at 48 h afebrile.",
    },
    cdiff: {
      present: ["Broad-spectrum anti-pseudomonal antibiotic", "Proton pump inhibitor", "Recent chemotherapy", "Hospitalisation", "Age over 55"],
      reduce: ["Stop the antibiotic as early as safe", "Stop the PPI", "No laxatives or antimotility drugs without a test", "Re-test stool promptly if diarrhoea increases after improving", "Tell the patient and his wife: new diarrhoea after discharge needs a stool test before loperamide"],
    },
    dischargeList: [
      "Insulin glargine 10–12 U at bedtime (titrate), with a glucose log",
      "Atorvastatin 40 mg at bedtime",
      "Paracetamol 1 g up to 4 times a day if needed",
      "Ondansetron 4 mg if needed for nausea (max twice a day)",
      "On hold with written instructions: telmisartan, metformin, capecitabine",
      "Stopped: empagliflozin (not without Endocrinology), domperidone, pantoprazole",
      "Loperamide not on the list unless C. difficile is re-tested and negative",
    ],
    questions: [
      { team: "Oncology", question: "Agree to stop piperacillin-tazobactam today (or at 48 h afebrile)? Plan for re-challenge at a DPYD-guided dose?" },
      { team: "Endocrinology", question: "Long-term diabetes regimen without an SGLT2 inhibitor during chemotherapy?" },
      { team: "Ward team", question: "Repeat ECG in 24 h; K and Mg targets; C. difficile re-test threshold communicated to nursing." },
    ],
  },
};

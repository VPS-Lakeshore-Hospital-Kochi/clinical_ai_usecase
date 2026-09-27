// Full catalogue of Claude use cases across the patient journey.
// `href` marks the ones that are live prototypes; the rest are on the roadmap.
export const STAGES = [
  {
    id: "before",
    title: "Before the hospital",
    blurb: "First point of contact, before the patient meets a doctor.",
    items: [
      { title: "Symptom intake & triage", specialty: "Digital front door", text: "Emergency screen, urgency, routing and a patient reply from a WhatsApp message.", href: "module.html?id=triage" },
      { title: "Right specialist, right slot", specialty: "Front office", text: "Maps a free-text complaint to the right department and doctor and sends a pre-visit questionnaire." },
      { title: "Referral & old-records digest", specialty: "All specialties", text: "Summarises GP letters and photographed prescriptions into a structured history before the visit." },
    ],
  },
  {
    id: "consultation",
    title: "Consultation",
    blurb: "The AI-augmented clinician in the OPD.",
    items: [
      { title: "Ambient clinical scribe", specialty: "Endocrinology OPD", text: "Conversation to SOAP note, ICD-10 codes, orders and a patient summary.", href: "module.html?id=scribe" },
      { title: "Decision-support sidebar", specialty: "Internal Medicine", text: "Differential diagnosis, guideline-cited next steps and drug-interaction checks." },
      { title: "Lab & report explainer", specialty: "Laboratory", text: "Trend-aware interpretation with separate clinician and patient versions." },
    ],
  },
  {
    id: "specialty",
    title: "Specialty co-pilots",
    blurb: "How each specialty uses Claude for decisions and planning.",
    items: [
      { title: "Diabetes co-pilot", specialty: "Endocrinology", text: "CGM patterns, regimen changes for approval, Kerala-diet coaching.", href: "module.html?id=diabetes" },
      { title: "Ortho surgery planner", specialty: "Orthopaedics", text: "TKA indication, implant options, risk, optimisation, consent and rehab.", href: "module.html?id=ortho" },
      { title: "Tumour board assistant", specialty: "Oncology", text: "Staging, biology, guideline options, trials and a draft MDT outcome.", href: "module.html?id=oncology" },
      { title: "Cardiac pre-op co-pilot", specialty: "Cardiology", text: "RCRI and biomarker risk, need for stress testing, peri-operative drug plan and clearance note.", href: "module.html?id=cardiology" },
      { title: "Chest-pain & heart-failure co-pilot", specialty: "Cardiology", text: "HEART score pathway, echo summaries and GDMT optimisation." },
      { title: "Liver & transplant work-up", specialty: "Gastro / Hepatology", text: "MELD/Child-Pugh, transplant checklists, donor–recipient readiness tracker." },
      { title: "Kidney co-pilot", specialty: "Nephrology", text: "CKD staging, renal dose adjustment and dialysis adequacy notes." },
      { title: "Stroke & neuro-surgical planning", specialty: "Neurology / Neurosurgery", text: "Thrombolysis eligibility and pre-operative planning summaries." },
      { title: "ICU handover & sepsis bundle", specialty: "Critical Care", text: "SBAR handovers, sepsis bundle tracking and daily progress notes." },
      { title: "Antenatal & paediatric safety", specialty: "Obstetrics / Paediatrics", text: "Antenatal risk flags and weight-based paediatric dosing checks." },
      { title: "Structured radiology reporting", specialty: "Radiology", text: "Drafts structured reports, flags incidental findings, writes patient versions." },
    ],
  },
  {
    id: "inpatient",
    title: "Procedures & inpatient care",
    blurb: "AI for the institution, beyond the individual clinician.",
    items: [
      { title: "Pre-op readiness & WHO checklist", specialty: "Surgery / Anaesthesia", text: "Readiness gating and plain-language consent drafting." },
      { title: "Nursing handover & NEWS2 watch", specialty: "Nursing", text: "Shift handovers and early-warning escalation." },
      { title: "Med reconciliation & antibiotic stewardship", specialty: "Pharmacy", text: "Admission reconciliation and antimicrobial review." },
      { title: "Pre-auth & TPA packet builder", specialty: "Insurance desk", text: "Policy-clause check, deduction arithmetic, medical-necessity letter and TPA query responses.", href: "module.html?id=preauth" },
      { title: "Coding & billing audit", specialty: "Revenue cycle", text: "Discharge-to-bill code reconciliation to catch revenue leakage." },
    ],
  },
  {
    id: "discharge",
    title: "Discharge",
    blurb: "A safer hand-off from hospital to home.",
    items: [
      { title: "Intelligent discharge", specialty: "Surgical Gastroenterology", text: "Clinician summary, med reconciliation, follow-ups and plain-English home instructions.", href: "module.html?id=discharge" },
    ],
  },
  {
    id: "recovery",
    title: "Recovery & continuous care",
    blurb: "Care continues at home.",
    items: [
      { title: "Remote-monitoring agent", specialty: "Chronic care", text: "Wearable and glucose streams, message triage and escalation rules." },
      { title: "Post-op rehab coach", specialty: "Physiotherapy", text: "Ortho and cardiac rehab check-ins with a symptom diary." },
    ],
  },
  {
    id: "journey",
    title: "The whole journey",
    blurb: "Putting it all together for leadership and the care team.",
    items: [
      { title: "Patient journey story", specialty: "Cross-specialty", text: "One narrative across specialties, AI-surfaced moments, open loops and the next 90 days.", href: "dashboard.html" },
    ],
  },
];

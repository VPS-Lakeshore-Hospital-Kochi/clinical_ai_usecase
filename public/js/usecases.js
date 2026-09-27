// Full catalogue of Claude use cases across the patient journey.
// `href` marks the ones that are live prototypes; the rest are on the roadmap.
export const STAGES = [
  {
    id: "before",
    title: "Before the hospital",
    blurb: "First point of contact, before the patient meets a doctor.",
    items: [
      { title: "Symptom intake & triage", specialty: "Digital front door", text: "Emergency screen, urgency, routing and a patient reply from a WhatsApp message.", href: "module.html?id=triage" },
      { title: "Right specialist, right slot", specialty: "Contact centre", text: "Routes a morning queue against the live roster, escalates hidden emergencies, merges duplicates, drafts replies.", href: "module.html?id=routing" },
      { title: "Referral & old-records digest", specialty: "All specialties", text: "Turns GP letters, photographed prescriptions and outside labs into one sourced history: unit conversions, conflicts, unclear handwriting, questions for the visit.", href: "module.html?id=referral" },
    ],
  },
  {
    id: "consultation",
    title: "Consultation",
    blurb: "The AI-augmented clinician in the OPD.",
    items: [
      { title: "Ambient clinical scribe", specialty: "Endocrinology OPD", text: "Conversation to SOAP note, ICD-10 codes, orders and a patient summary.", href: "module.html?id=scribe" },
      { title: "Decision-support sidebar", specialty: "Emergency / Internal Medicine", text: "Ranked differential, can't-miss checks, guideline-cited first 6 hours and a drug-interaction check that finds the trigger.", href: "module.html?id=decision" },
      { title: "Lab & report explainer", specialty: "Laboratory / OPD", text: "Trend-aware clinician summary and a plain-language take-home explanation of pathology and labs.", href: "module.html?id=labs" },
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
      { title: "Heart failure co-pilot", specialty: "Cardiology / HF clinic", text: "Four-pillar medicine gaps, dated titration plan with safety checks, iron, CRT-D eligibility, Kerala-diet advice. Third synthetic patient.", href: "module.html?id=heartfailure" },
      { title: "Liver transplant work-up", specialty: "Hepatology / Transplant", text: "MELD 3.0 and Milan criteria, recipient and living-donor readiness tracker, GRWR, THOTA steps. Second synthetic patient.", href: "module.html?id=transplant" },
      { title: "Kidney co-pilot", specialty: "Nephrology", text: "eGFR trend, CKD staging, chemo dosing, sick-day rules and a kidney-protection plan.", href: "module.html?id=nephrology" },
      { title: "Stroke code & neuro planning", specialty: "Neurology / Neurosurgery", text: "Thrombolysis and thrombectomy eligibility against the clock, BP targets, hemicraniectomy contingency, anticoagulant dose check. Fifth synthetic patient.", href: "module.html?id=stroke" },
      { title: "ICU round co-pilot", specialty: "Critical Care", text: "Problem-based plan, sepsis and DKA bundle tracking, drug safety review, SBAR handover, family update.", href: "module.html?id=icu" },
      { title: "Antenatal risk review", specialty: "Obstetrics", text: "New hypertension and pre-eclampsia work-up, GDM titration, anaemia, missed anti-D, delivery planning.", href: "module.html?id=antenatal" },
      { title: "Paediatric prescription safety", specialty: "Paediatrics / Pharmacy", text: "Weight-based dose recalculation, mL-vs-mg errors, age restrictions, corrected orders and a parent dosing card.", href: "module.html?id=paeds" },
      { title: "Structured radiology reporting", specialty: "Radiology", text: "Dictation to structured staging report, contradiction check, incidental-finding follow-up, patient version.", href: "module.html?id=radiology" },
    ],
  },
  {
    id: "inpatient",
    title: "Procedures & inpatient care",
    blurb: "AI for the institution, beyond the individual clinician.",
    items: [
      { title: "Pre-op readiness & WHO checklist", specialty: "Surgery / Anaesthesia", text: "Admission-day readiness gate across all prior plans, gaps with owners, pre-filled WHO Surgical Safety Checklist.", href: "module.html?id=preop" },
      { title: "Nursing handover & NEWS2 watch", specialty: "Nursing", text: "Scores each set of observations, reads the trend, escalates before handover and writes the SBAR.", href: "module.html?id=nursing" },
      { title: "Med reconciliation & antibiotic stewardship", specialty: "Clinical Pharmacy", text: "Line-by-line reconciliation at transfer, interaction and QTc checks, day-3 antibiotic review, C. difficile risk.", href: "module.html?id=medrec" },
      { title: "Pre-auth & TPA packet builder", specialty: "Insurance desk", text: "Policy-clause check, deduction arithmetic, medical-necessity letter and TPA query responses.", href: "module.html?id=preauth" },
      { title: "Coding & billing audit", specialty: "Medical Records / Revenue cycle", text: "Documentation-supported code fixes, duplicate and wrong-claim charges, unbilled services, claim reconciliation.", href: "module.html?id=coding" },
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
      { title: "Remote-monitoring agent", specialty: "Remote care", text: "Reads home readings and WhatsApp messages together, grades alerts, escalates, replies and scripts the nurse call.", href: "module.html?id=monitoring" },
      { title: "Rehab coach", specialty: "Physiotherapy", text: "Six-week home plan with traffic-light safety rules, daily check-ins and weekly physiotherapist summaries.", href: "module.html?id=rehab" },
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

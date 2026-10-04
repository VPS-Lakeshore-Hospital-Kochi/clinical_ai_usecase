import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: cross-specialty journey review. The app builds the journey map from the
// timeline (and any outputs filed in this browser) and computes the milestone intervals; Claude
// writes the story, where AI changed the course, the open loops and the next 90 days.
export default {
  instructions: `Write the cross-specialty journey review for hospital leadership and the care team, as JSON. The app has computed the milestone intervals (listed); use its numbers. Be factual and do not overclaim: clinicians made every decision.
- story: a plain-English narrative of about 150–200 words.
- aiMoments: one per AI-assisted step, with the module id exactly as tagged in the timeline ([AI-assisted step] entries: triage, referral, scribe, diabetes, ortho, radiology, oncology, cardiology, preauth, preop, nursing, discharge, coding, labs, nephrology, icu, medrec, rehab, monitoring), the date, specialty and what it surfaced.
- openLoops: pending actions across specialties with an owner, marking system gaps separately from clinical and administrative items.
- next90: when | what | owner.
- team: specialty | role in this journey.`,
  schema: obj({
    story: str(),
    aiMoments: list(obj({ module: str(), date: str(), specialty: str(), caught: str() })),
    openLoops: list(obj({ item: str(), owner: str(), kind: oneOf(["System gap", "Clinical", "Administrative"]) })),
    next90: list(obj({ when: str(), what: str(), owner: str() })),
    team: list(obj({ specialty: str(), role: str() })),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `Patient journey timeline:\n\n${payload.timeline || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    story: "Mr Thomas Varghese, 58, messaged the Lakeshore WhatsApp line on 2 July about rising sugars and a painful knee. Triage sent him to Endocrinology and flagged his weight loss. A 14-day sensor showed dangerous night-time lows, so his regimen changed. When Orthopaedics planned a knee replacement, the pre-operative gate stopped the process: iron-deficiency anaemia with weight loss had to be investigated first. Colonoscopy on 29 July found a sigmoid cancer, 27 days after his first message. The staging CT report was corrected before the tumour board, Cardiology evaluated new chest heaviness without delaying surgery, and he had a curative resection on 19 August (stage IIIB). Chemotherapy started 22 days later. Ten days after that he was in intensive care with severe toxicity; his DPYD gene test, requested at the tumour board, came back 47 days after the request, after cycle 1, and showed a variant that slows capecitabine breakdown. He went home on 25 September with a rehab coach and home monitoring, which flagged likely C. difficile two days later. Chemotherapy will be re-planned at a lower dose; the knee replacement stays on hold.",
    aiMoments: [
      { module: "triage", date: "2 Jul", specialty: "Digital front door", caught: "Routed him to Endocrinology, not Orthopaedics, and passed weight loss and night-time lows to the clinician as flags." },
      { module: "referral", date: "4 Jul", specialty: "Medical Records", caught: "Built one sourced history from outside records: a haemoglobin fall from 13.4 to 11.1 nobody had investigated, months of aceclofenac and a wrong \"no allergies\" entry." },
      { module: "scribe", date: "6 Jul", specialty: "Endocrinology", caught: "The red-flag section surfaced weight loss, bowel change, pallor and the NSAID risk; labs ordered." },
      { module: "diabetes", date: "20 Jul", specialty: "Endocrinology", caught: "Found the sulfonylurea-driven night-time lows and escalated the iron-deficiency anaemia for GI work-up before surgery." },
      { module: "ortho", date: "22 Jul", specialty: "Orthopaedics", caught: "\"Defer pending workup\": the GI referral became a hard gate before listing for knee replacement." },
      { module: "radiology", date: "1 Aug", specialty: "Radiology", caught: "Caught an impression of \"no significant lymphadenopathy\" despite three suspicious nodes, and a left/right error, before the tumour board." },
      { module: "oncology", date: "5 Aug", specialty: "Oncology", caught: "Favoured 3-month CAPOX given diabetic neuropathy and asked for a DPYD result before cycle 1; the request was sent but not tracked." },
      { module: "cardiology", date: "8 Aug", specialty: "Cardiology", caught: "RCRI 2 with typical exertional symptoms: expedited stress imaging within the cancer-surgery window, and post-op troponins." },
      { module: "preauth", date: "12 Aug", specialty: "Insurance desk", caught: "Caught a ₹44,700 avoidable room-rent deduction before admission." },
      { module: "preop", date: "18 Aug", specialty: "Surgery / Anaesthesia", caught: "Consent without the possible ileostomy, no stoma marking, unadjusted insulin and missing bowel preparation, all closed before theatre." },
      { module: "nursing", date: "20 Aug", specialty: "Nursing", caught: "NEWS2 rising 0 → 1 → 4 → 6: a doctor within the hour rather than at handover." },
      { module: "discharge", date: "24 Aug", specialty: "Surgical Gastroenterology", caught: "Caught the missing empagliflozin restart date; no NSAIDs or sulfonamides prescribed." },
      { module: "coding", date: "25 Aug", specialty: "Medical Records", caught: "Added the missed nodal-metastasis code, removed a duplicate charge and kept the claim within the approval." },
      { module: "labs", date: "31 Aug", specialty: "Surgical OPD", caught: "Turned the pathology and labs into a take-home explanation after the surgeon's discussion; CEA back to normal." },
      { module: "nephrology", date: "3 Sep", specialty: "Nephrology", caught: "The July eGFR dip was NSAID-related and has recovered (68 → 85): full-dose CAPOX; sick-day rules written." },
      { module: "icu", date: "20 Sep", specialty: "Critical Care", caught: "Recognised euglycaemic DKA, put potassium before insulin and linked the early toxicity to the missing DPYD result." },
      { module: "medrec", date: "22 Sep", specialty: "Clinical Pharmacy", caught: "Blocked unsafe restarts and recommended stopping piperacillin-tazobactam at day 3; it continued to 24 Sep." },
      { module: "rehab", date: "25 Sep", specialty: "Physiotherapy", caught: "A six-week plan whose traffic-light rules pause exercise on a red day." },
      { module: "monitoring", date: "27 Sep", specialty: "Remote care", caught: "Read the trends together, recognised likely C. difficile, told him not to take loperamide and arranged same-day review." },
    ],
    openLoops: [
      { item: "Make \"DPYD resulted\" a required field in the chemotherapy order set", owner: "Oncology / Pharmacy / Quality", kind: "System gap" },
      { item: "Review how pharmacist stewardship recommendations are acknowledged (day-3 stop not acted on for 2 days)", owner: "Pharmacy / Quality", kind: "System gap" },
      { item: "Remove \"loperamide if diarrhoea recurs\" from discharge templates after broad-spectrum antibiotics", owner: "Pharmacy / Quality", kind: "System gap" },
      { item: "Stool C. difficile result and treatment plan", owner: "Oncology day-care / ID", kind: "Clinical" },
      { item: "Re-plan adjuvant therapy at the DPYD*2A genotype-guided dose", owner: "Medical Oncology", kind: "Clinical" },
      { item: "Do not restart empagliflozin during chemotherapy; revise the diabetes plan", owner: "Endocrinology", kind: "Clinical" },
      { item: "Repeat UACR on or after 6 Oct to confirm CKD A2", owner: "Nephrology", kind: "Clinical" },
      { item: "1 mg dexamethasone suppression test for the adrenal adenoma", owner: "Endocrinology", kind: "Clinical" },
      { item: "Separate pre-authorisation for the re-planned chemotherapy", owner: "Insurance desk", kind: "Administrative" },
      { item: "Orthopaedic re-review date after chemotherapy", owner: "Orthopaedics", kind: "Administrative" },
    ],
    next90: [
      { when: "27 Sep", what: "Same-day review: stool C. difficile, bloods", owner: "Oncology day-care" },
      { when: "From 6 Oct", what: "Repeat UACR", owner: "Nephrology" },
      { when: "Weekly × 6", what: "Rehab check-ins; physio review each Sunday", owner: "Physiotherapy" },
      { when: "Mid-Oct", what: "Revised adjuvant plan at the genotype-guided dose", owner: "Medical Oncology" },
      { when: "Early Nov", what: "Cardiology review and lipid profile", owner: "Cardiology" },
      { when: "Late Dec", what: "HbA1c and knee replacement re-planning visit", owner: "Endocrinology + Orthopaedics" },
    ],
    team: [
      { specialty: "Digital front door", role: "WhatsApp intake, urgency and routing" },
      { specialty: "Endocrinology", role: "Glycaemic control and the first red-flag capture" },
      { specialty: "Orthopaedics", role: "Knee planning; the pre-op gate that triggered the GI work-up" },
      { specialty: "Radiology", role: "Staging CT, report corrected" },
      { specialty: "Oncology / MDT", role: "Staging, treatment sequence, adjuvant chemotherapy" },
      { specialty: "Surgery / Anaesthesia", role: "Readiness gate, resection and discharge" },
      { specialty: "Critical Care", role: "DKA, sepsis, AKI and chemotherapy toxicity" },
      { specialty: "Clinical Pharmacy", role: "Reconciliation and antibiotic stewardship" },
      { specialty: "Remote care and Physiotherapy", role: "Home monitoring and rehab" },
    ],
  },
};

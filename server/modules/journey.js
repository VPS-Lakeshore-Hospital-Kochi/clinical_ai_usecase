export default {
  id: "journey",
  order: 9,
  title: "Patient Journey Story",
  specialty: "Cross-specialty",
  stage: "journey",
  date: "2026-08-24",
  summary:
    "Reads the whole timeline across specialties and writes one coherent story: what happened, where AI changed the course, open loops and the next 90 days.",
  claudeRole: "Links the specialties into one narrative and spots dropped hand-offs.",
  inputLabel: "Journey timeline",
  inputHint: "Built automatically from the timeline, including any outputs a clinician has approved and filed.",
  outputLabel: "Journey story",
  system: `Task: write a cross-specialty patient journey review for hospital leadership and the care team.

Produce in order:
1. "## The story so far": a 120–180 word narrative in plain English.
2. "## Where AI assistance changed the course": each moment where an AI-assisted step surfaced something (for example a flag that led to a diagnosis), with the specialty and date. Be factual and do not overclaim: clinicians made every decision.
3. "## Open loops & hand-off risks": a checklist ("- [ ]") of pending actions across specialties, each with an owner.
4. "## Next 90 days": a dated table of when | what | owner.
5. "## Care-team snapshot": a table of specialty | role in this journey.`,
  buildPrompt: (input) => `Patient journey timeline:\n\n${input}`,
  defaultInput: "",
  demoOutput: `## The story so far
Mr. Thomas Varghese, a 58-year-old retired bank manager from Kakkanad, messaged the Lakeshore WhatsApp line on 2 July 2026 about rising sugars, night sweats and a painful knee. Triage routed him to Endocrinology within the week and flagged his weight loss for the doctor. The consultation note captured the weight loss, fatigue and bowel change, and a 14-day sensor showed dangerous overnight lows from glimepiride, so his regimen was changed. When Orthopaedics planned a knee replacement, the pre-operative check stopped the process: iron-deficiency anaemia with weight loss needed investigating first. Colonoscopy found a sigmoid cancer, and the tumour board recommended keyhole surgery followed by chemotherapy. Cardiology evaluated new exertional chest heaviness without delaying surgery; a stress echo was negative. The insurance desk secured cashless approval and explained the room-rent deduction to the family. He had an R0 resection on 19 August (stage IIIB) and went home on day 5 with a reconciled medicine list and follow-up across five specialties. His knee replacement is on hold until chemotherapy is complete.

## Where AI assistance changed the course
- **2 Jul · Digital front door (triage):** routed him to Endocrinology, not Orthopaedics, and passed recurrent hypoglycaemia and weight loss to the clinician as flags.
- **6 Jul · Endocrinology (ambient scribe):** the red-flag section surfaced weight loss, bowel change, pallor and the NSAID risk. Labs ordered.
- **20 Jul · Endocrinology (diabetes co-pilot):** identified the sulfonylurea-driven nocturnal hypoglycaemia pattern, and escalated the **iron-deficiency anaemia as needing GI evaluation before surgery**.
- **22 Jul · Orthopaedics (surgery planner):** "Defer pending workup" decision. The GI referral became a hard gate before listing for TKA.
- **5 Aug · Oncology (tumour board pack):** connected oxaliplatin neuropathy risk with existing diabetic neuropathy (favouring 3-month CAPOX) and set the knee-surgery sequencing.
- **8 Aug · Cardiology (pre-op co-pilot):** recognised typical exertional symptoms (RCRI 2) and recommended expedited stress imaging within the cancer-surgery window, plus post-op troponin surveillance.
- **12 Aug · Insurance desk (pre-auth):** caught a ₹44,700 avoidable room-rent deduction before admission, and stated "laparoscopic, not robotic" to avoid a sub-limit query.
- **24 Aug · Discharge:** caught the missing empagliflozin restart date and confirmed that no NSAIDs or sulfonamides were prescribed.

*All decisions were made and signed by the treating clinicians and staff.*

## Open loops & hand-off risks
- [ ] Empagliflozin restart date: confirm by phone (Endocrinology / nurse)
- [ ] Oncology first visit booked within 6–8 weeks of surgery (Medical Oncology)
- [ ] **Separate pre-authorisation for adjuvant chemotherapy** (Insurance desk)
- [ ] Post-hospitalisation and pre-hospitalisation bills submitted within policy timelines (Insurance desk / family)
- [ ] Steroid-sparing antiemetic and chemo-period glucose plan agreed (Oncology + Endocrinology)
- [ ] Baseline neuropathy score documented before oxaliplatin (Oncology)
- [ ] Cardiology review 6–8 weeks post-op; LDL recheck on atorvastatin 40 mg (Cardiology)
- [ ] Genetic counselling decision recorded (Oncology)
- [ ] Enoxaparin completion on 16 Sep (Nurse follow-up)
- [ ] Hb/ferritin recheck at 4 weeks (Surgical Gastro)
- [ ] Orthopaedic re-review date after chemotherapy (Orthopaedics)

## Next 90 days
| When | What | Owner |
|---|---|---|
| 31 Aug 2026 | Wound check, pathology discussion | Surgical Gastro |
| 2 Sep 2026 | Insulin titration, SGLT2i restart | Endocrinology |
| Early Sep 2026 | Chemotherapy pre-authorisation | Insurance desk |
| 7–14 Sep 2026 | CAPOX cycle 1 | Medical Oncology |
| 16 Sep 2026 | Stop enoxaparin | Patient / nurse |
| Early Oct 2026 | Cardiology review, lipid profile | Cardiology |
| Every 3 weeks | CAPOX cycles 2–4, glucose review | Oncology + Endo |
| ~Early Dec 2026 | End of adjuvant chemo; CEA | Oncology |
| Late Dec 2026 | HbA1c, TKA re-planning visit | Endo + Ortho |

## Care-team snapshot
| Specialty | Role in this journey |
|---|---|
| Digital front door | WhatsApp intake, urgency and routing |
| Endocrinology | Glycaemic control, first red-flag capture, peri-operative and chemo glucose plans |
| Orthopaedics | Knee replacement planning; pre-op gate that triggered the GI workup |
| Gastroenterology | Colonoscopy and biopsy |
| Oncology / MDT | Staging, treatment sequence, adjuvant chemotherapy |
| Cardiology | Pre-operative risk assessment, stress echo, peri-operative drug plan |
| Insurance desk | Cashless pre-authorisation, cost counselling |
| Surgical Gastroenterology | Laparoscopic resection, inpatient care, discharge |
| Nursing | Triage call-back, education, phone follow-up |
`,
};

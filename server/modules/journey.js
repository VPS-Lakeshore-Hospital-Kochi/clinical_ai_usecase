export default {
  id: "journey",
  order: 12,
  title: "Patient Journey Story",
  specialty: "Cross-specialty",
  stage: "journey",
  date: "2026-09-22",
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
Mr. Thomas Varghese, a 58-year-old retired bank manager from Kakkanad, messaged the Lakeshore WhatsApp line on 2 July 2026 about rising sugars, night sweats and a painful knee. Triage routed him to Endocrinology within the week and flagged his weight loss for the doctor. The consultation note captured the weight loss, fatigue and bowel change, and a 14-day sensor showed dangerous overnight lows from glimepiride, so his regimen was changed. When Orthopaedics planned a knee replacement, the pre-operative check stopped the process: iron-deficiency anaemia with weight loss needed investigating first. Colonoscopy found a sigmoid cancer. The staging CT report was corrected before the tumour board (it had understated the lymph nodes), and the board recommended keyhole surgery followed by chemotherapy. Cardiology evaluated new exertional chest heaviness without delaying surgery; a stress echo was negative. The insurance desk secured cashless approval and explained the room-rent deduction to the family. He had an R0 resection on 19 August (stage IIIB) and went home on day 5 with a reconciled medicine list and follow-up across several specialties. Before chemotherapy, Nephrology confirmed his kidney function had recovered after stopping the painkiller, so he started full-dose chemotherapy on 10 September. Ten days later he was in intensive care with severe diarrhoea, a low white count, kidney injury and ketoacidosis from a diabetes tablet he kept taking while dehydrated. His DPYD gene test, sent in August, had never come back; when chased, it showed a variant that slows the breakdown of capecitabine. He is recovering, his chemotherapy will be re-planned at a lower dose, and his knee replacement stays on hold.

## Where AI assistance changed the course
- **2 Jul · Digital front door (triage):** routed him to Endocrinology, not Orthopaedics, and passed recurrent hypoglycaemia and weight loss to the clinician as flags.
- **6 Jul · Endocrinology (ambient scribe):** the red-flag section surfaced weight loss, bowel change, pallor and the NSAID risk. Labs ordered.
- **20 Jul · Endocrinology (diabetes co-pilot):** identified the sulfonylurea-driven nocturnal hypoglycaemia pattern, and escalated the **iron-deficiency anaemia as needing GI evaluation before surgery**.
- **22 Jul · Orthopaedics (surgery planner):** "Defer pending workup" decision. The GI referral became a hard gate before listing for TKA.
- **1 Aug · Radiology (structured report):** caught an impression that said "no significant lymphadenopathy" despite three suspicious nodes, which would have understaged him at the MDT. It also corrected a left/right error and routed the adrenal adenoma (cortisol test), fatty liver and coronary calcification to the right teams.
- **5 Aug · Oncology (tumour board pack):** connected oxaliplatin neuropathy risk with existing diabetic neuropathy (favouring 3-month CAPOX), set the knee-surgery sequencing, and asked for a DPYD result before cycle 1. That request was sent but never tracked to completion (see open loops).
- **8 Aug · Cardiology (pre-op co-pilot):** recognised typical exertional symptoms (RCRI 2) and recommended expedited stress imaging within the cancer-surgery window, plus post-op troponin surveillance.
- **12 Aug · Insurance desk (pre-auth):** caught a ₹44,700 avoidable room-rent deduction before admission, and stated "laparoscopic, not robotic" to avoid a sub-limit query.
- **24 Aug · Discharge:** caught the missing empagliflozin restart date and confirmed that no NSAIDs or sulfonamides were prescribed.
- **3 Sep · Nephrology (kidney co-pilot):** showed the July eGFR dip was NSAID-related and has recovered (68 → 85), confirming full-dose CAPOX. It also flagged that the CKD diagnosis needs a repeat UACR after 6 Oct, and wrote sick-day rules for chemotherapy diarrhoea.
- **20 Sep · Critical Care (ICU co-pilot):** recognised euglycaemic DKA despite a near-normal glucose, put potassium replacement before insulin, flagged the overdue antibiotics, and linked the early severe toxicity to the **missing DPYD result**, chasing it within the 96-hour uridine triacetate window.

*All decisions were made and signed by the treating clinicians and staff.*

## Open loops & hand-off risks
- [ ] **System gap: a send-out DPYD result was not a hard stop before cycle 1.** Make "DPYD resulted" a required field in the chemotherapy order set (Oncology / Pharmacy / Quality)
- [ ] Re-plan adjuvant therapy per DPYD*2A genotype (CPIC: 50% fluoropyrimidine dose, titrate) once recovered (Medical Oncology)
- [ ] Do not restart empagliflozin during chemotherapy; revise the diabetes plan (Endocrinology)
- [ ] Sick-day plan reinforcement: written copy, a phone check on day 5 and day 10 of each cycle (Nursing)
- [ ] 1 mg dexamethasone suppression test for the adrenal adenoma (Endocrinology)
- [ ] FIB-4 for hepatic steatosis (Endocrinology / Hepatology)
- [ ] Repeat UACR on or after 6 Oct to confirm CKD A2 (Nephrology)
- [ ] Telmisartan increase to 80 mg with K/creatinine check (Nephrology)
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
| 3 Sep 2026 | Kidney review before chemo | Nephrology |
| Early Sep 2026 | Chemotherapy pre-authorisation | Insurance desk |
| 10 Sep 2026 | CAPOX cycle 1 (full dose) | Medical Oncology |
| 20–24 Sep 2026 | ICU care; DPYD result; recovery | Critical Care |
| Sep 2026 | Dexamethasone suppression test | Endocrinology |
| 16 Sep 2026 | Stop enoxaparin | Patient / nurse |
| Early Oct 2026 | Cardiology review, lipid profile | Cardiology |
| From 6 Oct 2026 | Repeat UACR | Nephrology |
| After recovery (~Oct 2026) | Revised adjuvant plan at genotype-guided dose | Medical Oncology |
| ~Early Dec 2026 | End of adjuvant chemo; CEA | Oncology |
| Late Dec 2026 | HbA1c, TKA re-planning visit | Endo + Ortho |

## Care-team snapshot
| Specialty | Role in this journey |
|---|---|
| Digital front door | WhatsApp intake, urgency and routing |
| Endocrinology | Glycaemic control, first red-flag capture, peri-operative and chemo glucose plans |
| Orthopaedics | Knee replacement planning; pre-op gate that triggered the GI workup |
| Gastroenterology | Colonoscopy and biopsy |
| Radiology | Staging CT; report corrected and incidental findings routed |
| Oncology / MDT | Staging, treatment sequence, adjuvant chemotherapy |
| Cardiology | Pre-operative risk assessment, stress echo, peri-operative drug plan |
| Insurance desk | Cashless pre-authorisation, cost counselling |
| Surgical Gastroenterology | Laparoscopic resection, inpatient care, discharge |
| Critical Care | ICU management of DKA, sepsis, AKI and chemotherapy toxicity |
| Nephrology | Kidney staging, chemo dosing, sick-day rules, albuminuria plan |
| Nursing | Triage call-back, education, phone follow-up |
`,
};

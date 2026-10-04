# VPS Lakeshore · Clinical AI Showcase

Working prototypes of Claude across the patient journey at VPS Lakeshore Hospital, Kochi. The prototypes follow one **synthetic** patient from the first consultation to discharge, across several specialties.

> Prototype only. All patient data is synthetic. This is not a medical device. Every output is a draft for review by a qualified clinician.

## The journey

**Thomas Varghese (synthetic), 58, Kakkanad.** He messages the hospital about diabetes and a painful knee, and his outside records are digested before he is seen. At each step an AI-assisted check surfaces something, and together these lead to an early colon cancer diagnosis. Along the way his staging CT report is corrected, he is cleared by Cardiology, gets cashless insurance approval, has his kidneys checked before chemotherapy, is admitted to the ICU with chemotherapy toxicity, and is followed at home by a rehab coach and remote monitoring.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Symptom Intake & Triage | Digital front door | Reads a WhatsApp message and intake answers; screens for emergencies, sets urgency, routes to Endocrinology, drafts the patient reply |
| 2 | Referral & Old-Records Digest | Medical Records / OPD preparation | Reads the GP letter, photographed prescriptions, outside labs and an old discharge summary; converts units, cites a source for every fact, flags a haemoglobin fall nobody investigated, months of aceclofenac and a wrong "no allergies" entry |
| 3 | Ambient Clinical Scribe | Endocrinology OPD | Turns the transcript into a SOAP note, ICD-10 codes, orders and a patient summary; flags weight loss and bowel change |
| 4 | Diabetes Co-pilot | Endocrinology | Reads the CGM patterns (with charts), drafts regimen changes for approval, writes Kerala-diet coaching; escalates the iron-deficiency anaemia |
| 5 | Ortho Surgery Planner | Orthopaedics | Drafts the TKA indication, implant options, risk table, optimisation checklist, consent and rehab; returns "defer pending GI workup" |
| 6 | Structured Radiology Reporting | Radiology | Structures the staging CT dictation, catches a findings-vs-impression contradiction and a laterality error, routes incidental findings with guideline follow-up |
| 7 | Tumour Board Assistant | Oncology | Staging, tumour biology, guideline options, neuropathy and diabetes interactions, knee-surgery timing, draft MDT outcome |
| 8 | Cardiac Pre-op Co-pilot | Cardiology | RCRI and biomarker risk, whether stress testing is needed within the cancer-surgery window, peri-operative drug plan, troponin surveillance, clearance note |
| 9 | Pre-auth & TPA Packet Builder | Insurance desk | Checks policy clauses, calculates room-rent proportionate deductions, drafts the medical-necessity letter, document checklist and TPA query responses |
| 10 | Pre-op Readiness & WHO Checklist | Surgery / Anaesthesia | Admission-day readiness gate across every earlier plan; catches consent without the possible ileostomy, no stoma marking, unadjusted insulin, missing oral antibiotic prep; pre-fills the WHO checklist |
| 11 | Nursing Handover & NEWS2 Watch | Nursing | Scores the post-op night observations (0 → 6), escalates before handover, SBAR, day-shift tasks, documentation gaps |
| 12 | Intelligent Discharge | Surgical Gastroenterology | Medication reconciliation, clinician summary, cross-specialty follow-up, plain-English home instructions, medication calendar |
| 13 | Coding & Billing Audit | Medical Records / Revenue cycle | Documentation-supported code fixes (nodal metastases, complications), duplicate and wrong-claim charges, unbilled services, claim reconciliation within the approval |
| 14 | Lab & Report Explainer | Laboratory / Surgical OPD | Trend-aware clinician summary and a plain-language take-home explanation of pathology and labs, after the doctor's discussion |
| 15 | Kidney Co-pilot | Nephrology | eGFR trend and CKD staging, Cockcroft-Gault dosing check for CAPOX, sick-day rules, contrast guidance, albuminuria plan |
| 16 | ICU Round Co-pilot | Critical Care | Euglycaemic DKA, neutropenic sepsis and AKI during chemotherapy: problem-based plan, bundle tracking, drug review, SBAR handover; links early toxicity to a missing DPYD result |
| 17 | Med Reconciliation & Antibiotic Stewardship | Clinical Pharmacy | ICU-to-ward reconciliation; blocks unsafe restarts, QTc and PPI flags, day-3 antibiotic stop recommendation with renal-dose check |
| 18 | Rehab Coach | Physiotherapy | Six-week home plan after the ICU stay, with traffic-light safety rules tied to blood counts, glucose and diarrhoea, daily check-ins and weekly physio summaries |
| 19 | Remote Monitoring Agent | Remote care | Reads home readings (with trend charts) and WhatsApp messages together; flags likely C. difficile after ICU antibiotics, tells the patient not to take loperamide, scripts the nurse call |
| 20 | Patient Journey Story | Cross-specialty | One narrative across specialties: where AI changed the course, open loops, the next 90 days |

**Second journey: Anitha Joseph (synthetic), 49, Aluva.** Decompensated MASH cirrhosis with a small liver cancer; her son is the living-donor candidate.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Liver Transplant Work-up | Hepatology / Liver Transplant | MELD 3.0 and Child-Pugh with arithmetic, Milan criteria, recipient and donor readiness tracker, GRWR and remnant volume, THOTA legal steps, family explanation |

**Third journey: Rajan Pillai (synthetic), 67, Tripunithura.** Heart failure with reduced ejection fraction, from the emergency department to clinic a week after discharge.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Decision-Support Sidebar | Emergency / Internal Medicine | ED admission: ranked differential, can't-miss checks (ACS with LBBB, shock), guideline-cited first 6 hours; interaction check finds the diclofenac + ACE inhibitor + diuretic trigger |
| 2 | Heart Failure Co-pilot | Cardiology / HF clinic | Congestion status, four-pillar medicine gaps, dated titration plan with BP/K/creatinine checks, ARNI washout, iron, CRT-D eligibility, Kerala-diet salt and fluid advice |

**Fourth journey: Fathima Rasheed (synthetic), 29, and her son Ayaan, 4, Mattancherry.**

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Antenatal Risk Review | Obstetrics | 30-week visit: new hypertension and pre-eclampsia work-up, GDM insulin titration, IV iron, missed 28-week anti-D, delivery planning, warning signs |
| 2 | Paediatric Prescription Safety | Paediatric ED / Pharmacy | Recalculates every dose per kg: catches a 3× paracetamol volume error, double-dose ondansetron, codeine under 12, ibuprofen while dehydrated; corrected orders and a parent dosing card |

**Fifth journey: Leela Menon (synthetic), 71, Kalamassery.** Acute stroke on apixaban.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Stroke Code & Neuro Planning | Neurology / Neurointervention / Neurosurgery | No thrombolysis (apixaban today), straight to thrombectomy; door-to-groin clock, eligibility tables, post-reperfusion BP targets, hemicraniectomy discussion at 71, apixaban under-dosing caught, ELAN restart timing |

**Operations (no single patient)**

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Right Specialist, Right Slot | Contact centre | Routes a morning request queue against the roster (with leave); escalates a thunderclap headache, possible pre-eclampsia and possible new type 1 diabetes; merges duplicates; drafts replies |

The home page maps all 27 use cases from the roadmap, and all twenty-seven are now live prototypes.

## Interactive clinician demos

All twenty-seven prototypes, across every department in the journeys and the front office, open in a **clinician view** that looks like the tool a clinician would use. The text workspace is one tab away ("Prompt & text output"). Every view has a step guide, presenter notes ("what to point out"), a **Reset demo** button and a **What Claude saw** drawer showing the exact input sent.

| Demo | What the clinician does |
|---|---|
| Symptom Intake & Triage | Plays a WhatsApp intake conversation; Claude triages it into a nurse console; the nurse confirms or overrides urgency, picks a slot, edits the reply and sends it back into the chat. A second scenario (chest pain at rest) shows the switch to an emergency |
| Ambient Clinical Scribe | Plays a recorded consultation line by line (optional on-device voice); Claude drafts the note; every flag, code and order links to the transcript lines it came from; codes and orders are accepted, edited or rejected before signing |
| Nursing Handover & NEWS2 Watch | An observation chart scored live by the app (NEWS2, RCP 2017) with the response the chart requires; the nurse adds new observations; Claude reads the trend and drafts the escalation, SBAR, differential and day-shift tasks |
| Paediatric Prescription Safety | Every dose recalculated live from the child's weight against a local formulary; unsafe orders block dispensing until corrected; Claude reviews appropriateness; the parent dosing card is built from the corrected orders |
| Stroke Code & Neuro Planning | A simulated clock replays the code; the app runs door-to-CT and door-to-groin clocks and ticks off thrombolysis and thrombectomy eligibility as results arrive; Claude drafts the plan; the team records groin puncture |
| Decision-Support Sidebar (ED) | An ED board the app scores (NEWS2, lab flags, rule-based medicine check that finds the NSAID + ACE inhibitor + diuretic combination); Claude gives the differential, can't-miss checks and guideline-tagged first-6-hours orders |
| Structured Radiology Reporting | Claude's report-quality issues are highlighted in the dictation itself; the radiologist accepts corrections, edits the structured report and routes each incidental finding to a team |
| Tumour Board Assistant | The board sets T, N and M and the app calculates the AJCC 8th edition stage and adjuvant duration; Claude prepares the pack; the board records decisions and assigns actions, with the DPYD result flagged for tracking |
| ICU Round Co-pilot | The app runs the sepsis and DKA bundle tracker (insulin blocked until potassium ≥3.3), anion gap, KDIGO stage and the uridine triacetate window; Claude drafts the problem-based plan and drug review |
| Pre-auth & TPA Packet Builder | The family's room choice drives a live room-rent deduction calculator; Claude checks policy clauses, drafts the medical-necessity letter and prepares answers to TPA queries |
| Referral & Old-Records Digest | Outside documents in a viewer; every extracted fact links to its source text; the app converts units, calculates eGFR and marks unreadable OCR; record updates are accepted one by one |
| Pre-op Readiness & WHO Checklist | The app checks medicine hold times and computes the go/no-go gate from open items; actions close items; the WHO checklist (Sign In, Time Out, Sign Out) unlocks only when nothing blocks |
| Intelligent Discharge | The app builds the medication calendar, stop dates and dispense quantities from the discharge list; Claude reconciles medicines; follow-ups are booked from the pack |
| Med Reconciliation & Antibiotic Stewardship | Home, ICU and draft ward orders side by side; the app calculates CrCl, the QT check and the antibiotic day; the final ward order is built from the pharmacist's decisions |
| Remote Monitoring Agent | Home readings stream in; the app's trend rules fire where single-reading thresholds do not; Claude triages the patient's question; episode thresholds can be applied and re-run |
| Diabetes Co-pilot | The app checks the six consensus CGM targets, the GMI–HbA1c gap and the hypoglycaemia rule (stop the sulfonylurea, glargine 16 → 13–14 U); each pattern Claude finds is highlighted on the glucose profile; the new regimen builds from accepted changes and the app warns if it no longer fixes the overnight lows |
| Antenatal Risk Review | The app works out gestation from the EDD and lays out the pregnancy timeline, where the missed 28-week anti-D shows as a gap; it classifies BP and screens for pre-eclampsia; Claude ranks the risks and drafts orders by problem; entering the day-assessment result re-runs the screen live and can switch the plan to admission |
| Right Specialist, Right Slot | The app screens every incoming request for red flags and finds duplicates by phone number; Claude routes the queue against the live roster; nurse calls are logged before an emergency counts as handled; the app blocks bookings into clinics on leave, full clinics or a clinic for a possible emergency |
| Ortho Surgery Planner | The app scores the Oxford Knee Score and runs a readiness gate (unexplained anaemia and weight loss, HbA1c, Hb, BMI, dental, skin, MRSA) that re-computes as results are recorded; listing for surgery unlocks only on Proceed |
| Cardiac Pre-op Co-pilot | The RCRI is scored live from checkboxes with Lee and Duceppe MACE estimates; the app runs the stepwise peri-operative pathway, locks clearance until the stress-test result allows it, and flags myocardial injury from post-op troponins |
| Kidney Co-pilot | eGFR trend, Cockcroft-Gault on actual and adjusted weight, the KDIGO heat map, the CKD confirmation date and renal dose bands for capecitabine, oxaliplatin, metformin and contrast, all re-computed as today's values are edited |
| Coding & Billing Audit | The app finds duplicate and pre-admission bill lines and checks every code's evidence is verbatim in the record; the claim reconciles live against the approval as findings are accepted or rejected, and submission is blocked while it is over |
| Lab & Report Explainer | Result flags and trends by the app; the take-home copy is scored live for reading grade, jargon (with one-click plain alternatives) and survival figures, and "Give to patient" stays locked until it passes and the discussion is confirmed |
| Rehab Coach | Pre-session traffic-light rules in code; a daily check-in simulator logs the week and flags escalation; a red day blocks sending a reply that still prescribes exercise |
| Liver Transplant Work-up | MELD 3.0 term by term and Child-Pugh component by component, live from editable labs; Milan; graft-to-recipient weight ratio, donor remnant, fat and ABO checks; scheduling locked until the donor checks pass and every open item is closed |
| Heart Failure Co-pilot | Four-pillar dose gaps, weight trend, iron deficiency with the IV iron dose and CRT eligibility by the app; every titration step is checked against today's BP, heart rate, potassium, eGFR and congestion, including the 36-hour ACE-inhibitor washout |
| Patient Journey Story | The app builds the journey map from the timeline (marking outputs filed in this browser) and computes the milestone intervals, including the 47 days for the DPYD result; open loops are accepted, reassigned, raised to Quality or closed |

How they work:
- **Offline first.** Without an API key each view uses checked sample data (`server/interactive/*.js`), so a demo never depends on the network. With a key, `POST /api/interactive/:id` asks Claude for the same shape using structured outputs (a strict JSON Schema per view).
- **Rules in code, judgement from Claude.** NEWS2 scores, dose maths, eligibility checks, apixaban dose criteria, AJCC staging, ICU and pharmacy calculations, unit conversions, peri-operative holds, discharge dates, monitoring rules, CGM targets, gestational age and the pre-eclampsia screen, front-office red flags and roster checks, TKA readiness, RCRI and the peri-operative pathway, KDIGO staging and renal dose bands, claim reconciliation, readability and jargon checks, rehab traffic lights, MELD 3.0, Child-Pugh and living-donor limits, heart-failure titration safety checks, CRT and iron criteria, and journey intervals, the medicine rule set, room-rent deductions and clocks are calculated by the app (`public/js/clinical.js`, unit-tested in `test/clinical.test.js`). Claude reads the trend, weighs the context and drafts the words.
- **Clinician in control.** Every accept, edit, reject, override and escalation goes into a "Clinician actions" log, which is filed with the output to the patient timeline.

On each module page the clinician can edit the input, run Claude, then **Approve & file** the draft. Filed outputs appear on the patient timeline (stored in the browser only) and feed into the journey story.

## Run it

```bash
npm install
npm start          # http://localhost:3000
```

- **Live mode:** set `ANTHROPIC_API_KEY` in the environment. Responses stream from Claude.
- **Demo mode:** runs automatically when no key is set, or with `npm run demo`. It replays pre-written sample outputs so a presentation works offline. On any page, **Play sample output** does the same for that module.

Optional environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `CLAUDE_MODEL` | `claude-opus-5` | Model ID |
| `CLAUDE_EFFORT` | `high` | `low` / `medium` / `high` / `xhigh` / `max`. Lower is faster for live demos |
| `PORT` | `3000` | HTTP port |
| `DEMO_MODE` | unset | `1` forces sample outputs even when a key is set |

### Static build (no server)

```bash
npm run build:static                 # dist/: open with any static file host
npm run build:static -- --artifact   # also dist-artifact/, laid out for a claude.ai artifact
```

The static build is the demo mode without the server. Every page, clinician view, sample output and patient record ships as files. `js/static-api.js` answers the pages' `/api/*` calls in the browser with the same response shapes, so "What Claude saw" still shows the exact input that would be sent. It cannot call Claude live.

## How it is built

```
server/
  index.js          Express app: static pages + JSON/SSE API
  claude.js         Claude Messages API call (streaming, adaptive thinking,
                    prompt caching, server-side refusal fallback)
  demo.js           Replays sample outputs in the same stream format
  patient.js        Loads the synthetic record, renders the prompt context
  modules/*.js      One file per prototype: system prompt, sample input,
                    prompt builder, sample output
data/patient.json   Main synthetic patient (FHIR-shaped): problems, meds,
                    labs, CGM profile, reports, timeline
data/patient-transplant.json  Second synthetic patient (liver transplant)
data/patient-hf.json          Third synthetic patient (heart failure)
data/patient-mother.json      Fourth journey: mother (antenatal)
data/patient-child.json       Fourth journey: child (paediatric ED)
data/patient-stroke.json      Fifth journey: acute stroke
public/             Vanilla HTML/CSS/JS front end (VPS Lakeshore 2.0 brand: navy, magenta accent, cream, DM Sans served locally)
  brand/            Official logos and DM Sans font files (SIL Open Font License)
test/               node:test suite, including a mock Claude API
```

- Every request sends a shared clinical guard-rail prompt, the module's task prompt and the patient record as a cached system prompt.
- Outputs are GitHub-flavoured markdown, rendered with `marked` and sanitised with `DOMPurify`.
- Prompts and sample outputs stay on the server. The browser only receives module metadata.

### Adding a prototype

1. Create `server/modules/<id>.js`, following the existing modules.
2. Register it in `server/modules/index.js`.
3. Add or point the matching card in `public/js/usecases.js` at `module.html?id=<id>`. Add it to `JOURNEY_STEPS` in `public/js/common.js` if it belongs in the stepper.

## Tests

```bash
npm test
```

The tests cover the API, the demo stream, and the live request shape (model, fallback beta, adaptive thinking, cached system prompt) against a local mock of the Claude API. They need no key.

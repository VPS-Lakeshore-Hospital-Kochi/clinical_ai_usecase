# VPS Lakeshore · Clinical AI Showcase

Working prototypes of Claude across the patient journey at VPS Lakeshore Hospital, Kochi. The prototypes follow one **synthetic** patient from the first consultation to discharge, across several specialties.

> Prototype only. All patient data is synthetic. This is not a medical device. Every output is a draft for review by a qualified clinician.

## The journey

**Thomas Varghese (synthetic), 58, Kakkanad.** He messages the hospital about diabetes and a painful knee. At each step an AI-assisted check surfaces something, and together these lead to an early colon cancer diagnosis. Along the way his staging CT report is corrected, he is cleared by Cardiology, gets cashless insurance approval, has his kidneys checked before chemotherapy, is admitted to the ICU with chemotherapy toxicity, and is followed at home by a rehab coach and remote monitoring.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Symptom Intake & Triage | Digital front door | Reads a WhatsApp message and intake answers; screens for emergencies, sets urgency, routes to Endocrinology, drafts the patient reply |
| 2 | Ambient Clinical Scribe | Endocrinology OPD | Turns the transcript into a SOAP note, ICD-10 codes, orders and a patient summary; flags weight loss and bowel change |
| 3 | Diabetes Co-pilot | Endocrinology | Reads the CGM patterns (with charts), drafts regimen changes for approval, writes Kerala-diet coaching; escalates the iron-deficiency anaemia |
| 4 | Ortho Surgery Planner | Orthopaedics | Drafts the TKA indication, implant options, risk table, optimisation checklist, consent and rehab; returns "defer pending GI workup" |
| 5 | Structured Radiology Reporting | Radiology | Structures the staging CT dictation, catches a findings-vs-impression contradiction and a laterality error, routes incidental findings with guideline follow-up |
| 6 | Tumour Board Assistant | Oncology | Staging, tumour biology, guideline options, neuropathy and diabetes interactions, knee-surgery timing, draft MDT outcome |
| 7 | Cardiac Pre-op Co-pilot | Cardiology | RCRI and biomarker risk, whether stress testing is needed within the cancer-surgery window, peri-operative drug plan, troponin surveillance, clearance note |
| 8 | Pre-auth & TPA Packet Builder | Insurance desk | Checks policy clauses, calculates room-rent proportionate deductions, drafts the medical-necessity letter, document checklist and TPA query responses |
| 9 | Pre-op Readiness & WHO Checklist | Surgery / Anaesthesia | Admission-day readiness gate across every earlier plan; catches consent without the possible ileostomy, no stoma marking, unadjusted insulin, missing oral antibiotic prep; pre-fills the WHO checklist |
| 10 | Nursing Handover & NEWS2 Watch | Nursing | Scores the post-op night observations (0 → 6), escalates before handover, SBAR, day-shift tasks, documentation gaps |
| 11 | Intelligent Discharge | Surgical Gastroenterology | Medication reconciliation, clinician summary, cross-specialty follow-up, plain-English home instructions, medication calendar |
| 12 | Coding & Billing Audit | Medical Records / Revenue cycle | Documentation-supported code fixes (nodal metastases, complications), duplicate and wrong-claim charges, unbilled services, claim reconciliation within the approval |
| 13 | Lab & Report Explainer | Laboratory / Surgical OPD | Trend-aware clinician summary and a plain-language take-home explanation of pathology and labs, after the doctor's discussion |
| 14 | Kidney Co-pilot | Nephrology | eGFR trend and CKD staging, Cockcroft-Gault dosing check for CAPOX, sick-day rules, contrast guidance, albuminuria plan |
| 15 | ICU Round Co-pilot | Critical Care | Euglycaemic DKA, neutropenic sepsis and AKI during chemotherapy: problem-based plan, bundle tracking, drug review, SBAR handover; links early toxicity to a missing DPYD result |
| 16 | Med Reconciliation & Antibiotic Stewardship | Clinical Pharmacy | ICU-to-ward reconciliation; blocks unsafe restarts, QTc and PPI flags, day-3 antibiotic stop recommendation with renal-dose check |
| 17 | Rehab Coach | Physiotherapy | Six-week home plan after the ICU stay, with traffic-light safety rules tied to blood counts, glucose and diarrhoea, daily check-ins and weekly physio summaries |
| 18 | Remote Monitoring Agent | Remote care | Reads home readings (with trend charts) and WhatsApp messages together; flags likely C. difficile after ICU antibiotics, tells the patient not to take loperamide, scripts the nurse call |
| 19 | Patient Journey Story | Cross-specialty | One narrative across specialties: where AI changed the course, open loops, the next 90 days |

**Second journey: Anitha Joseph (synthetic), 49, Aluva.** Decompensated MASH cirrhosis with a small liver cancer; her son is the living-donor candidate.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Liver Transplant Work-up | Hepatology / Liver Transplant | MELD 3.0 and Child-Pugh with arithmetic, Milan criteria, recipient and donor readiness tracker, GRWR and remnant volume, THOTA legal steps, family explanation |

**Third journey: Rajan Pillai (synthetic), 67, Tripunithura.** Heart failure with reduced ejection fraction, seen in clinic a week after an admission.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Heart Failure Co-pilot | Cardiology / HF clinic | Congestion status, four-pillar medicine gaps, dated titration plan with BP/K/creatinine checks, ARNI washout, iron, CRT-D eligibility, Kerala-diet salt and fluid advice |

The home page also maps all 26 use cases from the roadmap (antenatal and paediatric safety, decision-support sidebar, specialist routing, referral digest and more). The twenty-one above are live; the rest are marked "Roadmap".

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
public/             Vanilla HTML/CSS/JS front end (VPS Lakeshore brand)
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

# VPS Lakeshore · Clinical AI Showcase

Working prototypes of Claude across the patient journey at VPS Lakeshore Hospital, Kochi. The prototypes follow one **synthetic** patient from the first consultation to discharge, across several specialties.

> Prototype only. All patient data is synthetic. This is not a medical device. Every output is a draft for review by a qualified clinician.

## The journey

**Thomas Varghese (synthetic), 58, Kakkanad.** He messages the hospital about diabetes and a painful knee. At each step an AI-assisted check surfaces something, and together these lead to an early colon cancer diagnosis. Along the way he is cleared by Cardiology and gets cashless insurance approval.

| # | Prototype | Specialty | What Claude does |
|---|---|---|---|
| 1 | Symptom Intake & Triage | Digital front door | Reads a WhatsApp message and intake answers; screens for emergencies, sets urgency, routes to Endocrinology, drafts the patient reply |
| 2 | Ambient Clinical Scribe | Endocrinology OPD | Turns the transcript into a SOAP note, ICD-10 codes, orders and a patient summary; flags weight loss and bowel change |
| 3 | Diabetes Co-pilot | Endocrinology | Reads the CGM patterns (with charts), drafts regimen changes for approval, writes Kerala-diet coaching; escalates the iron-deficiency anaemia |
| 4 | Ortho Surgery Planner | Orthopaedics | Drafts the TKA indication, implant options, risk table, optimisation checklist, consent and rehab; returns "defer pending GI workup" |
| 5 | Tumour Board Assistant | Oncology | Staging, tumour biology, guideline options, neuropathy and diabetes interactions, knee-surgery timing, draft MDT outcome |
| 6 | Cardiac Pre-op Co-pilot | Cardiology | RCRI and biomarker risk, whether stress testing is needed within the cancer-surgery window, peri-operative drug plan, troponin surveillance, clearance note |
| 7 | Pre-auth & TPA Packet Builder | Insurance desk | Checks policy clauses, calculates room-rent proportionate deductions, drafts the medical-necessity letter, document checklist and TPA query responses |
| 8 | Intelligent Discharge | Surgical Gastroenterology | Medication reconciliation, clinician summary, cross-specialty follow-up, plain-English home instructions, medication calendar |
| 9 | Patient Journey Story | Cross-specialty | One narrative across specialties: where AI changed the course, open loops, the next 90 days |

The home page also maps all 25 use cases from the roadmap (heart failure, nephrology, ICU, radiology, remote monitoring and more). The nine above are live; the rest are marked "Roadmap".

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
data/patient.json   Synthetic patient (FHIR-shaped): problems, meds, labs,
                    CGM profile, reports, timeline
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

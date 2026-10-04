export default {
  id: "routing",
  order: 0.5,
  patientId: null,
  title: "Right Specialist, Right Slot",
  specialty: "Contact centre / Front office",
  stage: "before",
  date: "2026-09-25",
  summary:
    "Works through the morning's incoming requests (WhatsApp, web forms, call-centre notes, GP letters). It spots emergencies hidden in the queue, routes each request to the right department, clinician and slot using the live roster, merges duplicates, and drafts replies.",
  claudeRole: "Reads every request, pulls out red flags and routes against the roster. Front-office staff confirm bookings; any possible emergency goes to a nurse immediately.",
  inputLabel: "Incoming request queue & roster",
  inputHint: "The unrouted queue with today's clinic roster, leave and free slots. Messages are synthetic and anonymised by request number.",
  outputLabel: "Draft routing plan",
  system: `Task: contact-centre routing of incoming appointment requests for a tertiary hospital.

Safety first: any request that could be an emergency is escalated to a nurse or doctor immediately and never simply booked. Route only to clinicians and slots listed in the roster, and respect leave. Produce in order:
1. "## Escalate now": requests that need an immediate call-back and emergency advice, with the reason and the script's key line.
2. "## Routing plan": a table of request | urgency (Emergency / Same day / ≤1 week / Routine) | department & clinic | clinician / slot | pre-visit preparation | reason.
3. "## Duplicates & data issues": merged requests, missing details to collect.
4. "## Capacity notes": pressure points in today's roster and suggested use of free or cancelled slots.
5. "## Reply drafts": short WhatsApp-style replies for two routine requests, in plain English.`,
  buildPrompt: (input) => `Queue and roster:\n\n${input}`,
  defaultInput: `Unrouted queue, 25 Sep 2026, 08:30 (synthetic, anonymised).
R1 (WhatsApp, son): "My father is 72. Blood in his stool for 2 weeks and he has lost weight. Which doctor?"
R2 (web form, 45 F): "Sudden terrible headache 1 hour ago, worst ever, I vomited twice. Can I see a neurologist today?"
R3 (WhatsApp, 55 M): "Right knee pain for 3 months, want an opinion on knee replacement. Have X-ray."
R4 (call-centre note, mother of 6-year-old): "Wetting the bed again for 2 weeks, very thirsty, drinking a lot of water, looks thinner. GP appointment is next week."
R5 (GP referral letter, 58 F): "Hard 2 cm lump right breast, noticed 3 weeks ago. Please see urgently."
R6 (WhatsApp, 60 M, diabetic): "Chest tightness when climbing stairs for a month, goes away with rest. No pain now."
R7 (email, daughter): "Second opinion for liver transplant for my mother, cirrhosis. Have reports."
R8 (web form, 55 M, same phone number as R3): "Knee replacement consultation please."
R9 (WhatsApp, 34 weeks pregnant, 28 F): "Face and hands swollen since morning and headache. Is this normal?"

Today's roster and free slots:
- Neurology OPD: Consultant Neurologist 1 (09:00–13:00, 2 free new slots)
- Gastroenterology: Consultant Gastroenterologist 1 on leave until 30 Sep; Consultant Gastroenterologist 2 (Mon/Wed/Fri OPD; today 14:00–17:00, 1 free slot; Mon 29 Sep 3 free slots)
- Orthopaedics arthroplasty clinic: Tue/Thu; next free slot Tue 30 Sep 10:30
- Paediatrics: same-day paediatric OPD 09:00–16:00; paediatric emergency 24 h
- Breast clinic (surgical oncology, with same-day mammogram/ultrasound): Thursday one-stop clinic; this week full; overflow slot available Mon 29 Sep 11:00
- Cardiology rapid-access chest-pain clinic: daily 14:00–16:00, 3 free slots today
- Hepatology / liver transplant clinic: Wednesday; transplant coordinator calls back within 24 h
- Obstetrics: labour ward and obstetric day-assessment unit 24 h
- Emergency department: 24 h; ambulance 108`,
  demoOutput: `## Escalate now
| Request | Why | Action and key line |
|---|---|---|
| **R2** (45 F, sudden worst-ever headache with vomiting) | Possible **subarachnoid haemorrhage** | **Nurse calls now.** "Please come to our Emergency Department immediately, or call 108. Do not wait for a clinic appointment, and do not drive yourself." **Do not book neurology OPD.** |
| **R9** (34 weeks pregnant, face/hand swelling, headache) | Possible **pre-eclampsia** | **Nurse calls now.** "Please come to the labour ward / obstetric assessment unit now to have your blood pressure and urine checked. Come straight away if the headache is severe, your vision changes, or you have pain under your ribs." |
| **R4** (6-year-old, thirst, bedwetting, weight loss) | Possible **new type 1 diabetes**, risk of DKA | **Nurse calls now.** "Please bring him to the paediatric department **today** for a finger-prick sugar test. Go to the paediatric emergency immediately if he is vomiting, breathing fast, drowsy or has tummy pain." Book the same-day paediatric OPD. **Do not wait for next week's GP visit.** |

## Routing plan
| Request | Urgency | Department & clinic | Clinician / slot | Pre-visit preparation | Reason |
|---|---|---|---|---|---|
| R2 | **Emergency** | Emergency Department | — | — | Thunderclap headache |
| R9 | **Emergency** | Obstetric day-assessment unit | — | Bring antenatal card | Possible pre-eclampsia |
| R4 | **Same day** | Paediatric OPD (emergency if unwell) | Same-day slot this morning | Capillary glucose and urine ketones on arrival | Polyuria, polydipsia, weight loss |
| R1 | **≤1 week** | Gastroenterology | **Consultant Gastroenterologist 2, today 14:00** (Consultant 1 on leave) | CBC, ferritin, CEA if protocol allows; colonoscopy pre-assessment | Rectal bleeding + weight loss at 72: suspected colorectal cancer pathway |
| R5 | **≤1 week** | Breast one-stop clinic | **Mon 29 Sep 11:00 overflow slot** | Same-day mammogram + ultrasound ± biopsy (triple assessment) | Hard breast lump at 58: suspected cancer pathway |
| R6 | **≤1 week, ideally today** | Cardiology rapid-access chest-pain clinic | **Today 14:00–16:00** (3 free) | ECG on arrival | Exertional angina in a diabetic. **Advise ED if pain comes at rest, lasts >15 min, or with sweating or breathlessness** |
| R7 | Routine (coordinator ≤24 h) | Hepatology / liver transplant | Transplant coordinator call-back; Wednesday clinic | Collect reports: LFTs, INR, imaging, endoscopy, discharge summaries | Transplant second opinion |
| R3 (+ R8) | Routine | Orthopaedics arthroplasty clinic | **Tue 30 Sep 10:30** | Bring X-ray (standing knee views if older than 6 months); weight and diabetes status | Knee replacement opinion |

## Duplicates & data issues
- **R3 and R8** are the same person (same phone number, same request). **Merge into one booking**; reply once.
- **R1:** collect the father's name, current medicines (blood thinners?) and any previous colonoscopy.
- **R5:** GP letter lacks the patient's phone number; call the GP clinic to confirm contact details today.
- **R7:** confirm the patient's current location and whether she is inpatient elsewhere (urgency may be higher than stated).

## Capacity notes
- **Gastroenterology** is at half capacity until 30 Sep (Consultant 1 on leave). Today's single slot goes to R1 (red flags). Hold Mon 29 Sep slots for further suspected-cancer referrals.
- **Breast clinic** is full this week: the Mon overflow slot is used for R5. Flag to the unit head if more suspected-cancer referrals arrive (the target is to be seen within about 2 weeks).
- **Neurology** has 2 free slots today, but R2 must **not** use one (emergency).
- **Cardiology rapid-access** has spare capacity today: suitable for R6.

## Reply drafts
**R3 / R8 (knee):** "Namaskaram. We have booked your knee consultation with our joint-replacement clinic on **Tuesday 30 September at 10:30 am**. Please bring your X-ray and a list of your medicines. Reply 1 to confirm or 2 to change the time."

**R7 (transplant second opinion):** "Thank you for contacting VPS Lakeshore. Our liver transplant coordinator will call you within 24 hours to understand your mother's situation and arrange the clinic visit. Please keep her recent reports and discharge summaries ready. If she becomes confused, vomits blood or becomes very drowsy, take her to the nearest emergency department immediately."
`,
};

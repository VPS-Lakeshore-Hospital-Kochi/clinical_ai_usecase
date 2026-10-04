export default {
  id: "triage",
  order: 1,
  title: "Symptom Intake & Triage",
  specialty: "Digital front door",
  stage: "before",
  date: "2026-07-02",
  summary:
    "Reads a patient's WhatsApp message and intake answers, screens for emergencies, sets urgency, routes to the right specialty and replies to the patient, before any doctor is involved.",
  claudeRole: "Screens for red flags, sets urgency and routing, and drafts the reply. A triage nurse reviews anything above routine.",
  inputLabel: "Patient message & intake answers",
  inputHint: "In production this arrives from the WhatsApp or web intake flow, with automated screening questions already answered.",
  outputLabel: "Draft triage decision",
  system: `Task: digital front-door triage of a patient-initiated message (WhatsApp or web), before any clinician contact.

Be conservative: if an emergency cannot be excluded, escalate. Never diagnose, prescribe or change medicines in the patient reply. Produce in order:
1. "## Urgency": one disposition (Emergency now / Same day / Within 1 week / Routine) with a one-line reason.
2. "## Emergency screen": a table of red flag | answer | status (✅ absent / ⚠️ present / ❓ unknown), covering chest pain, breathlessness, confusion, severe hypoglycaemia, vomiting/dehydration, GI bleeding, fever and anything specific to the complaint.
3. "## Clinical concerns for the receiving doctor": bullets of what should not be missed, including issues the patient did not ask about.
4. "## Routing": department first seen, why, and any later referrals, with the appointment type.
5. "## Pre-visit preparation": investigations the protocol allows before the visit, and what to bring.
6. "## Reply to the patient": a WhatsApp-length message in plain English (under 120 words) with the appointment plan and clear "go to Emergency now if..." safety-netting.
7. "## Front-desk hand-off": a table of field | value (patient, MRN if known, urgency, department, slot preference, language, flags).`,
  buildPrompt: (input) => `Incoming patient contact:\n\n${input}`,
  defaultInput: `Channel: WhatsApp (Lakeshore Care line), 2 July 2026, 21:14
Matched to existing record: LH-SYN-000158 (last seen Jan 2025, Internal Medicine)

Patient message:
"Hello, I am Thomas Varghese. I was seen in your hospital last year for sugar. Now my sugar is always 250 to 300 after food, and some nights I wake up sweating and shaking. My right knee pain is very bad, I cannot walk to church. I feel very tired and my wife says I have become thin. Which doctor should I see?"

Automated intake answers:
- Chest pain, or breathlessness at rest: No
- Confusion, drowsiness, vomiting, unable to keep fluids down: No
- Lowest sugar reading recently: 58 mg/dL at 3 AM last week; took juice, felt better
- Blood in stool or black stools: Not noticed
- Weight loss: about 4 kg in 6 months, not trying
- Fever: No
- Current medicines: metformin, glimepiride, night insulin 16 units, BP tablet, cholesterol tablet, aceclofenac for the knee most days
- Preferred language: English (Malayalam also fine)
- Preferred appointment time: mornings`,
  demoOutput: `## Urgency
**Within 1 week.** No emergency features, but recurrent night-time hypoglycaemia on sulfonylurea + insulin and unexplained weight loss need prompt specialist review.

## Emergency screen
| Red flag | Answer | Status |
|---|---|---|
| Chest pain / breathlessness at rest | No | ✅ absent |
| Confusion, drowsiness | No | ✅ absent |
| Vomiting / unable to keep fluids | No | ✅ absent |
| Hypoglycaemia (<70 mg/dL; severe if <54 or needing help) | Lowest 58 mg/dL, self-treated | ⚠️ present (level 1, recurrent, not severe) |
| Very high sugar with symptoms (>400, thirst, vomiting) | Post-meal 250–300, no vomiting | ✅ absent |
| GI bleeding (blood / black stools) | Not noticed | ✅ absent |
| Fever | No | ✅ absent |
| Unintentional weight loss | ~4 kg in 6 months | ⚠️ present |

## Clinical concerns for the receiving doctor
- **Recurrent nocturnal hypoglycaemia** (02:00–04:00) on glimepiride + glargine 16 U: a risk of a severe episode before the appointment.
- **Unintentional weight loss (~4 kg) with marked fatigue**: needs evaluation beyond diabetes (consider blood count and further workup).
- **Daily NSAID (aceclofenac)** with diabetes: renal and GI risk.
- Knee pain is limiting mobility. Orthopaedic referral is likely, but diabetes review should come first.

## Routing
- **First:** Endocrinology OPD, new-problem slot within 1 week (morning). Endocrinology covers both the hypoglycaemia and the weight-loss workup.
- **Later:** Orthopaedics referral from the endocrinologist once the medical review is done.
- **Nurse call-back within 24 hours** to give hypoglycaemia safety advice, because lows are recurring.

## Pre-visit preparation
- Per the diabetes return-visit protocol, fasting blood tests on the morning of the visit: HbA1c, fasting glucose, creatinine/eGFR, CBC.
- Bring: glucometer and any written sugar readings, all medicine strips (including the knee tablet), and last year's reports.

## Reply to the patient
Thank you, Mr. Thomas. We have booked you with our diabetes specialist (Endocrinology) this week, on a morning slot. Please come fasting so we can do blood tests first, and bring your sugar meter and all your medicines, including the knee tablet. A nurse will call you tomorrow about the night-time low sugars. If your sugar falls below 70, take 3 teaspoons of sugar in water and recheck after 15 minutes.
**Go to Emergency now** or call 112 (or 108 for an ambulance) if you have chest pain, breathlessness, confusion, fainting, vomiting blood or black stools, or a low sugar that does not improve.

## Front-desk hand-off
| Field | Value |
|---|---|
| Patient | Thomas Varghese (returning) |
| MRN | LH-SYN-000158 |
| Urgency | Within 1 week |
| Department | Endocrinology, new-problem slot |
| Slot preference | Morning |
| Pre-visit | Fasting labs per protocol |
| Nurse call-back | Within 24 h: hypoglycaemia advice |
| Language | English (Malayalam OK) |
| Flags | Recurrent hypoglycaemia · unintentional weight loss · daily NSAID |
`,
};

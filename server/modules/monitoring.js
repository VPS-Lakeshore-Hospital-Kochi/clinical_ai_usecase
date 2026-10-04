import { patient } from "../patient.js";

const hm = patient.homeMonitoring;
const readingsTable = [
  "Time          | Glucose | BP      | HR  | Temp | Weight",
  ...hm.readings.map(
    (r) =>
      `${r.label.padEnd(13)} | ${String(r.glucose).padEnd(7)} | ${`${r.sbp}/${r.dbp}`.padEnd(7)} | ${String(r.hr).padEnd(3)} | ${r.temp.toFixed(1)} | ${r.weightKg ? `${r.weightKg} kg` : "—"}`,
  ),
].join("\n");
const stools = hm.stoolsPerDay.map((s) => `${s.date}: ${s.count}`).join("; ");

export default {
  id: "monitoring",
  order: 13,
  title: "Remote Monitoring Agent",
  specialty: "Remote monitoring",
  stage: "recovery",
  date: "2026-09-27",
  widgets: ["vitals"],
  summary:
    "Watches home readings and patient messages between visits. It separates signal from noise, decides who needs to act and how fast, replies to the patient and gives the nurse a call script.",
  claudeRole: "Reads trends across readings and messages, grades alerts and drafts the escalation. The remote-care nurse calls and the doctor decides.",
  inputLabel: "Home readings & patient messages",
  inputHint: "Readings stream in from home devices; stool counts and messages arrive on WhatsApp. Claude reads the combination, not single values.",
  outputLabel: "Draft alert triage",
  system: `Task: remote patient monitoring triage for a remote-care nurse.

Judge trends and combinations, not single readings. Tie every alert to the patient's recent history (medicines, recent admissions, antibiotics, chemotherapy). Never advise the patient to start, stop or change a medicine except to hold one the care team has already told them to hold. Produce in order:
1. "## Alert summary": a table of priority (🔴 act today / 🟠 review within 48 h / 🟢 no action) | signal | trend | action.
2. "## Clinical interpretation": what the combination of signals most likely means, the differential, and why it matters for this patient.
3. "## Escalation": who is contacted, how fast, where the patient should be seen, and the tests to order.
4. "## Reply to the patient": a WhatsApp reply in plain English, under 120 words, answering their question directly.
5. "## Nurse call script": 5–7 questions for the call, and the answers that would upgrade to Emergency.
6. "## Monitoring plan changes": thresholds or reading frequency to change until this resolves.`,
  buildPrompt: (input) => `Remote monitoring data:\n\n${input}`,
  defaultInput: `Home monitoring, ${hm.period}. Discharged home 25 Sep after ICU admission (20–24 Sep) for euglycaemic DKA, neutropenic sepsis and AKI during chemotherapy.
Devices: ${hm.devices}.

Readings:
${readingsTable}

Loose stools per day: ${stools}.

Context: piperacillin-tazobactam 20–24 Sep. Stool C. difficile PCR negative on 20 Sep (before antibiotics). Capecitabine stopped; chemotherapy on hold. Empagliflozin and metformin stopped; telmisartan on hold; insulin glargine 12 U. Discharge bloods 24 Sep: creatinine 1.3, ANC 1.9, platelets 142. Discharge prescription included loperamide "if diarrhoea recurs".

WhatsApp message, 27 Sep 14:10: "Loose motion again, 5 times today, some stomach cramps. Should I take the loperamide the doctor gave?"`,
  demoOutput: `## Alert summary
| Priority | Signal | Trend | Action |
|---|---|---|---|
| 🔴 | **Loose stools** | 1 → 3 → 5/day, with cramps | Same-day review; stool C. difficile test |
| 🔴 | **Heart rate** | 86 → 104 over 48 h | Part of a dehydration / infection picture |
| 🔴 | **Blood pressure** | 118/72 → 102/64 (telmisartan already held) | Falling despite no BP medicine |
| 🔴 | **Temperature** | 37.0 → 37.9 °C, rising steadily | Recently neutropenic: check blood count today |
| 🔴 | **Weight** | 81.4 → 80.2 kg in 38 h | ~1.2 kg fluid loss |
| 🟠 | **Glucose** | Post-meal 238 → 281, fasting 164–172 | Endocrinology review within 48 h; may reflect illness |
| 🟢 | Fasting glucose | 164–172 | No hypoglycaemia |

## Clinical interpretation
- The **combination** matters more than any single reading: new diarrhoea, cramps, low-grade fever, rising heart rate, falling BP and weight loss.
- **Most likely: Clostridioides difficile infection.** He had 5 days of piperacillin-tazobactam (a high-risk antibiotic) ending 24 Sep, and the negative test on 20 Sep was taken *before* antibiotics, so it does not exclude infection now.
- **Differential:** delayed or persistent fluoropyrimidine toxicity (DPD deficiency, last dose 19 Sep), other infective colitis, and early recurrent dehydration.
- **Why it matters for him:** he had AKI 7 days ago (creatinine still 1.3), ketoacidosis triggered by dehydration, and neutropenia. Another episode of dehydration could quickly repeat the ICU admission.
- **Loperamide must not be taken** until C. difficile is excluded, because slowing the bowel in C. difficile infection risks toxic megacolon.

## Escalation
- **Now:** remote-care nurse calls the patient (script below). Inform the **on-call oncology registrar** within 30 minutes.
- **Where:** same-day assessment today in the **Lakeshore oncology day-care unit**, or the **Emergency Department** if it is after hours or any red answer in the call script.
- **Tests:** stool C. difficile (GDH/toxin or PCR per lab protocol), CBC with ANC, creatinine, electrolytes including K and Mg, venous gas and ketones (DKA 7 days ago), CRP, lactate if hypotensive.
- **Notify:** Endocrinology (glucose trend and ketone check), and flag to Nephrology if creatinine has risen.

## Reply to the patient
Thank you for telling us, Mr. Thomas. **Please do not take the loperamide for now.** After the antibiotics you had in hospital, this diarrhoea needs a stool test first, and loperamide can make some infections worse.
Your readings show your body is losing fluid. A nurse will call you in the next few minutes, and we would like to see you **today** at the hospital.
Until then, keep sipping ORS or kanji water, and continue your insulin.
**Go straight to Emergency** if you feel faint, are confused, have severe stomach pain, pass blood, or cannot keep fluids down.

## Nurse call script
1. How many loose stools since morning, and is there any blood or black stool? *(blood → Emergency)*
2. Stomach pain: where, and how bad (0–10)? Is your stomach swollen? *(severe pain or swelling → Emergency)*
3. Are you dizzy when you stand, or have you fainted? *(yes → Emergency, do not drive)*
4. When did you last pass urine, and how much? *(none in 8 h → Emergency)*
5. Can you drink and keep fluids down? *(no → Emergency)*
6. What is your temperature now? *(≥38.0 °C → Emergency: recent neutropenia)*
7. What was your last sugar, and do you have ketone strips? *(ketones ≥1.5 or sugar >300 with vomiting → Emergency)*

## Monitoring plan changes
- Until reviewed and for 72 h after: **vitals every 4 hours while awake**, a stool count with each reading, and temperature at night.
- **Lower alert thresholds** for this episode: HR ≥100, SBP <105, temperature ≥37.8 °C, ≥3 loose stools/day, weight loss ≥1 kg/24 h.
- Pause the rehab coach's exercise sessions (🔴 day) until diarrhoea settles; resume at the week-1 level.
- Add a daily ketone check while glucose runs above 250.
`,
};

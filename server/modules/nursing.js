export default {
  id: "nursing",
  order: 8.7,
  title: "Nursing Handover & NEWS2 Watch",
  specialty: "Nursing",
  stage: "inpatient",
  date: "2026-08-20",
  summary:
    "Scores every set of observations with NEWS2, spots a patient drifting before the numbers look alarming, decides whether escalation can wait for handover, and writes a structured SBAR handover with the day shift's task list.",
  claudeRole: "Scores the observations, reads the trend and drafts the handover. The nurse in charge escalates and the doctor reviews.",
  inputLabel: "Night-shift observations & notes",
  inputHint: "Observation chart, fluid balance, medicines given and nursing notes from the night shift. Claude checks them against the post-operative plans in the chart.",
  outputLabel: "Draft handover & escalation",
  system: `Task: nursing shift handover and early-warning (NEWS2) review on a surgical ward.

Score NEWS2 exactly per the Royal College of Physicians 2017 chart (SpO2 scale 1 unless the chart says otherwise) and show each parameter's score. Judge the trend, not only the latest score. Produce in order:
1. "## Escalate now?": yes/no, who to call, how fast (per the NEWS2 response thresholds), and why it should not wait for handover if that applies.
2. "## NEWS2 scores": a table of time | RR | SpO2 | air/O2 | SBP | HR | consciousness | temp | total, with per-parameter scores in brackets.
3. "## What could be happening": a short differential for this patient at this point after surgery, most likely first, with what supports or argues against each.
4. "## SBAR handover": Situation, Background, Assessment, Recommendation, for the day-shift nurse and the doctor.
5. "## Day-shift task list": a "- [ ]" list with times, covering monitoring frequency, tests due, medicines, lines and drains, glucose, mobility, VTE and falls.
6. "## Documentation gaps from the night": anything the chart or protocol required that was not done or recorded.`,
  buildPrompt: (input) => `Night-shift record:\n\n${input}`,
  defaultInput: `Surgical ward, bed 12. Night shift 19 Aug 20:00 → 20 Aug 07:30 handover.
Post-op day 1 after laparoscopic anterior resection (19 Aug, 08:00–11:30). No stoma formed. Pelvic drain in situ.

Observations (all on room air, patient Alert throughout):
- 19 Aug 20:00: RR 16, SpO2 97%, BP 128/78, HR 84, temp 37.2
- 20 Aug 00:00: RR 18, SpO2 96%, BP 122/76, HR 92, temp 37.4
- 20 Aug 04:00: RR 21, SpO2 95%, BP 112/70, HR 102, temp 37.6. NEWS2 recorded as 4. Nurse in charge informed: not documented.
- 20 Aug 06:00: RR 22, SpO2 93%, BP 106/66, HR 108, temp 37.8. NEWS2 not yet calculated. Note: "Will inform day team at handover."

Fluid balance 20:00–06:00: IV Ringer's lactate 60 mL/h (600 mL). Oral sips ~200 mL. Urine output 180 mL in 10 h via catheter. Drain 120 mL serosanguinous.
Pain: 6/10 on movement, 3/10 at rest. Paracetamol 1 g 6-hourly given; tramadol 50 mg at 02:00. Shallow breathing noted at 04:00; incentive spirometer at bedside, not used overnight.
Glucose (capillary): 22:00 248, 02:00 262, 06:00 276 mg/dL. Basal-bolus chart: glargine 10 U given 22:00; correction lispro 2 U given at 22:00 only. Ketones not checked.
Medicines given: enoxaparin 40 mg SC 20:00. Telmisartan, metformin, empagliflozin held as per plan.
Bowels: no flatus yet. Nausea mild, ondansetron 4 mg at 23:00.
Mobility: sat out in chair once at 21:00 with help (walking stick at home; peripheral neuropathy).
Pending: hs-troponin at 24 h post-op due 08:00 (cardiology plan). ECG not done since theatre.`,
  demoOutput: `## Escalate now?
**Yes: call the surgical doctor now, before handover.** The NEWS2 is **6 at 06:00** (≥5 is the key threshold for an **urgent response**: medical review within the hour and at least hourly observations). The score has risen **0 → 1 → 4 → 6** in 10 hours, with oliguria. Waiting 90 minutes for handover is not safe. Also inform the nurse in charge now, since the 04:00 score of 4 was not escalated.

## NEWS2 scores
| Time | RR | SpO2 | Air/O2 | SBP | HR | Consciousness | Temp | **Total** |
|---|---|---|---|---|---|---|---|---|
| 19 Aug 20:00 | 16 (0) | 97 (0) | Air (0) | 128 (0) | 84 (0) | A (0) | 37.2 (0) | **0** |
| 20 Aug 00:00 | 18 (0) | 96 (0) | Air (0) | 122 (0) | 92 (1) | A (0) | 37.4 (0) | **1** |
| 20 Aug 04:00 | 21 (2) | 95 (1) | Air (0) | 112 (0) | 102 (1) | A (0) | 37.6 (0) | **4** |
| 20 Aug 06:00 | 22 (2) | 93 (2) | Air (0) | 106 (1) | 108 (1) | A (0) | 37.8 (0) | **6** |

## What could be happening
1. **Hypovolaemia / under-filling:** urine output 18 mL/h (~0.2 mL/kg/h for 88 kg) on only 60 mL/h of IV fluid, rising heart rate and falling BP. *Most likely contributor.*
2. **Basal atelectasis from pain and shallow breathing:** rising RR, falling SpO2, pain 6/10 on movement, incentive spirometer unused.
3. **Early anastomotic leak or intra-abdominal sepsis:** less likely on day 1, but tachycardia with rising temperature must not be dismissed. Check abdomen, drain character, lactate and CRP.
4. **Cardiac event:** RCRI 2 and poor functional capacity, with troponin due at 08:00. **Do an ECG now** and send troponin early if the doctor agrees.
5. **Pulmonary embolism:** less likely on enoxaparin, but consider if hypoxia worsens.
6. **Hyperglycaemia 248 → 276 mg/dL** adds osmotic losses and may reflect stress; **check ketones** (recent SGLT2 inhibitor use).

## SBAR handover
- **S:** Mr. Thomas Varghese, 58, bed 12, POD 1 after laparoscopic anterior resection. **NEWS2 6 at 06:00, rising from 0 overnight**, with low urine output. Doctor called at 06:[__].
- **B:** Stage III sigmoid cancer; T2DM on basal-bolus insulin (empagliflozin stopped 14 Aug); RCRI 2 with a negative stress echo; sulfonamide allergy; neuropathy and knee OA (falls risk).
- **A:** RR 22, SpO2 93% on air, BP 106/66, HR 108, temp 37.8, alert. Urine 180 mL over 10 h. Drain 120 mL serosanguinous. Pain 6/10 on movement. Glucose 276, rising. Likely hypovolaemia plus atelectasis; leak and cardiac causes not yet excluded.
- **R:** Urgent medical review now. Suggest a fluid bolus if the doctor agrees; ECG, lactate, VBG with ketones, FBC, U&E, CRP; send troponin with bloods; oxygen to keep SpO2 94–98%; analgesia review; hourly observations and urine output; recalculate NEWS2 after each intervention.

## Day-shift task list
- [ ] **06:30** Doctor review; ECG; bloods including lactate, ketones and troponin
- [ ] **Hourly** observations and NEWS2, with urine output, until NEWS2 <5 for 4 hours
- [ ] Fluid bolus / new IV rate as prescribed; target urine output ≥0.5 mL/kg/h (≥44 mL/h)
- [ ] **Glucose 2-hourly** while >250; correction insulin per chart; ketones if >250
- [ ] **Incentive spirometer 10 breaths every hour while awake**; sit up; chest physiotherapy referral
- [ ] Analgesia review (pain limiting deep breaths)
- [ ] **08:00** hs-troponin (24 h), if not sent with the 06:30 bloods; **48 h** troponin tomorrow
- [ ] Drain: record volume and character 4-hourly; report if turbid, faeculent or >100 mL/h
- [ ] Enoxaparin 40 mg at 20:00; stockings on
- [ ] Mobilise with physiotherapy and stick (falls risk: neuropathy)
- [ ] Keep telmisartan, metformin and empagliflozin on hold

## Documentation gaps from the night
- **04:00 NEWS2 of 4** (a single parameter scoring 2, for RR): the protocol requires informing the nurse in charge and increasing observation frequency. **Not documented.**
- **06:00 NEWS2 not calculated**, and escalation was deferred to handover.
- **Hourly urine output** not charted despite low totals.
- **Ketones not checked** with glucose >250 in a patient recently on an SGLT2 inhibitor.
- **Incentive spirometry** not encouraged or recorded.
- **Correction insulin** given only once despite rising glucose at 02:00 and 06:00.
`,
};

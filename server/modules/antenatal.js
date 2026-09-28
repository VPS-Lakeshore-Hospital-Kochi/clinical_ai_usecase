export default {
  id: "antenatal",
  order: 40,
  patientId: "syn-000415",
  title: "Antenatal Risk Review",
  specialty: "Obstetrics",
  stage: "specialty",
  date: "2026-09-24",
  summary:
    "Reviews an antenatal visit against the whole pregnancy record: flags new risks early, checks routine care that may have been missed, and drafts a plan for the obstetrician with plain-language warning signs for the mother.",
  claudeRole: "Reads the pregnancy record, flags risks and missed care, and drafts the plan. The obstetrician decides.",
  inputLabel: "Antenatal visit",
  inputHint: "Today's findings, glucose log and scan. Claude checks them against booking results and the care schedule in the chart.",
  outputLabel: "Draft antenatal review",
  system: `Task: antenatal risk review for an obstetrician (NICE NG133 hypertension in pregnancy, NICE NG3 diabetes in pregnancy, FOGSI and RCOG guidance where relevant).

Check routine care against the record, not only today's problem. Produce in order:
1. "## Safety flags": numbered, most urgent first, with the action and timeframe.
2. "## Risk assessment": a table of condition | criteria | today's evidence | status (✅ / ⚠️ / ❌).
3. "## Plan": grouped by problem (blood pressure and pre-eclampsia, gestational diabetes, anaemia, rhesus status, fetal wellbeing), with specific doses and targets for the obstetrician to confirm.
4. "## Delivery planning": recommended timing and place of birth given the current risks, and what would change it.
5. "## Warning signs for you (patient copy)": plain English, under 120 words.
6. "## Follow-up schedule": a table of when | what | who.`,
  buildPrompt: (input) => `Antenatal visit:\n\n${input}`,
  defaultInput: `Antenatal clinic, 24 Sep 2026. Fathima Rasheed, 29, G2P1L1, 30+2 weeks (EDD 1 Dec 2026 by dating scan).
BP: 142/92, repeat after 15 min 144/94 (seated, correct cuff). Previous: 118/74 at booking, 132/84 at 28 weeks.
Symptoms: mild frontal headache for 2 days, relieved by paracetamol. No visual disturbance, epigastric pain or breathlessness. Mild ankle swelling. Fetal movements normal.
Urine protein:creatinine ratio 0.28 mg/mg. Bloods today: Hb 9.6, ferritin 14, platelets 182, ALT 28, creatinine 0.6.
GDM: diagnosed 27 Aug (26 weeks) by 75 g OGTT (98/190/168). NPH insulin 8 U at bedtime since 10 Sep.
Glucose log (last 7 days): fasting 98–105 mg/dL; 1 hour after meals 150–165 mg/dL (worst after lunch).
Growth scan today: EFW 1,850 g (~85th centile), abdominal circumference 90th centile, AFI 22 cm, umbilical artery Doppler normal.
Blood group O Rh-negative, antibody screen negative at booking. 28-week anti-D prophylaxis: not documented. Partner's blood group: not recorded.
Iron: oral ferrous ascorbate, often missed because of nausea.
Aspirin: not started at booking.
Family history: mother had pre-eclampsia.`,
  demoOutput: `## Safety flags
1. **New hypertension at 30 weeks (142/92, 144/94) with headache.** Treat as gestational hypertension until confirmed otherwise, and **exclude pre-eclampsia today**. Same-day day-assessment-unit review: repeat BP, symptoms, bloods; consider sFlt-1/PlGF testing. Admit if BP ≥160/110, the headache persists or worsens, or any severe feature appears.
2. **Rh-negative with no documented 28-week anti-D prophylaxis.** Confirm it was not given. If not, **give anti-D immunoglobulin as soon as possible** after a repeat antibody screen. Record the partner's blood group: if he is Rh-negative, prophylaxis is not needed.
3. **GDM above target on current insulin:** fasting 98–105 (target <95) and 1-hour post-meal 150–165 (target <140), with abdominal circumference at the 90th centile. Intensify treatment this week.
4. **Moderate iron-deficiency anaemia** (Hb 9.6, ferritin 14) at 30 weeks, with poor tolerance of oral iron. **IV iron** now, to allow time for Hb to rise before delivery.

## Risk assessment
| Condition | Criteria | Today's evidence | Status |
|---|---|---|---|
| Gestational hypertension | New BP ≥140/90 after 20 weeks, confirmed | 142/92, 144/94 at one visit | ⚠️ Probable: confirm |
| Pre-eclampsia | Hypertension + proteinuria (PCR ≥0.3) or organ dysfunction | PCR 0.28; platelets, ALT, creatinine normal; headache | ⚠️ Not met, but **high risk** (headache, family history, rising BP) |
| Severe features | BP ≥160/110, severe headache, visual symptoms, RUQ pain, platelets <100, rising ALT/creatinine | None | ✅ Absent |
| GDM control | Fasting <95, 1-hour <140 | Both above target | ❌ Not controlled |
| Fetal growth | EFW / AC centiles | EFW ~85th, AC 90th | ⚠️ Accelerated growth (GDM) |
| Liquor | AFI 5–24 cm | 22 cm | ✅ Upper normal: monitor |
| Anaemia | Hb <11 g/dL in pregnancy | 9.6, ferritin 14 | ❌ Moderate IDA |
| Rhesus prophylaxis | Anti-D at 28 weeks if partner Rh-positive or unknown | Not documented | ❌ Missed |
| Aspirin prophylaxis | Started <16 weeks if risk factors | Not started | Too late to start now (benefit needs early start). For review: family history of pre-eclampsia and BMI ~29 are moderate risk factors |

## Plan
**Blood pressure and pre-eclampsia**
- Day-assessment unit today: BP series over 2–4 hours, repeat PCR, CBC, LFT, creatinine. **sFlt-1/PlGF ratio** if available: ≤38 makes pre-eclampsia within 1 week unlikely.
- If sustained ≥140/90: start **labetalol 100 mg twice daily**, target **≤135/85** (nifedipine modified-release 10 mg twice daily if labetalol is unsuitable).
- Home BP monitoring twice daily, with a clear threshold to call.

**Gestational diabetes**
- NPH 8 → **10 U at bedtime** (fasting target <95), then titrate by 2 U every 3 days.
- **Add rapid-acting insulin before lunch** (start 4 U) for post-meal readings above 140. Dietitian review for the lunchtime carbohydrate load (rice portion).
- 4-point glucose log daily (fasting and 1 hour after each meal).

**Anaemia**
- **IV ferric carboxymaltose** (second or third trimester, per unit protocol and weight); recheck Hb and ferritin in 3–4 weeks.
- Stop oral iron while IV iron is given if nausea is limiting.

**Rhesus status**
- Repeat antibody screen today. **Anti-D immunoglobulin as soon as possible** if not given at 28 weeks.
- Record the partner's blood group. Plan cord blood group at birth, and postnatal anti-D if the baby is Rh-positive.

**Fetal wellbeing**
- Growth scan with Doppler every 2 weeks (GDM with AC 90th centile and new hypertension).
- Counsel on fetal movements; same-day review for any reduction.
- Antenatal corticosteroids **only if** delivery before 34+6 weeks becomes likely (for example, pre-eclampsia developing).

## Delivery planning
- **Birth in a hospital with obstetric, neonatal and anaesthetic cover** (VPS Lakeshore).
- **Timing:** if gestational hypertension stays controlled and GDM is managed with insulin, plan delivery at **37+0 to 38+6 weeks**.
- **Changes the plan:** pre-eclampsia with severe features or fetal compromise (earlier delivery, steroids, magnesium sulfate); worsening fetal growth acceleration or polyhydramnios (discuss timing and mode).
- Previous uncomplicated vaginal birth favours planned vaginal birth; review mode at 36 weeks with the EFW.

## Warning signs for you (patient copy)
Fathima, your blood pressure is higher than before. We need to check that it is not the start of pre-eclampsia, a condition that can affect you and the baby.
**Come to the hospital straight away** if you have:
- a bad headache that does not go away with paracetamol
- blurred vision or flashing lights
- pain under your ribs on the right side, or vomiting
- sudden swelling of the face or hands
- fewer baby movements than usual
- bleeding or fluid leaking from the vagina
Check your sugar four times a day and your BP twice a day, and bring your records to every visit.

## Follow-up schedule
| When | What | Who |
|---|---|---|
| Today | Day-assessment unit: BP series, bloods, PCR ± sFlt-1/PlGF; antibody screen; anti-D | Obstetrics / midwife |
| 2–3 days | BP and glucose review; labetalol and insulin titration | Obstetrics |
| This week | IV iron; dietitian | Day care / Nutrition |
| Weekly | Antenatal visit with BP, urine, glucose log | Obstetrics |
| Every 2 weeks | Growth scan and Doppler | Fetal medicine |
| 36 weeks | Plan mode and timing of birth | Obstetrics |
`,
};

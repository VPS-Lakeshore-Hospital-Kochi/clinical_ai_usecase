export default {
  id: "scribe",
  order: 1,
  title: "Ambient Clinical Scribe",
  specialty: "Endocrinology OPD",
  stage: "consultation",
  date: "2026-07-06",
  summary:
    "Turns a doctor–patient conversation into a SOAP note, ICD-10 codes, orders and a plain-language visit summary for the patient.",
  claudeRole: "Listens, structures, codes and writes the patient summary. The doctor edits and signs.",
  inputLabel: "Consultation transcript",
  inputHint: "Paste or edit the transcript. In production this comes from the ambient microphone after the patient consents.",
  outputLabel: "Draft clinical note",
  system: `Task: ambient clinical documentation for an outpatient consultation.

From the consultation transcript, produce these sections in order:
1. "## Safety flags": red flags or safety issues raised in the conversation, or "None identified".
2. "## SOAP note": Subjective, Objective, Assessment (numbered problem list), Plan (grouped by problem). Record only what was said or measured. Mark anything the doctor should verify with "(verify)".
3. "## Suggested ICD-10 codes": a table with Code | Description | Supporting evidence from the transcript. Only code what is documented.
4. "## Orders & referrals": a checklist ("- [ ]") of investigations, prescriptions and referrals discussed.
5. "## Visit summary for the patient": 5–8 short plain-English sentences at about a 6th-grade reading level, addressed to the patient as "you".`,
  buildPrompt: (input) => `Consultation transcript (Endocrinology OPD, 6 July 2026):\n\n${input}`,
  defaultInput: `Doctor: Good morning Mr. Thomas, please sit. How have things been since your last visit?
Patient: Not so good, doctor. My sugar readings at home are always high, 200, 250 after food. Some mornings I wake up sweating and shaky, around 3 or 4 AM.
Doctor: How often does that happen?
Patient: Maybe two or three times a week. I drink some juice and sleep again.
Doctor: Are you taking the glimepiride and the night insulin regularly?
Patient: Yes, glimepiride 2 in the morning, metformin twice, and 16 units of the insulin at night.
Doctor: And your diet? Still rice three times?
Patient: Rice for lunch and dinner, puttu or appam in the morning. And tea with sugar, three cups.
Doctor: Okay. Anything else bothering you?
Patient: My right knee, doctor. The pain is too much. I cannot walk to church now, maybe 200 metres and I have to stop. I take the aceclofenac tablet almost every day.
Doctor: Every day? For how long?
Patient: Six, seven months.
Doctor: Any change in your weight?
Patient: My wife says I have become thin. My shirts are loose. I think I lost 4 kilos, I was not trying.
Doctor: Any tiredness, breathlessness on walking, black stools, blood in the stools?
Patient: Very tired, yes. No blood that I have seen. Stools are sometimes loose, sometimes hard, since a few months.
Doctor: Any tingling or numbness in the feet?
Patient: Sometimes burning at night in the feet.
Doctor: Let me examine. BP is 146 by 88, pulse 84. Weight today 88 kilos. You look a little pale. Monofilament: reduced sensation on both soles, forefoot. Pedal pulses are felt. Right knee has a bony swelling, it bends inwards, there is crepitus, and movement is painful beyond about 100 degrees.
Doctor: Your point-of-care HbA1c today is 9.1. Last year it was 7.8.
Patient: So bad?
Doctor: We will fix it. The night-time lows worry me. I want you to wear a sensor for 14 days so we can see the whole day. I am also sending blood tests: blood count, iron, kidney function, urine albumin, cholesterol. The weight loss and bowel change need to be checked properly, so we will review once reports come. Stop the aceclofenac for now. It is not good for your kidneys and stomach. Take paracetamol for the knee. I will send you to our orthopaedic team for the knee.
Patient: Okay doctor. Thank you.`,
  demoOutput: `## Safety flags
- **Unintentional weight loss (~4 kg over ~6 months) + fatigue + change in bowel habit + clinical pallor** in a 58-year-old. Needs structured evaluation (CBC, iron studies; consider GI referral once results are back). Do not attribute to diabetes alone.
- **Recurrent nocturnal hypoglycaemia** (02:00–04:00, 2–3×/week) on sulfonylurea + basal insulin.
- **Daily NSAID use (aceclofenac) for ~7 months** with diabetes and possible albuminuria: renal and GI bleeding risk. Stopped today.

## SOAP note
**Subjective**
- T2DM since 2014. Home readings 200–250 mg/dL post-meal. Night sweats/shakiness around 03:00–04:00, 2–3×/week, self-treated with juice.
- Adherent to metformin 1000 mg BD, glimepiride 2 mg OD, glargine 16 U HS.
- Diet: rice at lunch and dinner, puttu/appam at breakfast; 3 cups sweetened tea/day.
- Right knee pain limiting walking to ~200 m; aceclofenac almost daily for 6–7 months.
- ~4 kg unintentional weight loss (clothes loose), marked fatigue, alternating loose/hard stools for a few months. No visible blood in stool reported.
- Burning feet at night.

**Objective**
- BP 146/88 mmHg, HR 84/min, weight 88 kg. Appears pale (verify).
- Feet: reduced monofilament sensation bilaterally (forefoot); pedal pulses palpable.
- Right knee: bony enlargement, varus deformity, crepitus, painful flexion beyond ~100°.
- POC HbA1c 9.1% (7.8% in Jan 2025).

**Assessment**
1. T2DM, suboptimally controlled (HbA1c 9.1%) with recurrent nocturnal hypoglycaemia, likely sulfonylurea + basal insulin related.
2. Probable diabetic peripheral neuropathy (symptoms + monofilament).
3. Unintentional weight loss, fatigue, altered bowel habit, pallor: cause not yet known; anaemia suspected.
4. Right knee osteoarthritis with varus deformity, functionally limiting.
5. Hypertension, above target.
6. Chronic NSAID use, now stopped.

**Plan**
1. *Diabetes*: 14-day CGM applied. Review regimen with CGM data (consider stopping glimepiride given hypoglycaemia) (verify with doctor). Diet counselling referral.
2. *Neuropathy*: foot-care education; annual foot exam documented.
3. *Weight loss/anaemia*: CBC, ferritin/iron studies, renal function, UACR, lipid profile. Review results promptly; low threshold for GI evaluation.
4. *Knee*: stop aceclofenac; paracetamol PRN; orthopaedic referral.
5. *Hypertension*: recheck at review; consider titration.

## Suggested ICD-10 codes
| Code | Description | Supporting evidence |
|---|---|---|
| E11.649 | T2DM with hypoglycaemia without coma | Nocturnal sweats/shakiness relieved by juice, 2–3×/week |
| E11.65 | T2DM with hyperglycaemia | HbA1c 9.1%, post-meal 200–250 |
| E11.42 | T2DM with diabetic polyneuropathy | Burning feet, reduced monofilament (verify diagnosis) |
| R63.4 | Abnormal weight loss | ~4 kg unintentional |
| R19.4 | Change in bowel habit | Alternating loose/hard stools for months |
| M17.11 | Unilateral primary OA, right knee | Varus, crepitus, painful ROM |
| I10 | Essential hypertension | BP 146/88 |
| Z79.4 | Long-term (current) use of insulin | Glargine 16 U |

## Orders & referrals
- [ ] 14-day CGM (applied today)
- [ ] CBC with peripheral smear, ferritin, serum iron/TIBC
- [ ] Creatinine/eGFR, potassium, urine albumin-creatinine ratio
- [ ] Fasting lipid profile
- [ ] Stop aceclofenac; paracetamol 650 mg PRN (max 3 g/day)
- [ ] Referral: Orthopaedics (right knee)
- [ ] Referral: Dietitian
- [ ] Review with CGM report and labs in 2 weeks (earlier if labs abnormal)

## Visit summary for the patient
Your sugar is higher than it should be. Your 3-month average (HbA1c) is 9.1%. You are also having low sugar at night, which is not safe. You will wear a small sensor for 14 days so we can see your sugar all day and night. Please stop the aceclofenac pain tablet and use paracetamol instead. We are testing your blood today because you have lost weight without trying and feel tired. We will call you if anything needs attention sooner. Our knee specialist will also see you.
`,
};

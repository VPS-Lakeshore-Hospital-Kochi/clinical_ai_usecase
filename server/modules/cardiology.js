export default {
  id: "cardiology",
  order: 6,
  title: "Cardiac Pre-op Co-pilot",
  specialty: "Cardiology",
  stage: "specialty",
  date: "2026-08-08",
  summary:
    "Brings symptoms, ECG, echo, biomarkers and comorbidities into a pre-operative cardiac risk assessment: risk scores, whether more testing is needed, a peri-operative medication plan and post-op surveillance.",
  claudeRole: "Calculates the risk, weighs the symptoms against the time-sensitive cancer surgery, and drafts the plan and clearance letter. The cardiologist decides.",
  inputLabel: "Pre-operative cardiology consult",
  inputHint: "Referral, symptoms, ECG and echo reports, biomarkers. Claude cross-checks the full chart (diabetes medicines, anaemia, renal function).",
  outputLabel: "Draft cardiac assessment",
  system: `Task: pre-operative cardiovascular assessment before non-cardiac surgery, following the 2024 AHA/ACC multisociety perioperative guideline and the 2022 ESC non-cardiac surgery guideline.

Produce in order:
1. "## Bottom line": one or two sentences: fit / fit with plan / needs evaluation first, and whether surgery timing should change.
2. "## Risk estimation": a table of item | finding | points / category, covering each RCRI criterion, surgical risk category, functional capacity (METs / DASI) and biomarkers. Give the resulting RCRI and approximate MACE risk, citing the source of the estimate.
3. "## Symptom assessment": whether the symptoms suggest myocardial ischaemia, other contributors, and why this matters independent of surgery.
4. "## Recommended evaluation before surgery": the test, why this one, and a timeline that respects the cancer-surgery window. Say what result would change the plan.
5. "## Peri-operative medication plan": a table of drug | before surgery | day of surgery | after surgery | rationale, covering statin, RAS blocker, beta-blocker, antiplatelet, SGLT2 inhibitor, metformin, insulin and anticoagulant prophylaxis.
6. "## Post-operative surveillance": troponin/ECG monitoring and triggers.
7. "## Long-term cardiovascular prevention": targets and follow-up after recovery.
8. "## Note to surgical & anaesthesia teams": 4–6 lines, ready to paste.`,
  buildPrompt: (input) => `Consult details:\n\n${input}`,
  defaultInput: `Cardiology pre-operative consult, 8 Aug 2026. Requested by Surgical Gastroenterology and Anaesthesia before laparoscopic anterior resection planned for 19 Aug 2026 (stage III sigmoid adenocarcinoma; the MDT asks that surgery not be delayed beyond ~4 weeks).
Symptoms: For ~2 months, central chest heaviness when climbing one flight of stairs quickly, settling within 5 minutes of rest. No rest pain, syncope, orthopnoea or palpitations. Walking limited mainly by right knee OA. Cannot climb two flights without stopping (knee and breath). DASI estimated 18 (<4 METs).
Risk factors: T2DM on insulin (glargine 12 U, metformin, empagliflozin 10 mg), hypertension (telmisartan 40 mg), dyslipidaemia (LDL 112 on atorvastatin 20 mg), BMI 31, father MI at 66, never smoker. eGFR 68, UACR 42.
Exam: BP 138/84, HR 78 regular, no murmurs, no signs of heart failure.
ECG: Sinus rhythm 76/min, normal axis, 1 mm horizontal ST depression V5–V6, no Q waves. No prior ECG for comparison.
Echo: LVEF 58%, no regional wall-motion abnormality, mild concentric LVH, grade 1 diastolic dysfunction, no significant valve disease.
hs-Troponin I 6 ng/L (ref <20). NT-proBNP 180 pg/mL.
Hb 9.8 g/dL (IV ferric carboxymaltose 1 g given 6 Aug).
Question: Is he fit for surgery? Does he need further testing, and what peri-operative cardiac plan do you recommend?`,
  demoOutput: `## Bottom line
**Elevated-risk patient with new exertional chest heaviness and lateral ST depression.** Get **expedited non-invasive ischaemia testing this week**. If there is no high-risk ischaemia, proceed on 19 Aug with the peri-operative plan below. The test should not push surgery beyond the MDT window.

## Risk estimation
| Item | Finding | Points / category |
|---|---|---|
| High-risk surgery (intraperitoneal) | Laparoscopic anterior resection | **+1** |
| Ischaemic heart disease | Not established; symptoms under evaluation | 0 (**+1 if angina is confirmed**) |
| Heart failure | None; LVEF 58%, NT-proBNP 180 | 0 |
| Cerebrovascular disease | None | 0 |
| Insulin-treated diabetes | Glargine | **+1** |
| Creatinine >2 mg/dL | 1.0–1.1 | 0 |
| **RCRI** | | **2 (3 if angina)** |
| Surgical risk category | Intraperitoneal colorectal surgery | Intermediate–high |
| Functional capacity | DASI ~18, <4 METs (knee-limited and possibly cardiac) | **Poor / unknown** |
| hs-Troponin I | 6 ng/L | Normal (useful baseline) |
| NT-proBNP | 180 pg/mL | **<300: lower risk** of peri-operative events (Canadian guideline threshold) |

**Estimated MACE risk:** ~6.6% (RCRI 2, original Lee cohort), or ~10% in the updated Canadian (Duceppe 2017) estimates. The NT-proBNP below 300 pg/mL moderates this.

## Symptom assessment
- Exertional central heaviness relieved by rest within 5 minutes is **typical of stable angina** in a man with diabetes, hypertension, dyslipidaemia and a family history of premature CAD. Pre-test probability is moderate to high.
- **Anaemia (Hb 9.8)** can provoke demand ischaemia and breathlessness. It may be contributing, and correcting it is part of the plan.
- 1 mm horizontal ST depression in V5–V6 with **LVH** may be a strain pattern, or may reflect ischaemia. There is no prior ECG to compare.
- **These symptoms need evaluation whether or not he has surgery.** The guidelines advise against testing only to "clear" asymptomatic patients, but this patient is symptomatic.

## Recommended evaluation before surgery
- **Pharmacological stress imaging (dobutamine stress echo)** within 3–5 days. His exercise capacity is limited by the knee, so a treadmill test would be non-diagnostic. Stress echo avoids contrast and radiation and assesses LVH.
- *Alternative:* CT coronary angiography, if a slot is sooner. eGFR 68 is acceptable. Heart-rate control may be needed.
- **What changes the plan:** high-risk ischaemia (large territory, low threshold, or a drop in LV function) → invasive angiography, and weigh revascularisation against the cancer surgery with the MDT. Revascularisation before non-cardiac surgery follows the same indications as outside surgery (for example left main or high-risk multivessel disease). If a stent is needed, its antiplatelet duration must be weighed against the cancer-surgery timing. No or mild ischaemia → proceed on 19 Aug.

## Peri-operative medication plan
| Drug | Before surgery | Day of surgery | After surgery | Rationale |
|---|---|---|---|---|
| Atorvastatin | **Increase to 40 mg now** (80 mg if CAD is confirmed) | Continue | Continue | Plaque stabilisation; LDL above target |
| Telmisartan | Continue | **Hold 24 h before** | Restart when euvolaemic and BP stable | Reduces intra-operative hypotension |
| Beta-blocker | **Do not start** de novo now | — | Consider only if ischaemia is confirmed, titrated slowly | POISE: harm when started close to surgery |
| Aspirin | Do not start unless CAD is confirmed | — | Per stress-test result | POISE-2: no benefit, more bleeding in primary prevention |
| Empagliflozin | **Hold ≥3 days before (by 16 Aug)** | Hold | Restart when eating and drinking normally | Euglycaemic DKA risk |
| Metformin | Continue | Hold | Restart when eating, creatinine stable | Lactic acidosis risk if AKI |
| Insulin glargine | Continue | **~80% of usual dose the night before** | Basal-bolus with correction | Avoid hypoglycaemia while fasting |
| VTE prophylaxis | — | Mechanical | Enoxaparin 40 mg daily, extended to 28 days | Abdominal cancer surgery |

## Post-operative surveillance
- **hs-troponin at 24 h and 48 h** after surgery (baseline done) to detect myocardial injury after non-cardiac surgery (MINS), per ESC 2022 for RCRI ≥1.
- ECG on POD 1, and with any chest pain, hypotension or arrhythmia.
- Troponin rise >5 ng/L above baseline, or above the upper limit: cardiology review, start aspirin and statin if not contraindicated, and plan outpatient ischaemia evaluation.
- Keep Hb ≥8–9 g/dL. Use a lower threshold for transfusion if ischaemia is confirmed.

## Long-term cardiovascular prevention
- LDL target **<55 mg/dL** if CAD is confirmed (<70 otherwise); add ezetimibe if not at target on a high-intensity statin.
- BP <130/80. Continue the ARB (also helps albuminuria). Continue the SGLT2 inhibitor for cardio-renal protection.
- Cardiology review 6–8 weeks after surgery, and before starting oxaliplatin-based chemotherapy if angina recurs.
- Plan cardiac assessment before the future knee replacement using the stress-test result.

## Note to surgical & anaesthesia teams
Mr. Varghese (RCRI 2) has new exertional chest heaviness with lateral ST depression. We are arranging a dobutamine stress echo this week. If there is no high-risk ischaemia, he may proceed on 19 Aug. Atorvastatin increased to 40 mg. Hold telmisartan 24 h and empagliflozin 3 days before surgery; do not start a beta-blocker. Please send hs-troponin at 24 h and 48 h post-op and an ECG on POD 1, and call Cardiology for a rise or symptoms.
`,
};

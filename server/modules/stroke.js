export default {
  id: "stroke",
  order: 50,
  patientId: "syn-000527",
  title: "Stroke Code & Neuro Planning",
  specialty: "Neurology / Neurointervention / Neurosurgery",
  stage: "inpatient",
  date: "2026-09-21",
  summary:
    "Runs alongside a stroke code: eligibility for thrombolysis and thrombectomy against the clock, blood-pressure targets before and after the procedure, the neurosurgical contingency, secondary prevention, and a family briefing.",
  claudeRole: "Checks every eligibility criterion and contraindication against the chart, tracks time targets and drafts the plan. The stroke team decides and consents.",
  inputLabel: "Stroke code data",
  inputHint: "Times, NIHSS, imaging and labs as the code unfolds. Claude checks them against the chart, including anticoagulant use and prior function.",
  outputLabel: "Draft stroke plan",
  system: `Task: acute stroke code decision support (AHA/ASA 2019 acute ischaemic stroke guideline and later updates, ESO guidelines).

Time is brain: lead with the decisions and the clock. Check every contraindication against the record. Produce in order:
1. "## Decision now": thrombolysis yes/no and why; thrombectomy yes/no and why; one line each.
2. "## Clock": a table of milestone | time | interval | target.
3. "## Eligibility check": a table of criterion | patient | met? for IV thrombolysis and for thrombectomy.
4. "## Next 60 minutes": numbered actions (team activation, BP, glucose, anaesthesia approach, consent, lab), with targets.
5. "## After the procedure (first 24 h)": BP targets after reperfusion, neuro observations, imaging, antithrombotics, swallow screen, glucose and temperature.
6. "## Neurosurgical contingency": malignant MCA oedema and haemorrhagic transformation triggers, with the decompressive hemicraniectomy discussion for this patient's age.
7. "## Medicine safety & secondary prevention": including anticoagulant review (dose appropriateness) and when to restart.
8. "## Family briefing": plain English, under 150 words.`,
  buildPrompt: (input) => `Stroke code:\n\n${input}`,
  defaultInput: `Stroke code, 21 Sep 2026. Leela Menon, 71, 62 kg.
Last known well: 09:40 (daughter spoke to her, normal). Found at 10:05 unable to speak, right arm weak. Arrived ED 10:35 by ambulance (pre-alert).
10:40 NIHSS 14: global aphasia, right facial weakness, right arm 3, right leg 2, right-sided neglect absent, gaze preference to left.
BP 186/104, HR 96 irregular (AF), SpO2 96% on air, capillary glucose 162 mg/dL, temp 36.8.
10:52 Non-contrast CT: no haemorrhage, ASPECTS 8 (loss of insular ribbon, early change in M5).
10:58 CT angiography: left M1 (proximal MCA) occlusion; good collaterals. CT perfusion: core 18 mL, penumbra 96 mL.
Labs: platelets 210, INR 1.1, creatinine 0.9. Anti-Xa (apixaban-calibrated) level: not available in this lab.
Medicines: apixaban 2.5 mg twice daily (last dose 08:00 today, confirmed by daughter), amlodipine 5 mg, metoprolol succinate 25 mg, rosuvastatin 10 mg.
Pre-stroke function: independent, modified Rankin 0.
Neuro-interventional team on site; angiography suite free. Now 11:05.`,
  demoOutput: `## Decision now
- **IV thrombolysis: NO.** Apixaban taken at 08:00 today (<48 h) and no drug-specific anti-Xa level is available. A normal INR does not exclude apixaban effect.
- **Mechanical thrombectomy: YES, go now.** Left M1 occlusion, NIHSS 14, ASPECTS 8, small core (18 mL) with large penumbra, pre-stroke mRS 0, within 6 hours of last known well. Anticoagulation is **not** a contraindication to thrombectomy.

## Clock
| Milestone | Time | Interval | Target |
|---|---|---|---|
| Last known well | 09:40 | — | — |
| Door (ED arrival) | 10:35 | LKW + 55 min | — |
| NIHSS | 10:40 | Door + 5 min | ≤10 min ✅ |
| CT | 10:52 | Door + 17 min | ≤20 min ✅ |
| CTA / CTP | 10:58 | Door + 23 min | — |
| Decision | 11:05 | Door + 30 min | — |
| **Groin puncture** | target **≤12:05** | Door-to-groin | **≤90 min** |
| Reperfusion | target ≤12:35 | — | As early as possible |

## Eligibility check
**IV thrombolysis (alteplase/tenecteplase)**
| Criterion | Patient | Met? |
|---|---|---|
| Within 4.5 h of LKW | 1 h 25 min | ✅ |
| No haemorrhage on CT | None | ✅ |
| BP ≤185/110 (or treatable) | 186/104 | ⚠️ Treatable |
| Glucose >50 mg/dL | 162 | ✅ |
| Platelets ≥100, INR ≤1.7 | 210, 1.1 | ✅ |
| **No DOAC within 48 h** (unless drug-specific level normal) | **Apixaban 08:00 today; no anti-Xa assay** | ❌ **Contraindicated** |

**Mechanical thrombectomy**
| Criterion | Patient | Met? |
|---|---|---|
| Occlusion of ICA or M1 | Left M1 | ✅ |
| NIHSS ≥6 | 14 | ✅ |
| ASPECTS ≥6 | 8 | ✅ |
| Groin puncture within 6 h of LKW | Expected ~2 h 25 min | ✅ |
| Pre-stroke mRS 0–1 | 0 | ✅ |
| Age ≥18 | 71 | ✅ |

## Next 60 minutes
1. **Activate the neuro-interventional team; move to the angiography suite now.** Do not wait for further imaging or labs.
2. **BP:** keep ≤185/110 before and during the procedure. Labetalol 10 mg IV, repeat once if needed. Avoid hypotension (no systolic <140 before reperfusion).
3. **Anaesthesia:** conscious sedation or GA per the anaesthetist; avoid delay and hypotension either way. Aphasia may limit cooperation, so be ready to convert.
4. **Consent:** she lacks capacity (global aphasia). Explain to her daughter; proceed in her best interests as emergency treatment, and document it.
5. **Glucose:** 162, acceptable; keep 140–180 mg/dL.
6. **Other:** nil by mouth until swallow screen; head of bed flat or 30° per protocol; ECG; send troponin; keep SpO2 >94%.
7. **Do not** give heparin or antiplatelets in the ED.

## After the procedure (first 24 h)
- **BP after successful reperfusion (TICI 2b–3):** keep **≤180/105** and **avoid intensive lowering to <140 systolic**, which worsened outcomes in trials (ENCHANTED2/MT, OPTIMAL-BP). If reperfusion failed: ≤180/105.
- **Neuro observations and NIHSS:** every 15 min for 2 h, every 30 min for 6 h, then hourly to 24 h. **Urgent CT for any drop of ≥4 NIHSS points** or a falling conscious level.
- **Imaging at 24 h** (CT or MRI) before any antithrombotic: infarct size and haemorrhagic transformation.
- **Antithrombotics:** none for 24 h unless a stent is placed (per the neurointerventionalist).
- **Swallow screen** before any oral intake, food or medicine (aspiration risk with aphasia and facial weakness).
- **Glucose** 140–180 mg/dL; **temperature** treat >37.5 °C; VTE prophylaxis with intermittent pneumatic compression.
- **Cardiac monitoring** for AF rate control; metoprolol via NG if the swallow screen fails.

## Neurosurgical contingency
- **Malignant MCA oedema risk:** full M1 territory at risk. Watch days 1–5 for a falling GCS, a new pupil change, or midline shift on repeat CT.
- **Decompressive hemicraniectomy:** at age 71, trials over 60 (DESTINY II) show lower mortality **but survivors often live with moderate to severe disability**. **Discuss early with the daughter** what outcome her mother would find acceptable, so a decision is ready if needed. Neurosurgery to be informed today.
- **Symptomatic haemorrhagic transformation:** urgent CT, stop antithrombotics, and neurosurgical review for mass effect.

## Medicine safety & secondary prevention
- **Apixaban was under-dosed.** 2.5 mg twice daily is only indicated with **≥2 of**: age ≥80, weight ≤60 kg, creatinine ≥1.5 mg/dL. She has **none** (71, 62 kg, creatinine 0.9), so the **correct dose is 5 mg twice daily**. This may have contributed to the stroke. Report as a medication-safety event and review the original prescription.
- **Restart anticoagulation:** timing by infarct size on 24-h imaging (ELAN trial): **within 48 h** for minor or moderate infarcts; **day 6–7** for major infarcts; later if there is haemorrhagic transformation. Restart **apixaban 5 mg twice daily**.
- **Statin:** increase rosuvastatin to 20 mg (target LDL <70 mg/dL).
- **BP long term:** <130/80 once stable.
- **Rehabilitation:** speech and language therapy, physiotherapy and occupational therapy from day 1–2.

## Family briefing
Your mother has had a stroke. A blood clot has blocked a main artery on the left side of her brain, which controls speech and the right side of the body. Because she takes a blood thinner, the clot-dissolving injection is not safe for her. The best treatment is a procedure to remove the clot through a thin tube passed from the groin to the brain, which we want to start within the hour. It carries risks, including bleeding in the brain, but gives her the best chance of recovering speech and movement. We will update you as soon as it is done. We would also like to understand what matters most to her, in case difficult decisions are needed in the coming days.
`,
};

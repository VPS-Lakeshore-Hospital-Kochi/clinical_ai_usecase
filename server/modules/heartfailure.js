export default {
  id: "heartfailure",
  order: 30,
  patientId: "syn-000342",
  title: "Heart Failure Co-pilot",
  specialty: "Cardiology / Heart Failure Clinic",
  stage: "specialty",
  date: "2026-09-26",
  summary:
    "Reviews a patient soon after a heart-failure admission: congestion status, gaps in the four medicine groups that improve survival, a safe order of changes with blood checks, iron, device eligibility and self-care in plain language.",
  claudeRole: "Finds treatment gaps and drafts the titration plan, safety checks and patient advice. The heart-failure cardiologist decides.",
  inputLabel: "Heart-failure clinic visit",
  inputHint: "Clinic findings a week after discharge, with home weights. Claude checks each medicine against current guideline targets and the patient's kidney function and potassium.",
  outputLabel: "Draft HF optimisation plan",
  system: `Task: heart-failure clinic decision support for heart failure with reduced ejection fraction (ESC 2021 guideline with 2023 update; AHA/ACC/HFSA 2022).

Produce in order:
1. "## Status today": congestion (wet/dry), perfusion, NYHA class, and early-readmission risk, with the evidence for each.
2. "## Guideline medicine gaps": a table of pillar (ARNI/ACEi/ARB, beta-blocker, MRA, SGLT2 inhibitor) | current | target dose | gap | barrier.
3. "## Titration plan": a dated, step-by-step sequence (what changes today, at 1–2 weeks, and at 4–6 weeks), with the safety check before each step (BP, heart rate, potassium, creatinine). Include the ACE-inhibitor washout if switching to an ARNI.
4. "## Congestion plan": diuretic adjustment, a target dry weight and when to step down.
5. "## Other evidence-based actions": iron deficiency, device therapy (ICD / CRT) eligibility and timing, vaccines, diabetes medicines, and anything to stop.
6. "## Monitoring": a table of when | check | action threshold.
7. "## Advice for the patient": plain English, under 150 words, including daily weights, salt and fluid advice in a Kerala diet, and when to call.`,
  buildPrompt: (input) => `Clinic visit:\n\n${input}`,
  defaultInput: `Heart-failure clinic, 26 Sep 2026. Seven days after discharge (admitted 14–19 Sep with acute decompensated heart failure).
Symptoms: breathless walking to the gate (NYHA III), two pillows, mild ankle swelling since 23 Sep. No chest pain, syncope or palpitations.
Home weights (morning): 19 Sep 68.0 kg · 21 Sep 68.3 · 23 Sep 68.9 · 25 Sep 69.3 · 26 Sep 69.5 (discharge dry weight 68.0).
Exam: BP 108/68, HR 92 regular, JVP 4 cm above the sternal angle, fine basal crackles, pitting oedema to mid-shin. Warm peripheries.
ECG: sinus rhythm 92/min, LBBB, QRS 156 ms.
Echo (15 Sep): LVEF 30%, LV end-diastolic diameter 64 mm, moderate functional mitral regurgitation, RVSP 42 mmHg.
Labs today: Na 136, K 4.8, creatinine 1.4 (eGFR 55), Hb 11.8, ferritin 62, TSAT 14%, HbA1c 7.4%. NT-proBNP 3,400 at discharge.
Current medicines: furosemide 40 mg twice daily, metoprolol succinate 25 mg daily, ramipril 2.5 mg daily, aspirin 75 mg, atorvastatin 80 mg, metformin 500 mg twice daily.
Not on: MRA ("potassium borderline" at discharge), SGLT2 inhibitor, ARNI.
Diet: rice-based, pickles and dried fish most days; drinks about 2.5 L of fluid a day.
Cost: pensioner; asks about generic medicines.`,
  demoOutput: `## Status today
- **Congestion: wet and warm.** Weight up 1.5 kg above the discharge dry weight in 7 days, raised JVP, basal crackles, oedema to mid-shin. Peripheries warm, BP 108/68: perfusion adequate.
- **NYHA class III.**
- **Early-readmission risk: high.** Within 30 days of an admission, rising weight, NT-proBNP 3,400 at discharge, eGFR 55, and under-treated on guideline medicines.

## Guideline medicine gaps
| Pillar | Current | Target | Gap | Barrier |
|---|---|---|---|---|
| ARNI / ACEi / ARB | Ramipril 2.5 mg daily | Sacubitril/valsartan 97/103 mg twice daily (preferred) or ramipril 5 mg twice daily | **Large**: low-dose ACEi; ARNI preferred | BP 108 systolic (acceptable for starting ARNI at the lowest dose) |
| Beta-blocker | Metoprolol succinate 25 mg | 200 mg daily | **Large** (12.5% of target); HR 92 | Titrate once congestion improves |
| MRA | None | Spironolactone 25–50 mg | **Missing** | K 4.8 (start allowed if K ≤5.0 and eGFR >30, with close monitoring) |
| SGLT2 inhibitor | None | Dapagliflozin or empagliflozin 10 mg | **Missing** | None (eGFR 55; also helps diabetes and kidneys) |

## Titration plan
**Today (26 Sep)**
1. **Start dapagliflozin 10 mg** (generic available). It works within weeks, adds a mild diuretic effect, and lowers the risk of high potassium from the next steps.
2. **Stop ramipril today.** Start **sacubitril/valsartan 24/26 mg twice daily on 28 Sep**, at least **36 hours after the last ramipril dose** (angioedema risk).
3. Keep metoprolol succinate at 25 mg while congested.

**At 1–2 weeks (≈ 6–9 Oct)**, after checking BP, HR, K and creatinine:
4. If K ≤5.0 and creatinine rise is <30%: **start spironolactone 12.5 mg daily**.
5. If euvolaemic and HR >70: **metoprolol succinate 25 → 50 mg**.
6. If systolic BP ≥100 and no symptomatic low BP: **sacubitril/valsartan 49/51 mg twice daily**.

**At 4–6 weeks (≈ late Oct–early Nov)**
7. Continue stepwise uptitration: metoprolol by doubling every 2 weeks as HR and BP allow; sacubitril/valsartan to 97/103 mg; spironolactone to 25 mg if K ≤5.0.
8. Aim to reach maximum tolerated doses of all four groups within ~6–8 weeks of discharge (STRONG-HF approach).

## Congestion plan
- **Furosemide 40 mg twice daily → 80 mg morning + 40 mg afternoon for 3 days**, then return to 40 mg twice daily once weight is back to ~68 kg.
- **Target dry weight: 68 kg.** Once at dry weight and on an SGLT2 inhibitor, try stepping down to 40 mg once daily, guided by weight.
- **Fluid limit ~1.5 L/day** while congested (currently 2.5 L).
- Recheck creatinine and K in 3–5 days because of the diuretic increase plus the new medicines.

## Other evidence-based actions
- **Iron deficiency** (ferritin 62 <100; TSAT 14%): **IV ferric carboxymaltose.** For Hb 10–14 g/dL and weight <70 kg the total iron need is **1,000 mg, given now**. Recheck iron at 12 weeks and give 500 mg if still deficient. This improves symptoms and exercise capacity and reduces HF admissions.
- **Device therapy:** LVEF 30%, **LBBB with QRS 156 ms**, NYHA III → a **strong candidate for CRT-D**. Reassess with repeat echo after **≥3 months of optimised medicines** (≈ late Dec 2026). Refer to electrophysiology now so the pathway is not delayed.
- **Moderate functional MR:** reassess after medicines and CRT; consider transcatheter repair only if severe MR persists.
- **Diabetes:** continue metformin (eGFR 55). The SGLT2 inhibitor lowers HbA1c modestly. Avoid pioglitazone (fluid retention) and saxagliptin.
- **Vaccines:** influenza this season, and pneumococcal if not given.
- **Avoid:** NSAIDs, non-dihydropyridine calcium-channel blockers, and high-salt "digestive" or ayurvedic preparations containing sodium.
- **Cardiac rehabilitation:** refer once euvolaemic.

## Monitoring
| When | Check | Action threshold |
|---|---|---|
| Daily (home) | Morning weight | **+1 kg in 2 days or +2 kg in a week** → call the HF nurse |
| 29 Sep–1 Oct | K, creatinine, BP | K >5.5 or creatinine rise >50% → hold new drugs, call |
| 1–2 weeks | BP, HR, K, creatinine, symptoms | Guides the next titration step |
| 12 weeks | Ferritin, TSAT, Hb | Still iron deficient → ferric carboxymaltose 500 mg |
| 3 months | Echo, ECG | LVEF ≤35% and QRS ≥150 ms LBBB → CRT-D |

## Advice for the patient
Mr. Rajan, your heart is holding on to extra fluid again, which is why you are more breathless and your ankles are swollen. We are changing your medicines step by step. Each one helps your heart get stronger over time, so please do not stop any of them without asking us.
- **Weigh yourself every morning**, after using the toilet and before breakfast. If your weight goes up by 1 kg in 2 days, call us.
- **Salt:** stop pickles, dried fish and pappadam for now, and use half the usual salt in curries.
- **Fluids:** about 1.5 litres a day in total, including tea, soup and kanji.
- **Call immediately** if you are breathless lying flat, faint, have chest pain, or your weight rises by 2 kg in a week.
`,
};

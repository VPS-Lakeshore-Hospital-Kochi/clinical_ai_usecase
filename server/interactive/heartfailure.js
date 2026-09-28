import { obj, str, list, oneOf } from "./schema.js";

const CHECKS = ["sglt2", "arni", "mra", "bb", "none"];

// Clinician view: HFrEF clinic after discharge. The app works out the four-pillar gaps, the
// safety check before each titration step, the ACE-inhibitor washout, iron deficiency and the
// ferric carboxymaltose dose, CRT eligibility and the weight alarm; Claude drafts the plan.
export default {
  instructions: `Draft the heart-failure clinic plan, as JSON (ESC 2021 with 2023 update; AHA/ACC/HFSA 2022). The app has worked out the guideline-medicine gaps, the safety check for each step, the ACE-inhibitor washout time, iron deficiency and the IV iron dose, CRT eligibility and the weight trend (listed); build on them and do not contradict them.
- status: congestion, perfusion, NYHA class and early-readmission risk, each with evidence.
- steps: dated titration steps (today, 1–2 weeks, 4–6 weeks), each naming the app safety check it depends on (sglt2, arni, mra, bb or none) and the start date/time as "D Mon HH:MM" where relevant (for the ARNI start, respect the 36-hour washout).
- congestion: diuretic plan, target dry weight, fluid limit and when to step down.
- other: iron, device therapy, mitral regurgitation, diabetes medicines, vaccines, things to avoid, rehab.
- monitoring: when | check | action threshold.
- advice: plain English for the patient, under 150 words, with daily weights and Kerala-diet salt and fluid advice.`,
  schema: obj({
    status: list(obj({ label: str(), finding: str() })),
    steps: list(obj({ when: oneOf(["Today", "1–2 weeks", "4–6 weeks"]), action: str(), check: oneOf(CHECKS), start: str() })),
    congestion: list(str()),
    other: list(str()),
    monitoring: list(obj({ when: str(), check: str(), threshold: str() })),
    advice: str(),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.clinic || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    status: [
      { label: "Congestion: wet and warm", finding: "Weight 1.5 kg above the 68.0 kg dry weight in 7 days, JVP 4 cm, basal crackles, oedema to mid-shin; warm peripheries, BP 108/68" },
      { label: "NYHA class III", finding: "Breathless walking to the gate; two pillows" },
      { label: "Early-readmission risk: high", finding: "Within 30 days of an admission, rising weight, NT-proBNP 3,400 at discharge, eGFR 55, under-treated on guideline medicines" },
    ],
    steps: [
      { when: "Today", action: "Start dapagliflozin 10 mg daily (generic available)", check: "sglt2", start: "26 Sep 10:00" },
      { when: "Today", action: "Stop ramipril (last dose 26 Sep 08:00)", check: "none", start: "26 Sep 08:00" },
      { when: "Today", action: "Start sacubitril/valsartan 24/26 mg twice daily after the 36-hour washout", check: "arni", start: "28 Sep 08:00" },
      { when: "Today", action: "Keep metoprolol succinate at 25 mg while congested", check: "none", start: "" },
      { when: "1–2 weeks", action: "Start spironolactone 12.5 mg daily if K ≤5.0 and creatinine rise <30%", check: "mra", start: "" },
      { when: "1–2 weeks", action: "Metoprolol succinate 25 → 50 mg if euvolaemic and HR >70", check: "bb", start: "" },
      { when: "1–2 weeks", action: "Sacubitril/valsartan 49/51 mg twice daily if systolic BP ≥100", check: "arni", start: "" },
      { when: "4–6 weeks", action: "Continue uptitration to maximum tolerated doses of all four groups (STRONG-HF approach)", check: "none", start: "" },
    ],
    congestion: [
      "Furosemide 40 mg twice daily → 80 mg morning + 40 mg afternoon for 3 days, then back to 40 mg twice daily once weight is about 68 kg.",
      "Target dry weight 68 kg; once there and on an SGLT2 inhibitor, try 40 mg once daily, guided by weight.",
      "Fluid limit about 1.5 L a day while congested (currently 2.5 L).",
      "Recheck creatinine and K in 3–5 days because of the diuretic increase and the new medicines.",
    ],
    other: [
      "Iron deficiency (ferritin 62, TSAT 14%): IV ferric carboxymaltose 1,000 mg now; recheck at 12 weeks and give 500 mg if still deficient.",
      "LVEF 30% with LBBB and QRS 156 ms: strong candidate for CRT-D. Refer to electrophysiology now; reassess after ≥3 months of optimised medicines (about late Dec 2026).",
      "Moderate functional MR: reassess after medicines and CRT.",
      "Diabetes: continue metformin (eGFR 55); avoid pioglitazone and saxagliptin.",
      "Vaccines: influenza this season, pneumococcal if not given.",
      "Avoid NSAIDs, non-dihydropyridine calcium-channel blockers and high-sodium digestive or ayurvedic preparations.",
      "Refer to cardiac rehabilitation once euvolaemic.",
    ],
    monitoring: [
      { when: "Daily (home)", check: "Morning weight", threshold: "+1 kg in 2 days or +2 kg in a week → call the HF nurse" },
      { when: "29 Sep–1 Oct", check: "K, creatinine, BP", threshold: "K >5.5 or creatinine rise >50% → hold new drugs and call" },
      { when: "1–2 weeks", check: "BP, HR, K, creatinine, symptoms", threshold: "Guides the next titration step" },
      { when: "12 weeks", check: "Ferritin, TSAT, Hb", threshold: "Still iron deficient → ferric carboxymaltose 500 mg" },
      { when: "3 months", check: "Echo, ECG", threshold: "LVEF ≤35% with LBBB QRS ≥150 ms → CRT-D" },
    ],
    advice: "Mr Rajan, your heart is holding on to extra fluid again, which is why you are more breathless and your ankles are swollen. We are changing your medicines step by step; each one helps your heart get stronger, so please do not stop any of them without asking us. Weigh yourself every morning, after the toilet and before breakfast. If your weight goes up by 1 kg in 2 days, call us. Stop pickles, dried fish and pappadam for now, and use half the usual salt in curries. Drink about 1.5 litres a day in total, including tea, soup and kanji. Call immediately if you are breathless lying flat, faint, have chest pain, or your weight rises by 2 kg in a week.",
  },
};

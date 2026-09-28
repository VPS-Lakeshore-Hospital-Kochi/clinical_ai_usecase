import { obj, str, int, list, oneOf, bool } from "./schema.js";

// Clinician view: CGM review. The app checks the consensus targets, the GMI–HbA1c gap and the
// hypoglycaemia regimen rule; Claude explains the patterns and drafts the regimen change.
export default {
  instructions: `Review this 14-day CGM report for the endocrinologist, as JSON. The app has checked the consensus targets, the GMI–HbA1c gap and the hypoglycaemia rule (listed); build on them and do not contradict their numbers.
- patterns: 3–4 daily glucose patterns, each with the hour window (0–23, fromHour to toHour inclusive) on the hourly profile, the likely driver and the evidence.
- changes: one row per medicine (current regimen plus anything to add), with the kind of change, the suggested regimen and the rationale. Include peri-operative holding advice where relevant.
- hba1cNote: one sentence on what the GMI–HbA1c gap means for monitoring.
- preop: whether glycaemia is acceptable for elective joint replacement now, the target and a realistic timeline.
- otherFindings: anything in the record outside diabetes that must not be missed, with priority and action.
- coaching: 6–8 plain-English bullets for the patient, specific to Kerala meals, tea and walking with knee pain.`,
  schema: obj({
    patterns: list(obj({ title: str(), fromHour: int(), toHour: int(), driver: str(), evidence: str() })),
    changes: list(obj({ drug: str(), kind: oneOf(["Stop", "Reduce", "Add", "Continue", "Consider"]), current: str(), suggested: str(), rationale: str() })),
    hba1cNote: str(),
    preop: obj({ ready: bool(), target: str(), timeline: str() }),
    otherFindings: list(obj({ priority: oneOf(["Act now", "This month", "Routine"]), finding: str(), action: str() })),
    coaching: list(str()),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.report || ""}\n\nHourly median glucose (mg/dL, IQR):\n${payload.profile || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    patterns: [
      { title: "Night-time lows", fromHour: 2, toHour: 4, driver: "Glimepiride plus glargine 16 U, after a small late dinner", evidence: "Median falls from 252 at 21:00 to 96 at 03:00; lower quartile 62 at 03:00; lows on 9 of 14 nights, lowest 48" },
      { title: "Breakfast rise", fromHour: 6, toHour: 9, driver: "Banana and sweet tea at breakfast; rebound after overnight lows", evidence: "132 at 05:00 to 238 at 09:00" },
      { title: "Post-lunch spike", fromHour: 13, toHour: 15, driver: "Rice-heavy lunch with no mealtime cover", evidence: "Peak median 262 at 14:00; upper quartile 310" },
      { title: "Post-dinner spike", fromHour: 20, toHour: 21, driver: "Rice dinner around 20:30; then falls steeply overnight", evidence: "252 at 21:00, 214 at 22:00" },
    ],
    changes: [
      { drug: "Glimepiride", kind: "Stop", current: "2 mg once daily", suggested: "Stop", rationale: "Main driver of the overnight lows; also a sulfonylurea in a patient with a sulfonamide allergy" },
      { drug: "Insulin glargine", kind: "Reduce", current: "16 U at bedtime", suggested: "13 U at bedtime, then +2 U every 3 days to fasting 100–130 mg/dL without lows", rationale: "Lows 02:00–04:30; 20% reduction per the hypoglycaemia rule while glimepiride washes out" },
      { drug: "Metformin", kind: "Continue", current: "1000 mg twice daily", suggested: "Continue", rationale: "eGFR 68; hold on the day of surgery or contrast" },
      { drug: "Empagliflozin", kind: "Add", current: "—", suggested: "10 mg once daily in the morning; hold at least 3 days before surgery", rationale: "Albuminuria (UACR 42) and cardiovascular benefit; low hypoglycaemia risk" },
      { drug: "Rapid-acting insulin", kind: "Consider", current: "—", suggested: "4 U before lunch if post-lunch readings stay above 220 after 2 weeks", rationale: "Targets the largest excursion" },
      { drug: "Atorvastatin", kind: "Consider", current: "20 mg at bedtime", suggested: "40 mg at bedtime", rationale: "LDL 112 mg/dL, above the <70 target for his risk" },
    ],
    hba1cNote: "Lab HbA1c (9.1%) runs 1.1 points above GMI (8.0%); iron-deficiency anaemia can falsely raise HbA1c, so titrate on CGM metrics until iron is replaced.",
    preop: { ready: false, target: "HbA1c <8% and glucose <180 mg/dL around surgery", timeline: "Expect time in range above 60% within 4–6 weeks; recheck HbA1c or fructosamine at 8–10 weeks" },
    otherFindings: [
      { priority: "Act now", finding: "Iron-deficiency anaemia (Hb 10.2, MCV 74, ferritin 11) with about 4 kg weight loss and altered bowel habit at 58", action: "Refer for colonoscopy ± upper endoscopy to exclude malignancy before any elective surgery" },
      { priority: "This month", finding: "BP 146/88 with albuminuria", action: "Titrate telmisartan to 80 mg; recheck UACR in 3 months" },
    ],
    coaching: [
      "Your night-time low sugars are the most urgent problem. We are stopping one tablet (glimepiride) and lowering your night insulin to 13 units.",
      "If you wake sweaty or shaky, check your sugar. If it is under 70, take 3 teaspoons of sugar in water, check again after 15 minutes, and tell us.",
      "Rice: one cup (the size of your fist) at lunch and dinner. Fill the rest of the plate with thoran, avial or sambar vegetables and fish or dal.",
      "Breakfast: 2 pieces of puttu or 2 appam with kadala curry or egg, instead of banana and sweet tea.",
      "Tea: no sugar, or a sweetener. Three sweet teas add about 30 g of sugar a day.",
      "Walk for 10 minutes after lunch and dinner, or do seated leg exercises if your knee hurts. This lowers the spikes the sensor showed.",
      "Take the new tablet (empagliflozin) in the morning and drink enough water. We will tell you when to stop it before any operation.",
    ],
  },
};

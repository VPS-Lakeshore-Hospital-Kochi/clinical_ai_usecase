import { patient } from "../patient.js";

const c = patient.cgm;
const profileTable = c.profile
  .map((p) => `${String(p.hour).padStart(2, "0")}:00  median ${p.median}  IQR ${p.p25}-${p.p75}`)
  .join("\n");

export default {
  id: "diabetes",
  order: 2,
  title: "Diabetes Co-pilot",
  specialty: "Endocrinology",
  stage: "specialty",
  date: "2026-07-20",
  widgets: ["cgm"],
  summary:
    "Reads 14 days of CGM data, labs and medications. Explains the glucose patterns, drafts a regimen change for the doctor to approve, and writes a coaching plan that fits Kerala meals.",
  claudeRole: "Finds glucose patterns, drafts the regimen change and writes the coaching plan. The endocrinologist decides.",
  inputLabel: "CGM report & clinical question",
  inputHint: "The CGM summary comes from the device export. Edit the clinical question to steer the analysis.",
  outputLabel: "Draft glycaemic review",
  system: `Task: diabetes decision support for an endocrinologist reviewing continuous glucose monitoring (CGM) data.

Use the international consensus CGM targets (time in range 70–180 mg/dL >70%, below 70 <4%, below 54 <1%, CV ≤36%) and ADA Standards of Care / RSSDI guidance. Produce in order:
1. "## Safety first": hypoglycaemia risk and any contraindications (renal function, allergies, upcoming surgery).
2. "## CGM interpretation": a table of metric | value | target | status, then the 2–4 key daily patterns with the likely driver of each.
3. "## Suggested regimen changes (for clinician approval)": a table of drug | current | suggested | rationale. Include peri-operative holding advice if surgery is likely.
4. "## Pre-operative glycaemic readiness": whether HbA1c and glucose are acceptable for elective joint surgery, the target, and the realistic timeline.
5. "## Other findings needing action": anything in the record outside diabetes that should not be missed.
6. "## Coaching plan for the patient": practical, culturally specific advice (Kerala meals, tea, walking with knee pain), in plain English, 6–8 bullets.`,
  buildPrompt: (input) =>
    `${input}\n\nHourly glucose profile (mg/dL) over 14 days:\n${profileTable}`,
  defaultInput: `CGM report, ${c.period} (${c.device})
Sensor wear: ${c.wearPercent}% | Mean glucose: ${c.meanGlucose} mg/dL | GMI: ${c.gmi}% | CV: ${c.cv}%
Time very low (<54): ${c.ranges.veryLow}% | Low (54–69): ${c.ranges.low}% | In range (70–180): ${c.ranges.inRange}% | High (181–250): ${c.ranges.high}% | Very high (>250): ${c.ranges.veryHigh}%
Events: ${c.events}

Labs back since the 6 July visit: Hb 10.2 g/dL, MCV 74, ferritin 11, eGFR 68, UACR 42 mg/g, LDL 112.
Aceclofenac stopped on 6 July. Orthopaedics review for probable right knee replacement is booked for 22 July.

Clinical question: How should I change his regimen to stop the night-time lows and bring HbA1c down before possible knee surgery? What else should I act on?`,
  demoOutput: `## Safety first
- **Hypoglycaemia is the priority.** 7% of time below 70 mg/dL (target <4%) and 2% below 54 (target <1%), on 9 of 14 nights, nadir 48 mg/dL. Most likely cause: **glimepiride + glargine** with a low-carbohydrate late night.
- eGFR 68 with UACR 42 mg/g (moderately increased albuminuria; confirm on repeat). Metformin can continue at the current dose.
- **Sulfonamide allergy (rash).** Glimepiride is a sulfonylurea. Clinically relevant cross-reactivity is unlikely, but it is one more reason to stop it.
- Elective surgery is likely. Plan SGLT2 inhibitor holding now (see below).

## CGM interpretation
| Metric | Value | Target | Status |
|---|---|---|---|
| Time in range 70–180 | 41% | >70% | ❌ Well below |
| Time below 70 | 7% | <4% | ❌ Unsafe |
| Time below 54 | 2% | <1% | ❌ Unsafe |
| Time above 250 | 18% | <5% | ❌ High |
| CV | 38% | ≤36% | ⚠️ Unstable |
| GMI | 8.0% | <7% | ⚠️ (lab HbA1c 9.1%, see note) |

**Key patterns**
1. **Nocturnal lows 02:00–04:30.** The overnight fall from ~21:00 peaks suggests too much basal insulin relative to need, on top of sulfonylurea action.
2. **Post-lunch spike to ~260 mg/dL (13:00–15:00).** Rice-heavy lunch, no prandial cover.
3. **Post-dinner spike ~250 mg/dL (20:00–22:00)**, followed by the overnight fall, which may be amplified by the juice rebound pattern.
4. **Dawn rise from 05:00** is modest. Fasting values are driven more by rebound than by true basal deficiency.

> GMI (8.0%) is lower than lab HbA1c (9.1%). **Iron-deficiency anaemia can falsely raise HbA1c**, which may explain part of the gap. Rely on CGM metrics for titration until iron is replaced.

## Suggested regimen changes (for clinician approval)
| Drug | Current | Suggested | Rationale |
|---|---|---|---|
| Glimepiride | 2 mg OD | **Stop** | Main driver of hypoglycaemia risk; CGM shows lows despite hyperglycaemia |
| Insulin glargine | 16 U HS | **Reduce to 12 U**, titrate by 2 U every 3 days to fasting 100–130 without lows | Nocturnal lows; reassess once SU washout is complete |
| Metformin | 1000 mg BD | Continue | eGFR 68; hold on the day of surgery/contrast |
| Empagliflozin | — | **Add 10 mg OD** | Albuminuria + CV risk benefit; modest glucose effect; **hold ≥3 days before surgery** (euglycaemic DKA risk) |
| Prandial | — | Consider rapid-acting insulin 4 U before lunch if post-lunch >220 after 2 weeks | Targets the largest excursion |

GLP-1 RA (e.g. semaglutide) is attractive for weight and glycaemia, but **defer**: unexplained weight loss is under evaluation, and it complicates peri-operative aspiration risk.

## Pre-operative glycaemic readiness
- **Not ready for elective arthroplasty today.** Most orthopaedic pathways use HbA1c <8% (some <7.5%) and peri-operative glucose <180 mg/dL because of periprosthetic joint infection risk.
- With the changes above, expect TIR >60% within 4–6 weeks. Recheck HbA1c/fructosamine at ~8–10 weeks (fructosamine is more reliable while anaemia is corrected).

## Other findings needing action
- 🔴 **Iron-deficiency anaemia (Hb 10.2, MCV 74, ferritin 11) + ~4 kg unintentional weight loss + altered bowel habit in a 58-year-old man.** This needs **GI evaluation (colonoscopy ± upper endoscopy) to exclude malignancy before any elective surgery.** Recent NSAID use is a possible contributor but should not close the workup.
- LDL 112 mg/dL is above target for his risk (<70). Consider increasing atorvastatin to 40 mg.
- BP 146/88. Consider telmisartan titration (also helps the albuminuria).

## Coaching plan for the patient
- Your night-time low sugars are the most urgent problem. We are **stopping one tablet (glimepiride)** and **lowering the night insulin** to fix this.
- If you feel sweaty or shaky at night, check your sugar. If it is under 70, take 3 teaspoons of sugar in water, recheck in 15 minutes, and tell us.
- **Rice:** keep one cup (the size of your fist) at lunch and dinner and fill the rest of the plate with thoran, avial or sambar vegetables and fish or dal.
- **Breakfast:** 2 puttu pieces or 2 appam with kadala curry or egg rather than banana and sugar.
- **Tea:** switch to no sugar or a sweetener. Three sweet teas add about 30 g of sugar a day.
- **Movement without hurting your knee:** 10 minutes of walking after lunch and dinner, or seated leg exercises or stationary cycling. Walking after meals lowers the spikes the sensor showed.
- Take the new tablet (empagliflozin) in the morning and drink enough water. Stop it 3 days before any operation; we will remind you.
`,
};

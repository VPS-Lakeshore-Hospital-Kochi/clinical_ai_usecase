import { obj, str, list, oneOf } from "./schema.js";

const GATES = ["gi", "hba1c", "hb", "dental", "skin", "mrsa", "none"];

// Clinician view: total knee replacement planning. The app scores the Oxford Knee Score band and
// runs the readiness gate (unexplained anaemia/weight loss, HbA1c, Hb, BMI, NSAID, dental, skin,
// MRSA); Claude drafts the indication, options, risks, optimisation checklist, consent and rehab.
export default {
  instructions: `Draft the total knee replacement plan for the orthopaedic surgeon, as JSON. The app has scored function and run the readiness gate (listed); build on them and do not contradict the gate verdict. Present options, not a final choice.
- summary: verdict and the single most important reason.
- indication: the case for arthroplasty point by point, marking what is still missing.
- options: implant, deformity correction, alignment, patella, blood management, VTE and anaesthesia considerations, each with the options and a note.
- risks: risk factor | finding | impact | mitigation.
- checklist: optimisation items with an owner, each linked to the readiness-gate item it clears (gi, hba1c, hb, dental, skin, mrsa, or none).
- consent: plain-English points (benefit, common and serious risks with approximate rates, alternatives, why we are waiting).
- rehab: phases with milestones.`,
  schema: obj({
    summary: obj({ verdict: oneOf(["Proceed", "Proceed after optimisation", "Defer pending workup"]), reason: str() }),
    indication: list(obj({ point: str(), status: oneOf(["ok", "missing"]) })),
    options: list(obj({ topic: str(), options: str(), note: str() })),
    risks: list(obj({ factor: str(), finding: str(), impact: str(), mitigation: str() })),
    checklist: list(obj({ item: str(), owner: str(), gate: oneOf(GATES) })),
    consent: list(obj({ kind: oneOf(["Benefit", "Common", "Serious", "Alternative", "Why we are waiting"]), text: str() })),
    rehab: list(obj({ phase: str(), milestones: str() })),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.opd || ""}\n\nImaging report:\n${payload.imaging || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    summary: { verdict: "Defer pending workup", reason: "Clear indication for right TKA, but iron-deficiency anaemia with weight loss must be investigated before any elective arthroplasty, and glycaemia is above the safe threshold." },
    indication: [
      { point: "Kellgren–Lawrence grade 4 medial tibiofemoral OA with moderate patellofemoral OA and 12° varus", status: "ok" },
      { point: "Oxford Knee Score 17/48 (severe); KOOS JR 42; walking limited to about 200 m; night pain", status: "ok" },
      { point: "Conservative care exhausted: physiotherapy, analgesia, NSAIDs, one steroid injection, weight-loss advice", status: "ok" },
      { point: "Walking aid trial not documented", status: "missing" },
      { point: "Dental review and lower-limb skin check not yet done", status: "missing" },
    ],
    options: [
      { topic: "Implant", options: "Cemented posterior-stabilised (PS) or cruciate-retaining (CR); medial-pivot as an alternative", note: "PS suits 12° varus with a fixed flexion deformity if PCL balance is uncertain" },
      { topic: "Deformity", options: "Staged medial release for varus; posterior capsular release and osteophyte clearance for the 10° FFD", note: "Extra distal femoral resection only if the FFD persists" },
      { topic: "Alignment", options: "Mechanical or restricted kinematic; navigation or robotic assistance", note: "Helps limit outliers in severe varus" },
      { topic: "Patella", options: "Resurface or not", note: "Moderate patellofemoral OA favours resurfacing" },
      { topic: "Blood management", options: "IV ± topical tranexamic acid", note: "Correct the anaemia first" },
      { topic: "VTE", options: "Aspirin or LMWH per protocol, plus mechanical prophylaxis", note: "Early mobilisation" },
      { topic: "Anaesthesia", options: "Spinal with adductor canal block and periarticular infiltration", note: "Document baseline sensation (neuropathy)" },
    ],
    risks: [
      { factor: "Glycaemia", finding: "HbA1c 9.1%, time in range 41%", impact: "Higher joint-infection and wound risk", mitigation: "HbA1c <8%; peri-operative glucose <180 mg/dL" },
      { factor: "Anaemia", finding: "Hb 10.2, ferritin 11, MCV 74; cause unknown", impact: "Transfusion, infection, slower recovery", mitigation: "GI work-up first; IV iron; target Hb ≥13" },
      { factor: "Weight loss", finding: "About 4 kg unintentional", impact: "Possible occult malignancy", mitigation: "Do not list until explained" },
      { factor: "Obesity", finding: "BMI 31.2", impact: "Moderate infection, VTE and wound risk", mitigation: "Dietitian; acceptable for TKA" },
      { factor: "Renal", finding: "eGFR 68, albuminuria", impact: "NSAID and contrast caution", mitigation: "Avoid NSAIDs; monitor creatinine" },
      { factor: "Neuropathy", finding: "Reduced monofilament sensation", impact: "Masked complications, falls", mitigation: "Baseline documentation; foot care" },
    ],
    checklist: [
      { item: "Colonoscopy ± upper endoscopy for iron-deficiency anaemia with weight loss (urgent)", owner: "GI", gate: "gi" },
      { item: "IV iron once the GI plan is set; recheck Hb in 4 weeks", owner: "Medicine / Anaesthesia", gate: "hb" },
      { item: "Glycaemic optimisation to HbA1c <8%; SGLT2 inhibitor hold plan", owner: "Endocrinology", gate: "hba1c" },
      { item: "Dental check", owner: "Ortho", gate: "dental" },
      { item: "Lower-limb skin inspection", owner: "Ortho", gate: "skin" },
      { item: "Nasal MRSA screen and decolonisation per protocol", owner: "Infection control", gate: "mrsa" },
      { item: "Anaesthesia pre-assessment: ECG, functional capacity", owner: "Anaesthesia", gate: "none" },
      { item: "Pre-hab: quadriceps strengthening, range of motion, walking aid", owner: "Physio", gate: "none" },
    ],
    consent: [
      { kind: "Benefit", text: "Most people have much less pain and walk further; about 8 in 10 are satisfied at one year." },
      { kind: "Common", text: "Swelling, stiffness, numbness beside the scar, and a walking aid for several weeks." },
      { kind: "Serious", text: "Joint infection (about 1–2 in 100, higher with raised sugar), blood clots, nerve or vessel injury, persistent pain (10–15 in 100), further surgery." },
      { kind: "Alternative", text: "Keep going with physiotherapy, weight loss, a brace or injections; osteotomy is less suited to your age and pattern." },
      { kind: "Why we are waiting", text: "We need to find the cause of the low blood count and weight loss first, and bring your sugar into a safer range." },
    ],
    rehab: [
      { phase: "Pre-hab (now)", milestones: "Quadriceps strength, full extension work, walking aid practice" },
      { phase: "Day 0–3", milestones: "Walk on day 0–1; flexion to 90°; independent transfers; discharge" },
      { phase: "Weeks 1–6", milestones: "Flexion ≥110°, full extension; wean the walking aid; wound check at 2 weeks" },
      { phase: "Weeks 6–12", milestones: "Stairs reciprocally; walking to church; return to normal activities" },
    ],
  },
};

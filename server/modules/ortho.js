import { patient } from "../patient.js";

export default {
  id: "ortho",
  order: 3,
  title: "Ortho Surgery Planner",
  specialty: "Orthopaedics",
  stage: "specialty",
  date: "2026-07-22",
  summary:
    "Brings imaging, examination, function scores and comorbidities into a total knee replacement plan: indication, implant approach, risk, pre-op optimisation, consent points and a rehab protocol.",
  claudeRole: "Pulls the case together and drafts the surgical plan and optimisation checklist. The surgeon decides.",
  inputLabel: "Ortho OPD findings",
  inputHint: "Imaging report, examination and scores. Templating and alignment measurements come from the imaging software; Claude reasons over them.",
  outputLabel: "Draft surgical plan",
  system: `Task: pre-operative planning support for an orthopaedic surgeon considering elective total knee arthroplasty (TKA).

Produce in order:
1. "## Go / no-go summary": one line (Proceed / Proceed after optimisation / Defer pending workup) with the single most important reason.
2. "## Indication": the case for arthroplasty (radiographic grade, symptoms, function, failed conservative care), and what is missing.
3. "## Surgical plan considerations": implant design options (CR vs PS, fixation), deformity correction (varus, flexion contracture) and soft-tissue balancing, alignment philosophy, patellar resurfacing, blood management (tranexamic acid), VTE prophylaxis, anaesthesia. Present options, not a final choice.
4. "## Risk stratification": a table of risk factor | finding | impact | mitigation, covering infection, VTE, cardiac, renal, anaemia and glycaemia.
5. "## Pre-operative optimisation checklist": "- [ ]" items with owners (Ortho / Endo / Anaesthesia / Physio / GI etc.).
6. "## Consent discussion points": benefits, common and serious risks with approximate rates, and alternatives, in plain English.
7. "## Rehabilitation protocol": phases (pre-hab, day 0–3, weeks 1–6, weeks 6–12) with milestones.`,
  buildPrompt: (input) =>
    `${input}\n\nImaging report on file:\n${patient.documents.kneeXray}`,
  defaultInput: `Ortho OPD, 22 July 2026. Referred by Endocrinology.
History: Right knee pain for 4 years, worse over 12 months. Walking limited to ~200 m, stairs difficult, night pain 3–4 nights/week. Tried physiotherapy (6 weeks, 2025), weight-loss advice, paracetamol, NSAIDs (stopped 6 July), one intra-articular steroid injection (2024) with 6 weeks' relief.
Examination: Antalgic gait. Right knee varus ~12° clinically, correctable partially. Fixed flexion deformity 10°, flexion to 105°. Medial joint line tenderness. Stable collaterals. Distal neurovascular intact. Skin intact, no active foot ulcer.
Scores: Oxford Knee Score 17/48. KOOS JR 42.
Comorbidities: T2DM (HbA1c 9.1% on 6 July; regimen changed 20 July, CGM time in range 41%), hypertension, obesity BMI 31.2, eGFR 68, albuminuria, peripheral neuropathy.
Latest labs: Hb 10.2 g/dL, MCV 74, ferritin 11. ~4 kg unintentional weight loss reported to Endocrinology.
Patient goal: walk to church and play with grandchildren. Wants surgery "as soon as possible".`,
  demoOutput: `## Go / no-go summary
**Defer pending workup.** There is a clear indication for right TKA, but **unexplained iron-deficiency anaemia with weight loss must be investigated (GI) before any elective arthroplasty**, and glycaemic control is not yet at a safe threshold.

## Indication
- **Radiographic**: Kellgren–Lawrence grade 4 medial tibiofemoral OA (bone-on-bone), moderate patellofemoral OA, 12° varus mechanical axis.
- **Symptoms/function**: Oxford Knee Score 17/48 (severe), KOOS JR 42, walking limited to ~200 m, night pain.
- **Conservative care exhausted**: physiotherapy, analgesia, NSAIDs, steroid injection (short-lived relief), weight-loss advice.
- **Missing / to confirm**: whether the patient has tried a walking aid; dental review; skin check of the lower limb.

## Surgical plan considerations
- **Implant**: cemented TKA is standard given age, bone quality and diabetes. **PS (posterior-stabilised)** suits a 12° varus knee with a fixed flexion deformity if PCL balance is uncertain. **CR** is an option if the PCL is competent intra-operatively. Discuss the medial-pivot design as an alternative.
- **Deformity**: staged medial release (deep MCL → posteromedial capsule ± semimembranosus) for varus correction. Posterior capsular release and osteophyte clearance for the 10° FFD. Consider an extra distal femoral resection only if the FFD persists.
- **Alignment**: mechanical or restricted kinematic alignment per surgeon preference. Navigation or robotic assistance can help limit outliers in severe varus.
- **Patella**: moderate PF OA favours resurfacing. Discuss.
- **Blood management**: IV ± topical tranexamic acid (no contraindication seen). **Correct the anaemia first.**
- **VTE**: aspirin or LMWH per institutional protocol, plus mechanical prophylaxis and early mobilisation.
- **Anaesthesia**: spinal with adductor canal block and periarticular infiltration. Diabetic neuropathy: document baseline sensation.

## Risk stratification
| Risk factor | Finding | Impact | Mitigation |
|---|---|---|---|
| Glycaemia | HbA1c 9.1%, TIR 41% | ↑ periprosthetic joint infection (PJI), wound problems | Target HbA1c <8% (or fructosamine <292 µmol/L); peri-op glucose <180 |
| **Anaemia** | **Hb 10.2, ferritin 11, MCV 74** | ↑ transfusion, PJI, poorer recovery; **cause unknown** | **GI workup first**; IV iron; target Hb ≥13 |
| Weight loss | ~4 kg unintentional | Possible occult malignancy | GI evaluation; do not list for surgery until explained |
| Obesity | BMI 31.2 | ↑ infection, VTE, wound risk (moderate) | Dietitian; acceptable for TKA |
| Renal | eGFR 68, albuminuria | NSAID/contrast caution | Avoid NSAIDs; hydrate; monitor creatinine |
| Neuropathy | Reduced monofilament | Masked complications, falls | Baseline documentation; foot care |
| Cardiac | HTN, diabetes, family history of MI | Peri-op cardiac events | Anaesthesia pre-assessment, ECG ± echo per functional capacity |

## Pre-operative optimisation checklist
- [ ] **GI referral: colonoscopy ± upper GI endoscopy for iron-deficiency anaemia with weight loss** (GI), urgent
- [ ] IV iron once the GI plan is set (Medicine/Anaesthesia); recheck Hb in 4 weeks
- [ ] Glycaemic optimisation to HbA1c <8%; SGLT2 inhibitor hold plan (Endo)
- [ ] Anaesthesia pre-assessment: ECG, functional capacity (Anaesthesia)
- [ ] Dental check and skin inspection (Ortho)
- [ ] Nasal MRSA screen / decolonisation per protocol (Infection control)
- [ ] Pre-hab: quadriceps strengthening, ROM, walking aid (Physio)
- [ ] Re-review in Ortho OPD with GI result and HbA1c

## Consent discussion points
- **Expected benefit**: most patients have much less pain and walk further. About 8 in 10 are satisfied at one year.
- **Common**: swelling, stiffness, numbness beside the scar, needing a walking aid for several weeks.
- **Serious but uncommon**: joint infection (~1–2%, higher with raised sugar), blood clots, nerve or vessel injury, persistent pain (~10–15%), need for further surgery.
- **Alternatives**: continue non-operative care (physiotherapy, weight loss, bracing, injections) or high tibial osteotomy (less suited to his age and pattern).
- **Why we are waiting**: we need to find the cause of the low blood count and weight loss first, and get sugars into a safer range.

## Rehabilitation protocol
- **Pre-hab (now → surgery)**: quadriceps sets, straight-leg raises, heel slides, stationary cycling; practise with a walker.
- **Day 0–3**: mobilise on the day of surgery, full weight-bearing as tolerated, target 0–90° flexion by discharge, cryotherapy.
- **Weeks 1–6**: extension to 0° as priority (FFD history), flexion >110°, gait training, wean walker → stick. Wound check at 2 weeks.
- **Weeks 6–12**: strength and balance, stairs, return to church walks. Review at 6 weeks with X-ray.
`,
};

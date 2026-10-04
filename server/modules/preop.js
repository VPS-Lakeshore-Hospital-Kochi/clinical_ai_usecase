export default {
  id: "preop",
  order: 8.5,
  title: "Pre-op Readiness & WHO Checklist",
  specialty: "Surgery / Anaesthesia",
  stage: "inpatient",
  date: "2026-08-18",
  summary:
    "Runs a readiness gate on the day of admission across consent, medicines, labs, anaesthesia, surgical preparation and paperwork, lists the gaps with owners before theatre, and pre-fills the WHO Surgical Safety Checklist.",
  claudeRole: "Cross-checks every pre-operative item against the whole chart and flags what is missing. The surgical and anaesthesia teams confirm and complete the checklist in theatre.",
  inputLabel: "Admission-day pre-op data",
  inputHint: "Ward admission checklist, anaesthesia notes and orders on the day before surgery. Claude compares them with the plans made at the tumour board, cardiology and pre-auth steps.",
  outputLabel: "Draft readiness report",
  system: `Task: pre-operative readiness gate on the day of admission for elective major surgery.

Compare the admission data against the whole record, including plans made earlier by other teams. Produce in order:
1. "## Readiness verdict": Go / Go once actions are complete / Hold, with the blocking items.
2. "## Readiness checklist": a table of domain | item | status (✅ / ⚠️ / ❌) | evidence or gap, covering identity and consent, medical optimisation, medicines held or continued, labs and blood products, anaesthesia plan, surgical preparation (bowel preparation, stoma marking, antibiotic and VTE prophylaxis), ERAS elements, and administrative items (insurance approval, room).
3. "## Actions before theatre": a "- [ ]" list, each with an owner and a deadline.
4. "## WHO Surgical Safety Checklist (pre-filled)": Sign In, Time Out and Sign Out sections. Pre-fill what the chart supports and mark items that must be confirmed live in theatre as "(confirm in OT)".
5. "## Night-before instructions for the patient": plain English, under 120 words.`,
  buildPrompt: (input) => `Admission-day data:\n\n${input}`,
  defaultInput: `Admission for elective laparoscopic anterior resection, 18 Aug 2026 (surgery 19 Aug, first on the list, 08:00).
Identity: wristband checked. Allergy band: sulfonamide antibiotics.
Consent: signed 12 Aug for "laparoscopic anterior resection, possible open conversion". Anaesthesia consent signed.
Stoma: surgical plan says "diverting loop ileostomy if the anastomosis is low or the leak test is equivocal". Stoma nurse review: not documented.
Medical: HbA1c 8.3% (repeat 14 Aug; 9.1% in July). Glucose this morning 168 mg/dL. Hb 11.6 (after IV iron 6 Aug). Creatinine 1.1, K 4.3. Cardiology clearance 11 Aug (stress echo negative); baseline hs-troponin 6 ng/L; post-op troponin at 24/48 h requested.
Medicines: empagliflozin last dose 14 Aug. Metformin: last dose tonight, hold tomorrow. Telmisartan: last dose this morning 07:00. Atorvastatin 40 mg: continue. Insulin glargine 12 U: tonight's dose not yet adjusted on the chart.
Blood bank: group and screen sent 18 Aug 10:00, result pending. Crossmatch: not requested.
Anaesthesia: pre-assessment 16 Aug, ASA 3. Plan: GA + bilateral TAP blocks, multimodal analgesia. Airway normal. PONV risk moderate.
Bowel preparation: mechanical prep prescribed for this evening. Oral antibiotic prep (neomycin + metronidazole): not prescribed.
Antibiotic prophylaxis at induction: cefazolin 2 g + metronidazole 500 mg ordered.
VTE: mechanical stockings ordered; enoxaparin 40 mg from the evening of surgery ordered; extended 28-day prophylaxis not yet in the discharge plan.
ERAS: carbohydrate loading drink ordered for 06:00 tomorrow. Clear fluids until 2 h before. Early feeding plan in place.
Other: MRSA nasal screen negative (Aug). Dentures: none. Hearing aids: none.
Administration: cashless pre-authorisation approved 14 Aug. Room: standard single (within the ₹10,000/day cap) chosen after counselling.`,
  demoOutput: `## Readiness verdict
**Go once actions are complete.** Nothing needs cancellation, but four items must be closed before 08:00 tomorrow: **stoma-site marking and consent for a possible ileostomy**, **tonight's insulin dose**, **the group-and-screen result**, and a **decision on the carbohydrate drink** for a patient with diabetes.

## Readiness checklist
| Domain | Item | Status | Evidence or gap |
|---|---|---|---|
| Identity & consent | Identity and allergy bands | ✅ | Sulfonamide allergy band on |
| | Procedure consent | ❌ | Consent covers resection and open conversion, **not the planned possible diverting ileostomy** |
| | Anaesthesia consent | ✅ | Signed |
| Medical | Glycaemia | ✅ | HbA1c 8.3% (improving); glucose 168 mg/dL this morning |
| | Anaemia | ✅ | Hb 11.6 after IV iron |
| | Cardiac | ✅ | Stress echo negative; troponin baseline and post-op plan in place |
| | Kidney / potassium | ✅ | Creatinine 1.1, K 4.3 |
| Medicines | Empagliflozin | ✅ | Last dose 14 Aug (≥3 days before surgery) |
| | Metformin | ✅ | Hold on the day of surgery |
| | Telmisartan | ⚠️ | Last dose 07:00 on 18 Aug, 25 h before an 08:00 start: meets the 24-hour hold. **Make sure no dose is given tomorrow morning** |
| | Insulin glargine | ❌ | **Tonight's dose not adjusted**: give ~80% (10 U instead of 12 U) |
| | Atorvastatin | ✅ | Continue |
| Blood | Group and screen | ⚠️ | Sent 10:00, **result pending**. Crossmatch not needed if the screen is negative (low expected blood loss) |
| Anaesthesia | Pre-assessment | ✅ | ASA 3; GA + TAP blocks; airway normal |
| | PONV prophylaxis | ⚠️ | Moderate risk: **use a non-steroid antiemetic combination** (dexamethasone raises glucose; if used, a single 4 mg dose with glucose monitoring) |
| Surgical preparation | Mechanical bowel prep | ✅ | Prescribed |
| | Oral antibiotic prep | ❌ | **Not prescribed.** Combined mechanical + oral antibiotic preparation reduces surgical-site infection in left-sided colorectal resection |
| | Stoma-site marking | ❌ | **Not documented**, although a diverting ileostomy is possible |
| | Antibiotic prophylaxis | ✅ | Cefazolin + metronidazole at induction; no sulfonamide |
| | VTE | ⚠️ | In-hospital plan fine; **add extended 28-day enoxaparin** to the discharge plan (abdominal cancer surgery) |
| ERAS | Carbohydrate drink | ⚠️ | **Diabetes on insulin:** omit the drink or give it with a glucose check at 08:00 per unit protocol |
| | Fasting / clear fluids | ✅ | Clear fluids until 2 h before |
| Administrative | Insurance | ✅ | Cashless approval 14 Aug |
| | Room | ✅ | Standard single, within the policy cap |
| | Infection screen | ✅ | MRSA negative |

## Actions before theatre
- [ ] **Stoma nurse: mark the ileostomy site** this evening (Stoma nurse, by 20:00)
- [ ] **Re-consent** to add "possible diverting loop ileostomy", with a plain-language explanation (Operating surgeon, by 20:00)
- [ ] **Insulin glargine 10 U tonight** (80% of the usual dose); capillary glucose at 06:00 and on arrival in theatre (Ward doctor / nurse, by 21:00)
- [ ] **Prescribe oral antibiotic bowel preparation** per unit protocol, or document why it is omitted (Surgical team, by 18:00)
- [ ] **Chase the group-and-screen result** (Ward nurse, by 20:00)
- [ ] **Decide on the carbohydrate drink** per the diabetes ERAS protocol (Anaesthesia, by 21:00)
- [ ] **Mark telmisartan "do not give" on 19 Aug** (Pharmacy / nurse, tonight)
- [ ] **Add extended enoxaparin (28 days)** to the discharge plan (Surgical team, before discharge)

## WHO Surgical Safety Checklist (pre-filled)
**Sign In** (before induction)
- Patient identity, procedure (laparoscopic anterior resection ± diverting ileostomy) and consent: *confirm updated consent* (confirm in OT)
- Site marked: midline/laparoscopic, laterality not applicable; **stoma site marked** (confirm in OT)
- Anaesthesia machine and medication check (confirm in OT)
- Pulse oximeter on and working (confirm in OT)
- **Known allergy: sulfonamide antibiotics**
- Difficult airway / aspiration risk: no (normal airway assessment)
- Risk of >500 mL blood loss: low; group and screen result: ___ (confirm in OT)

**Time Out** (before incision)
- Team introductions by name and role (confirm in OT)
- Confirm patient, procedure, and incision plan (confirm in OT)
- **Antibiotic prophylaxis given within 60 minutes**: cefazolin 2 g + metronidazole 500 mg (confirm time in OT)
- Anticipated critical events: surgeon (steps, duration ~3.5 h, blood loss), anaesthesia (ASA 3, diabetes on insulin, glucose target 140–180, cardiac plan), nursing (sterility, equipment: laparoscopic stapler, leak-test kit)
- Essential imaging displayed: CT 1 Aug (confirm in OT)
- **Glucose checked before incision** (confirm value in OT)

**Sign Out** (before leaving theatre)
- Procedure recorded, **including whether a stoma was formed**
- Instrument, sponge and needle counts correct (confirm in OT)
- Specimen labelled: sigmoid/rectosigmoid resection, orientation marked (confirm in OT)
- Equipment problems to address (confirm in OT)
- Recovery handover: glucose plan, troponin at 24 h and 48 h, enoxaparin from this evening, telmisartan and metformin on hold, empagliflozin to restart only when eating and drinking normally

## Night-before instructions for the patient
Mr. Thomas, your operation is first on the list tomorrow at 8 am.
- Tonight, take **10 units** of your night insulin, not 12. The nurse will check your sugar at 6 am.
- Drink the bowel-cleaning medicine as the nurse explains. You can have clear fluids (water, black tea, clear juice) until 6 am.
- **Do not take** your BP tablet (telmisartan), metformin or empagliflozin tomorrow morning.
- The stoma nurse will visit this evening to explain a possible temporary bag and mark the best place for it, just in case it is needed.
- Tell the nurse if you feel shaky or sweaty during the night.
`,
};

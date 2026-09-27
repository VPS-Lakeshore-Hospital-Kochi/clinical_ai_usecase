import { obj, str, list, oneOf, int, bool } from "./schema.js";

// Clinician view: recorded consultation → note with every item traced to transcript lines.
export default {
  instructions: `Write the clinic note from the numbered consultation transcript below, as JSON for the doctor's note editor.
- Every safety flag, code and order must cite the transcript line numbers (L1, L2, ...) that support it, as integers in "lines".
- SOAP sections are short markdown bullet lists. Mark anything uncertain "(verify)".
- orders: include only what was discussed; if you suggest something not discussed, set discussed to false.
- patientSummary: 5–8 short plain-English sentences addressed to the patient as "you".`,
  schema: obj({
    safetyFlags: list(obj({ title: str(), detail: str(), lines: list(int()) })),
    soap: obj({ subjective: str(), objective: str(), assessment: str(), plan: str() }),
    codes: list(obj({ code: str(), description: str(), evidence: str(), lines: list(int()) })),
    orders: list(obj({ text: str(), type: oneOf(["Investigation", "Prescription", "Referral", "Device", "Follow-up"]), discussed: bool(), lines: list(int()) })),
    patientSummary: str(),
  }),
  toText(payload) {
    return `Consultation transcript (Endocrinology OPD, 6 July 2026), numbered by line:\n\n${(payload.lines || []).map((l, i) => `L${i + 1} ${l}`).join("\n")}`;
  },
  demo: {
    safetyFlags: [
      { title: "Weight loss, tiredness, bowel change and pallor", detail: "About 4 kg lost over 6 months without trying, marked fatigue, alternating loose and hard stools and a pale appearance in a 58-year-old. Needs structured evaluation (CBC, iron studies; low threshold for GI referral). Do not attribute to diabetes alone.", lines: [13, 14, 15, 16, 19] },
      { title: "Recurrent night-time hypoglycaemia", detail: "Sweating and shakiness around 3–4 AM, two or three times a week, on glimepiride plus glargine 16 units.", lines: [2, 3, 4, 5, 6] },
      { title: "Daily NSAID for about 7 months", detail: "Aceclofenac almost daily, with diabetes: kidney and stomach-bleeding risk. Stopped today.", lines: [10, 11, 12, 22] },
    ],
    soap: {
      subjective: "- Type 2 diabetes since 2014. Home readings 200–250 mg/dL after meals.\n- Night sweats and shakiness around 03:00–04:00, 2–3 times a week, treated with juice.\n- Takes metformin 1000 mg twice daily, glimepiride 2 mg in the morning, glargine 16 units at night.\n- Rice at lunch and dinner, puttu or appam at breakfast; 3 cups of sweetened tea a day.\n- Right knee pain limits walking to about 200 m; aceclofenac almost daily for 6–7 months.\n- About 4 kg unintentional weight loss, marked tiredness, alternating loose and hard stools for a few months. No visible blood.\n- Burning feet at night.",
      objective: "- BP 146/88 mmHg, pulse 84/min, weight 88 kg. Appears pale (verify).\n- Feet: reduced monofilament sensation on both soles (forefoot); pedal pulses present.\n- Right knee: bony swelling, varus deformity, crepitus, painful flexion beyond about 100°.\n- Point-of-care HbA1c 9.1% (7.8% last year).",
      assessment: "1. Type 2 diabetes, above target (HbA1c 9.1%), with recurrent night-time hypoglycaemia, likely from the sulfonylurea plus basal insulin.\n2. Probable diabetic peripheral neuropathy.\n3. Unintentional weight loss, tiredness, bowel change and pallor: cause not yet known; anaemia suspected.\n4. Right knee osteoarthritis with varus deformity, limiting walking.\n5. Hypertension above target.\n6. Long-term NSAID use, stopped today.",
      plan: "1. 14-day CGM applied; review the regimen with the data (consider stopping glimepiride) (verify).\n2. Bloods: CBC, iron studies, kidney function, urine albumin, lipids. Review promptly; low threshold for GI evaluation.\n3. Stop aceclofenac; paracetamol when needed.\n4. Orthopaedic referral for the knee.\n5. Recheck BP at review.",
    },
    codes: [
      { code: "E11.649", description: "Type 2 diabetes with hypoglycaemia without coma", evidence: "Night sweats and shakiness relieved by juice, 2–3 times a week", lines: [2, 3, 4] },
      { code: "E11.65", description: "Type 2 diabetes with hyperglycaemia", evidence: "HbA1c 9.1%; readings 200–250 after meals", lines: [2, 20] },
      { code: "E11.42", description: "Type 2 diabetes with diabetic polyneuropathy", evidence: "Burning feet; reduced monofilament sensation (verify diagnosis)", lines: [17, 18, 19] },
      { code: "R63.4", description: "Abnormal weight loss", evidence: "About 4 kg lost without trying", lines: [13, 14] },
      { code: "R19.4", description: "Change in bowel habit", evidence: "Alternating loose and hard stools for months", lines: [16] },
      { code: "M17.11", description: "Primary osteoarthritis, right knee", evidence: "Varus deformity, crepitus, painful movement", lines: [10, 19] },
      { code: "I10", description: "Essential hypertension", evidence: "BP 146/88", lines: [19] },
      { code: "Z79.4", description: "Long-term use of insulin", evidence: "Glargine 16 units at night", lines: [6] },
    ],
    orders: [
      { text: "14-day CGM sensor (applied today)", type: "Device", discussed: true, lines: [22] },
      { text: "CBC with peripheral smear, ferritin, serum iron/TIBC", type: "Investigation", discussed: true, lines: [22] },
      { text: "Creatinine/eGFR, potassium, urine albumin-creatinine ratio", type: "Investigation", discussed: true, lines: [22] },
      { text: "Fasting lipid profile", type: "Investigation", discussed: true, lines: [22] },
      { text: "Stop aceclofenac", type: "Prescription", discussed: true, lines: [22] },
      { text: "Paracetamol 650 mg when needed for knee pain (maximum 3 g a day)", type: "Prescription", discussed: true, lines: [22] },
      { text: "Referral: Orthopaedics (right knee)", type: "Referral", discussed: true, lines: [22] },
      { text: "Review with CGM report and results in 2 weeks, sooner if results are abnormal", type: "Follow-up", discussed: true, lines: [22] },
      { text: "Referral: dietitian (rice-heavy meals, sweetened tea)", type: "Referral", discussed: false, lines: [8] },
    ],
    patientSummary: "Your sugar is higher than it should be. Your 3-month average (HbA1c) is 9.1%. You are also having low sugars at night, which is not safe. You will wear a small sensor for 14 days so we can see your sugar all day and night. Please stop the aceclofenac pain tablet and use paracetamol instead. We are testing your blood today because you have lost weight without trying and feel tired. We will call you if anything needs attention sooner. Our knee specialist will also see you.",
  },
};

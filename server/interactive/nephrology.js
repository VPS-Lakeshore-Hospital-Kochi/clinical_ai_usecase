import { obj, str, list } from "./schema.js";

// Clinician view: nephrology e-consult before CAPOX. The app calculates eGFR (CKD-EPI 2021),
// Cockcroft-Gault CrCl on actual and adjusted weight, the KDIGO G/A stage and risk, the CKD
// confirmation date and renal dose bands; Claude answers the questions and drafts the plans.
export default {
  instructions: `Answer this nephrology e-consult for Medical Oncology, as JSON (KDIGO 2012/2022/2024, ACR–NKF contrast consensus). The app has calculated eGFR, Cockcroft-Gault creatinine clearance, the KDIGO stage and risk, the CKD confirmation date and renal dose bands (listed); build on them and do not contradict their numbers.
- answers: one short answer per referral question, in order.
- assessment: interpretation of the kidney trend (why eGFR changed, why albuminuria persists, what is provisional).
- dosing: drug | renal threshold | this patient | action.
- sickDay: sick-day rules addressed to the patient in plain English, under 150 words.
- contrast: contrast-imaging guidance.
- protection: long-term albuminuria and kidney-protection plan.
- monitoring: when | test | why.
- note: a short note to Medical Oncology.`,
  schema: obj({
    answers: list(str()),
    assessment: list(str()),
    dosing: list(obj({ drug: str(), threshold: str(), patient: str(), action: str() })),
    sickDay: str(),
    contrast: list(str()),
    protection: list(str()),
    monitoring: list(obj({ when: str(), test: str(), why: str() })),
    note: str(),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.consult || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    answers: [
      "Yes: full-dose CAPOX. Creatinine clearance is about 81 mL/min on adjusted body weight (94 on actual weight), well above the capecitabine (50) and oxaliplatin (30) thresholds.",
      "Probable CKD G2 A2 from diabetes, but not yet confirmed: the first raised UACR was 6 Jul, so repeat UACR on or after 6 Oct. The July eGFR dip was NSAID-related and has recovered.",
      "Sick-day rules: pause metformin, empagliflozin and telmisartan during significant diarrhoea or vomiting; reduce insulin rather than stopping it.",
      "Contrast CT is safe at eGFR ≥45 without extra hydration or stopping metformin.",
    ],
    assessment: [
      "eGFR 68 → 87 → 85: stopping aceclofenac removed its effect on kidney blood flow. The small dip expected after restarting empagliflozin on 27 Aug is not harmful.",
      "Albuminuria persists (UACR 42 → 38 mg/g): most likely diabetic kidney disease after 12 years of type 2 diabetes, with neuropathy as another microvascular complication.",
      "Stage is provisional: KDIGO needs abnormality for more than 3 months.",
      "Adjusted body weight (72.1 kg) gives the more conservative clearance for dosing, since BMI is 29.8.",
    ],
    dosing: [
      { drug: "Capecitabine", threshold: "CrCl 30–50: start at 75%; <30: contraindicated", patient: "CrCl 81 mL/min", action: "Full dose; recheck creatinine before each cycle" },
      { drug: "Oxaliplatin", threshold: "CrCl <30: reduce dose", patient: "CrCl 81 mL/min", action: "Full dose" },
      { drug: "Metformin", threshold: "eGFR <30 stop; 30–44 maximum 1000 mg a day", patient: "eGFR 85", action: "Continue 1000 mg twice daily; pause on sick days" },
      { drug: "Empagliflozin", threshold: "Initiate if eGFR ≥20", patient: "eGFR 85", action: "Continue; pause on sick days" },
      { drug: "Telmisartan", threshold: "Monitor K and creatinine", patient: "K 4.6", action: "Continue; consider 80 mg after cycle 1" },
      { drug: "Enoxaparin 40 mg", threshold: "Adjust if CrCl <30", patient: "CrCl 81 mL/min", action: "No change; ends 16 Sep" },
      { drug: "NSAIDs", threshold: "Avoid in CKD with a RAS blocker and SGLT2 inhibitor", patient: "—", action: "Avoid permanently; paracetamol for knee pain" },
    ],
    sickDay: "Mr Thomas, if you have diarrhoea 4 or more times a day, vomiting, or cannot eat and drink normally: stop metformin, empagliflozin and telmisartan until you have been eating and drinking normally for 24–48 hours, then restart them. Do not stop your insulin: check your sugar every 4 hours and, if you are eating little, take about 20% less at night (11 units instead of 14). Drink small amounts often: oral rehydration solution, kanji water or tender-coconut water. Call the oncology helpline the same day. Come to hospital if you cannot keep fluids down for 12 hours, pass very little urine, feel dizzy on standing, or your sugar stays above 300 or below 70.",
    contrast: [
      "eGFR ≥45 and stable: no prophylactic IV hydration and no need to stop metformin (ACR–NKF 2020).",
      "Do not schedule contrast CT during chemotherapy-related dehydration or AKI; check creatinine within 1 week before the scan while on chemotherapy.",
    ],
    protection: [
      "BP target <130/80 (systolic <120 if tolerated): increase telmisartan to 80 mg, with K and creatinine 1–2 weeks later; consider waiting until after cycle 1.",
      "Continue empagliflozin long term for kidney and heart protection.",
      "If UACR stays ≥30 mg/g on maximum telmisartan after chemotherapy: consider finerenone if K ≤4.8; discuss a GLP-1 receptor agonist once weight is stable.",
      "Avoid NSAIDs and unreviewed herbal or ayurvedic preparations.",
    ],
    monitoring: [
      { when: "Before each CAPOX cycle", test: "Creatinine, eGFR, K, CBC", why: "Capecitabine dosing; dehydration" },
      { when: "1–2 weeks after a telmisartan increase", test: "K, creatinine", why: "Hyperkalaemia or eGFR dip" },
      { when: "On or after 6 Oct 2026", test: "UACR", why: "Confirm chronicity (CKD A2)" },
      { when: "End of chemotherapy (about Dec 2026)", test: "Creatinine, UACR, K", why: "Decide on finerenone" },
      { when: "Every 6 months thereafter", test: "eGFR, UACR", why: "KDIGO monitoring for G2 A2" },
    ],
    note: "Kidney function is adequate for full-dose CAPOX (CrCl about 81 mL/min on adjusted body weight; eGFR 85). The July eGFR of 68 was NSAID-related and has recovered. Probable CKD G2 A2 from diabetes; UACR to be repeated after 6 Oct to confirm. Please check creatinine and K before each cycle and apply the sick-day rules during grade ≥2 diarrhoea or vomiting. Contrast CT needs no special precautions at the current eGFR. Nephrology will review after chemotherapy.",
  },
};

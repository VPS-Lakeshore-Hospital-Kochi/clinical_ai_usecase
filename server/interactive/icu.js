import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: ICU admission with app-run bundle tracker and calculations → Claude's problem-based plan.
export default {
  instructions: `Support this ICU admission round. Return JSON for the intensivist's round screen. The app tracks the sepsis and DKA bundle steps and calculates the anion gap, AKI stage and insulin rate (listed); do not repeat those calculations.
- flags: immediately dangerous issues, most dangerous first, each with the action. Tie them to the history (chemotherapy, diabetes drugs, kidney function).
- problems: one block per problem with supporting data, plan and targets.
- drugs: stopped, held, renally adjusted and new drugs, with the reason.
- sbar: for the night team. family: plain English, under 120 words.
- questions: for the parent teams.`,
  schema: obj({
    flags: list(obj({ title: str(), action: str() })),
    problems: list(obj({ problem: str(), data: str(), plan: str(), targets: str() })),
    drugs: list(obj({ drug: str(), action: oneOf(["Stop", "Hold", "Continue", "New", "Adjust", "Request"]), reason: str() })),
    sbar: obj({ situation: str(), background: str(), assessment: str(), recommendation: str() }),
    family: str(),
    questions: list(obj({ team: str(), question: str() })),
  }),
  toText(payload) {
    const calc = (payload.calculations || []).map((c) => `- ${c}`);
    const bundle = (payload.bundle || []).map((b) => `- ${b.item}: ${b.status}`);
    return `${payload.admission || ""}\n\nApp calculations:\n${calc.join("\n")}\n\nBundle status at ${payload.now || ""}:\n${bundle.join("\n")}`;
  },
  demo: {
    flags: [
      { title: "Euglycaemic DKA (SGLT2 inhibitor)", action: "pH 7.12, HCO3 9, ketones 5.8 with glucose only 212: do not be reassured by the glucose. DKA protocol with insulin plus 10% dextrose." },
      { title: "Potassium 3.1", action: "Replace potassium first. Do not start insulin until K ≥3.3: it will fall further." },
      { title: "Possible neutropenic sepsis", action: "ANC 0.6, hypotension, lactate 3.2, procalcitonin 1.1. Give broad-spectrum antibiotics now: past the 1-hour target." },
      { title: "Severe early fluoropyrimidine toxicity", action: "Grade 3 diarrhoea and mucositis with neutropenia by day 10 of cycle 1: suspect DPD deficiency. The DPYD result sent 6 Aug is missing; chase it today. Uridine triacetate is indicated within 96 h of the last capecitabine dose (window closes the morning of 23 Sep)." },
      { title: "AKI, KDIGO stage 2", action: "Pre-renal from GI losses. Renally adjust drugs and avoid nephrotoxins." },
    ],
    problems: [
      { problem: "Euglycaemic DKA", data: "SGLT2 inhibitor continued through dehydration; pH 7.12, BHB 5.8, glucose 212", plan: "Stop empagliflozin. Fixed-rate IV insulin 0.1 U/kg/h once K ≥3.3, with 10% dextrose from the start. Glargine reduced to 10 U.", targets: "Ketones fall ≥0.5 mmol/L/h; HCO3 rise ≥3 mmol/L/h; hourly glucose, 2-hourly ketones and VBG, 4-hourly K" },
      { problem: "Shock: hypovolaemic ± septic", data: "BP 88/54, lactate 3.2, urine 15 mL/h after 1 L", plan: "Balanced crystalloid 500 mL boluses, reassessing after each. Noradrenaline via a central line if MAP stays <65 after ~30 mL/kg.", targets: "MAP ≥65; urine ≥0.5 mL/kg/h; repeat lactate in 2 h" },
      { problem: "Febrile neutropenia (high risk)", data: "ANC 0.6, temp 37.9, procalcitonin 1.1", plan: "Piperacillin-tazobactam 4.5 g IV now, then renally adjusted extended infusion. Vancomycin only for line or skin infection, MRSA or persistent instability. Discuss G-CSF with Oncology. Neutropenic precautions.", targets: "Antibiotics given immediately; review cultures at 48–72 h" },
      { problem: "Grade 3 diarrhoea and mucositis", data: "8–10 stools a day, grade 3 mucositis, Mg 1.4", plan: "Capecitabine stopped pending DPYD. Octreotide 100–150 µg SC three times daily. Hold loperamide until C. difficile and GI PCR are negative. Mouth care; replace Mg and K.", targets: "Stool chart; Mg >2 mg/dL" },
      { problem: "AKI stage 2", data: "Creatinine 2.4 vs 1.02 baseline; urine 15 mL/h", plan: "Fluids as above. Hold telmisartan and metformin. Avoid contrast and NSAIDs. Renal replacement only for refractory acidosis, hyperkalaemia or overload.", targets: "Strict input/output; daily creatinine" },
      { problem: "Possible DPD deficiency", data: "Early severe toxicity; DPYD result never received", plan: "Chase the DPYD genotype and uridine triacetate availability today; inform the oncologist.", targets: "Result and decision today" },
    ],
    drugs: [
      { drug: "Capecitabine", action: "Stop", reason: "Severe toxicity; suspected DPD deficiency" },
      { drug: "Empagliflozin", action: "Stop", reason: "Euglycaemic DKA; do not restart during chemotherapy" },
      { drug: "Metformin", action: "Hold", reason: "AKI, lactate 3.2" },
      { drug: "Telmisartan", action: "Hold", reason: "Hypotension, AKI" },
      { drug: "Insulin glargine", action: "Adjust", reason: "Continue at 10 U for basal cover" },
      { drug: "IV insulin + 10% dextrose", action: "New", reason: "DKA, after K ≥3.3" },
      { drug: "Potassium chloride IV", action: "New", reason: "K 3.1" },
      { drug: "Magnesium sulfate IV", action: "New", reason: "Mg 1.4" },
      { drug: "Piperacillin-tazobactam", action: "New", reason: "Febrile neutropenia; renally adjusted" },
      { drug: "Octreotide", action: "New", reason: "Grade 3 diarrhoea" },
      { drug: "Loperamide", action: "Hold", reason: "Until C. difficile and GI PCR are negative" },
      { drug: "Uridine triacetate", action: "Request", reason: "Early severe fluoropyrimidine toxicity within 96 h" },
    ],
    sbar: {
      situation: "58-year-old man, day 10 of CAPOX cycle 1, admitted with euglycaemic DKA, hypovolaemic ± septic shock, febrile neutropenia and AKI stage 2.",
      background: "Stage IIIB sigmoid cancer resected 19 Aug. Type 2 diabetes on empagliflozin, continued through diarrhoea. DPYD result never received.",
      assessment: "pH 7.12, BHB 5.8, K 3.1, ANC 0.6, creatinine 2.4, MAP about 65 after 1 L.",
      recommendation: "Potassium then insulin with dextrose; antibiotics given; fluid boluses to MAP ≥65 and urine ≥0.5 mL/kg/h; noradrenaline if MAP <65 after 30 mL/kg; 2-hourly ketones and VBG, 4-hourly K; chase DPYD and uridine triacetate; escalate if GCS falls or K <3.0.",
    },
    family: "Mr Thomas is seriously unwell and is in intensive care. The chemotherapy tablets caused severe diarrhoea, which dried out his body and lowered his blood count. One of his diabetes tablets, taken while he was not eating, has made his blood acidic. We are giving fluids, insulin with a sugar drip, and antibiotics, and we have stopped the chemotherapy and that diabetes tablet. His kidneys are strained but should recover as he rehydrates. The next 24–48 hours are important. We will update you after the evening round.",
    questions: [
      { team: "Oncology", question: "Can the external lab release the DPYD result today? Is uridine triacetate available within the 96-hour window?" },
      { team: "Oncology", question: "G-CSF for high-risk febrile neutropenia: agree?" },
      { team: "Oncology", question: "Future adjuvant plan: fluoropyrimidine dose by DPYD genotype (CPIC), or an alternative?" },
      { team: "Endocrinology", question: "Diabetes regimen for the rest of chemotherapy without an SGLT2 inhibitor?" },
      { team: "Endocrinology", question: "How do we prevent sick-day-rule failures (written plan, phone check-ins each cycle)?" },
    ],
  },
};

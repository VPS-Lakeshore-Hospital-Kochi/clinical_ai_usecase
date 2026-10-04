import { obj, str, list } from "./schema.js";

// Clinician view: cardiac pre-op consult. The app scores RCRI and MACE estimates, runs the
// stepwise peri-operative pathway, and later checks post-op troponins for myocardial injury;
// Claude assesses the symptoms, recommends the test and drafts the medicine plan and team note.
export default {
  instructions: `Draft the cardiology pre-operative consult, as JSON (2024 AHA/ACC and 2022 ESC non-cardiac surgery guidelines). The app has scored RCRI, estimated MACE risk and run the stepwise pathway (listed); build on them and do not contradict them.
- bottomLine: fit / fit with plan / needs evaluation first, and whether surgery timing should change.
- symptoms: points on whether the symptoms suggest ischaemia and what else contributes.
- evaluation: the test, why this one, the timeline within the cancer-surgery window, and what result would change the plan.
- meds: drug | before surgery | day of surgery | after surgery | rationale (statin, RAS blocker, beta-blocker, antiplatelet, SGLT2 inhibitor, metformin, insulin, VTE prophylaxis).
- surveillance: post-operative troponin and ECG monitoring and triggers.
- prevention: long-term targets and follow-up.
- note: 4–6 lines for the surgical and anaesthesia teams.`,
  schema: obj({
    bottomLine: str(),
    symptoms: list(str()),
    evaluation: obj({ test: str(), why: str(), timeline: str(), changesPlan: str() }),
    meds: list(obj({ drug: str(), before: str(), day: str(), after: str(), rationale: str() })),
    surveillance: list(str()),
    prevention: list(str()),
    note: str(),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.consult || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    bottomLine: "Elevated-risk patient (RCRI 2) with new exertional chest heaviness and lateral ST depression. Expedited dobutamine stress echo this week; if there is no high-risk ischaemia, proceed on 19 Aug with the plan below. Testing should not push surgery beyond the MDT window.",
    symptoms: [
      "Exertional central heaviness relieved by rest within 5 minutes is typical of stable angina in a man with diabetes, hypertension, dyslipidaemia and a family history of premature coronary disease.",
      "Coronary calcification on the staging CT confirms atherosclerosis and raises the probability that the symptoms are ischaemic.",
      "Anaemia (Hb 9.8) can provoke demand ischaemia and may be contributing; IV iron was given on 6 Aug.",
      "1 mm horizontal ST depression in V5–V6 with LVH may be strain or ischaemia; there is no prior ECG to compare.",
      "These symptoms need evaluation whether or not he has surgery.",
    ],
    evaluation: {
      test: "Dobutamine stress echocardiogram",
      why: "Exercise capacity is limited by the knee, so a treadmill test would be non-diagnostic; stress echo avoids contrast and radiation and assesses LVH. CT coronary angiography is the alternative if a slot is sooner.",
      timeline: "Within 3–5 days, so the result is back well before 19 Aug",
      changesPlan: "High-risk ischaemia → invasive angiography and an MDT discussion weighing revascularisation against the cancer surgery. No or mild ischaemia → proceed on 19 Aug.",
    },
    meds: [
      { drug: "Atorvastatin", before: "Increase to 40 mg now (80 mg if CAD is confirmed)", day: "Continue", after: "Continue", rationale: "Plaque stabilisation; LDL 112 above target" },
      { drug: "Telmisartan", before: "Continue", day: "Hold (24 h before)", after: "Restart when euvolaemic and BP stable", rationale: "Reduces intra-operative hypotension" },
      { drug: "Beta-blocker", before: "Do not start now", day: "—", after: "Consider only if ischaemia is confirmed, titrated slowly", rationale: "POISE: harm when started close to surgery" },
      { drug: "Aspirin", before: "Do not start unless CAD is confirmed", day: "—", after: "Per stress-test result", rationale: "POISE-2: no benefit and more bleeding in primary prevention" },
      { drug: "Empagliflozin", before: "Hold from 16 Aug (≥3 days)", day: "Hold", after: "Restart when eating and drinking normally", rationale: "Euglycaemic DKA risk" },
      { drug: "Metformin", before: "Continue", day: "Hold", after: "Restart when eating and creatinine is stable", rationale: "Lactic acidosis risk if AKI" },
      { drug: "Insulin glargine", before: "Continue", day: "About 80% of the usual dose the night before", after: "Basal-bolus with correction", rationale: "Avoid hypoglycaemia while fasting" },
      { drug: "VTE prophylaxis", before: "—", day: "Mechanical", after: "Enoxaparin 40 mg daily, extended to 28 days", rationale: "Abdominal cancer surgery" },
    ],
    surveillance: [
      "hs-troponin at 24 h and 48 h after surgery (baseline 6 ng/L), per ESC 2022 for RCRI ≥1.",
      "ECG on post-operative day 1 and with any chest pain, hypotension or arrhythmia.",
      "A rise of more than 5 ng/L from baseline, or above 20 ng/L: cardiology review, aspirin and statin if not contraindicated, and outpatient ischaemia evaluation.",
      "Keep Hb ≥8–9 g/dL; lower threshold for transfusion if ischaemia is confirmed.",
    ],
    prevention: [
      "LDL <55 mg/dL if CAD is confirmed (<70 otherwise); add ezetimibe if not at target on a high-intensity statin.",
      "BP <130/80; continue the ARB and SGLT2 inhibitor for cardio-renal protection.",
      "Cardiology review 6–8 weeks after surgery, and before oxaliplatin-based chemotherapy if angina recurs.",
      "Use the stress-test result to plan the future knee replacement.",
    ],
    note: "Mr Varghese (RCRI 2) has new exertional chest heaviness with lateral ST depression. Dobutamine stress echo this week; if there is no high-risk ischaemia he may proceed on 19 Aug. Atorvastatin increased to 40 mg. Hold telmisartan 24 h and empagliflozin 3 days before surgery; do not start a beta-blocker. Please send hs-troponin at 24 h and 48 h and an ECG on POD 1, and call Cardiology for a rise or symptoms.",
  },
};

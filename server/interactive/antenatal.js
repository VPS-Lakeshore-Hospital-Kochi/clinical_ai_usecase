import { obj, str, list, oneOf } from "./schema.js";

const PROBLEMS = ["Blood pressure", "Gestational diabetes", "Anaemia", "Rhesus", "Fetal wellbeing"];

// Clinician view: antenatal visit against the whole pregnancy record. The app works out gestation,
// classifies BP, screens for pre-eclampsia, checks GDM targets and the anti-D schedule; Claude
// ranks the risks, drafts orders by problem and writes the patient copy.
export default {
  instructions: `Review this antenatal visit against the whole pregnancy record for the obstetrician, as JSON (NICE NG133, NICE NG3, RCOG/FOGSI). The app has computed gestation, the BP class, a pre-eclampsia screen, GDM targets and anti-D status (listed); build on them and do not contradict them. Check routine care that may have been missed, not only today's problem.
- flags: most urgent first, each with the action and timeframe.
- risks: condition | criteria | today's evidence | status.
- orders: specific orders grouped by problem (${PROBLEMS.join(", ")}), with doses and targets for the obstetrician to confirm.
- delivery: recommended timing and place of birth, and what would change the plan.
- patientCopy: warning signs in plain English, under 120 words, addressed to the mother.
- followUp: when | what | who.`,
  schema: obj({
    flags: list(obj({ title: str(), action: str(), timeframe: str() })),
    risks: list(obj({ condition: str(), criteria: str(), evidence: str(), status: oneOf(["ok", "warn", "fail"]) })),
    orders: list(obj({ problem: oneOf(PROBLEMS), order: str(), detail: str() })),
    delivery: obj({ timing: str(), place: str(), changesPlan: list(str()) }),
    patientCopy: str(),
    followUp: list(obj({ when: str(), what: str(), who: str() })),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.visit || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    flags: [
      { title: "New hypertension at 30+2 weeks with headache", action: "Exclude pre-eclampsia today in the day-assessment unit: BP series, PCR, bloods, sFlt-1/PlGF. Admit if BP ≥160/110, headache worsens or any severe feature appears.", timeframe: "Today" },
      { title: "Rh-negative, 28-week anti-D not documented", action: "Confirm it was not given; repeat antibody screen and give anti-D immunoglobulin 1500 IU. Record the partner's blood group.", timeframe: "Today" },
      { title: "GDM above target on NPH 8 U, AC 90th centile", action: "Increase NPH and add mealtime insulin before lunch; dietitian review", timeframe: "This week" },
      { title: "Moderate iron-deficiency anaemia, poor oral tolerance", action: "IV ferric carboxymaltose so Hb can rise before birth", timeframe: "This week" },
    ],
    risks: [
      { condition: "Gestational hypertension", criteria: "New BP ≥140/90 after 20 weeks", evidence: "142/92 and 144/94 today; 132/84 at 28 weeks; 118/74 at booking", status: "warn" },
      { condition: "Pre-eclampsia", criteria: "Hypertension plus PCR ≥0.3 or organ dysfunction", evidence: "PCR 0.28; platelets, ALT, creatinine normal; headache; mother had pre-eclampsia", status: "warn" },
      { condition: "Severe features", criteria: "BP ≥160/110, severe headache, visual symptoms, RUQ pain, platelets <100", evidence: "None today", status: "ok" },
      { condition: "GDM control", criteria: "Fasting <95, 1 hour after meals <140 mg/dL", evidence: "Fasting 98–105; 1 hour 150–165, worst after lunch", status: "fail" },
      { condition: "Fetal growth", criteria: "EFW and AC centiles", evidence: "EFW ~85th, AC 90th centile", status: "warn" },
      { condition: "Liquor", criteria: "AFI 5–24 cm", evidence: "22 cm", status: "ok" },
      { condition: "Anaemia", criteria: "Hb ≥11 g/dL in pregnancy", evidence: "Hb 9.6, ferritin 14", status: "fail" },
      { condition: "Rhesus prophylaxis", criteria: "Anti-D at 28 weeks if the partner is Rh-positive or unknown", evidence: "Not documented; partner's group not recorded", status: "fail" },
      { condition: "Aspirin prophylaxis", criteria: "Aspirin 75–150 mg daily from 12 weeks if risk factors", evidence: "Not started at booking (family history, BMI 29); too late to start now", status: "warn" },
    ],
    orders: [
      { problem: "Blood pressure", order: "Day-assessment unit today", detail: "BP series over 2–4 hours, repeat PCR, CBC, LFT, creatinine, sFlt-1/PlGF ratio" },
      { problem: "Blood pressure", order: "Labetalol 100 mg twice daily if BP stays ≥140/90", detail: "Target ≤135/85; nifedipine MR 10 mg twice daily if labetalol is unsuitable" },
      { problem: "Blood pressure", order: "Home BP twice daily", detail: "Call the unit if ≥150/100 or any warning sign" },
      { problem: "Gestational diabetes", order: "NPH 8 → 10 U at bedtime", detail: "Titrate by 2 U every 3 days to fasting <95 mg/dL" },
      { problem: "Gestational diabetes", order: "Insulin aspart 4 U before lunch", detail: "For 1-hour readings above 140; dietitian review of the rice portion" },
      { problem: "Anaemia", order: "IV ferric carboxymaltose", detail: "Dose by weight per unit protocol; recheck Hb and ferritin in 3–4 weeks; pause oral iron" },
      { problem: "Rhesus", order: "Antibody screen, then anti-D immunoglobulin 1500 IU IM", detail: "Record the partner's blood group; cord blood group at birth" },
      { problem: "Fetal wellbeing", order: "Growth scan with Doppler every 2 weeks", detail: "Counsel on fetal movements; steroids only if birth before 34+6 becomes likely" },
    ],
    delivery: {
      timing: "37+0 to 38+6 weeks if blood pressure stays controlled and GDM is managed on insulin",
      place: "VPS Lakeshore, with obstetric, neonatal and anaesthetic cover",
      changesPlan: ["Pre-eclampsia with severe features or fetal compromise: earlier birth, steroids, magnesium sulfate", "Accelerating fetal growth or polyhydramnios: review timing and mode", "Previous vaginal birth favours planned vaginal birth; review mode at 36 weeks"],
    },
    patientCopy: "Fathima, your blood pressure is higher than before. We need to check it is not the start of pre-eclampsia, which can affect you and the baby. Come to the hospital straight away if you have a bad headache that paracetamol does not help, blurred vision or flashing lights, pain under your ribs on the right or vomiting, sudden swelling of your face or hands, fewer baby movements, or bleeding or fluid from the vagina. Check your sugar four times a day and your blood pressure twice a day, and bring your records to every visit.",
    followUp: [
      { when: "Today", what: "Day-assessment unit; antibody screen; anti-D", who: "Obstetrics / midwife" },
      { when: "2–3 days", what: "BP and glucose review; labetalol and insulin titration", who: "Obstetrics" },
      { when: "This week", what: "IV iron; dietitian", who: "Day care / nutrition" },
      { when: "Weekly", what: "Antenatal visit with BP, urine and glucose log", who: "Obstetrics" },
      { when: "Every 2 weeks", what: "Growth scan and Doppler", who: "Fetal medicine" },
      { when: "36 weeks", what: "Plan the timing and mode of birth", who: "Obstetrics" },
    ],
  },
};

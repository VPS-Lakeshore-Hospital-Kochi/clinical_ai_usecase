import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: remote-care alert queue. The app runs threshold and trend rules on the home
// readings as they arrive; Claude triages the combination with the patient's message.
export default {
  instructions: `Triage this home-monitoring episode for the remote-care nurse, as JSON. The app has run single-reading thresholds and trend rules (listed); judge the combination and tie it to the recent history. Never advise the patient to start, stop or change a medicine, except to hold one the care team has already told them to hold.
- alerts: priority, signal, trend and action for each signal.
- interpretation: the most likely explanation, the differential and why it matters for this patient.
- escalation: who, how fast, where the patient should be seen, the tests, and who else to notify.
- reply: WhatsApp reply under 120 words that answers the patient's question directly.
- script: 5–7 call questions, each with the answer that upgrades to Emergency.
- monitoring: threshold or frequency changes until this resolves.`,
  schema: obj({
    alerts: list(obj({ priority: oneOf(["Act today", "Review within 48 h", "No action"]), signal: str(), trend: str(), action: str() })),
    interpretation: obj({ likely: str(), differential: list(str()), why: str() }),
    escalation: obj({ who: str(), where: str(), tests: list(str()), notify: list(str()) }),
    reply: str(),
    script: list(obj({ question: str(), upgradeIf: str() })),
    monitoring: list(str()),
  }),
  toText(payload) {
    const rules = (payload.appAlerts || []).map((a) => `- ${a}`);
    return `${payload.context || ""}\n\nApp rules fired:\n${rules.join("\n") || "- none"}`;
  },
  demo: {
    alerts: [
      { priority: "Act today", signal: "Loose stools", trend: "1 → 3 → 5 a day, with cramps", action: "Same-day review; stool C. difficile test" },
      { priority: "Act today", signal: "Heart rate", trend: "86 → 104 over 48 h", action: "Part of a dehydration or infection picture" },
      { priority: "Act today", signal: "Blood pressure", trend: "118/72 → 102/64, with telmisartan already held", action: "Falling without any BP medicine" },
      { priority: "Act today", signal: "Temperature", trend: "37.0 → 37.9 °C, rising steadily", action: "Recently neutropenic: blood count today" },
      { priority: "Act today", signal: "Weight", trend: "81.4 → 80.2 kg in 38 h", action: "About 1.2 kg fluid loss" },
      { priority: "Review within 48 h", signal: "Glucose after meals", trend: "238 → 281", action: "Endocrinology review; may reflect illness" },
      { priority: "No action", signal: "Fasting glucose", trend: "164–172", action: "No hypoglycaemia" },
    ],
    interpretation: {
      likely: "Clostridioides difficile infection: 5 days of piperacillin-tazobactam ended 24 Sep, and the negative test on 20 Sep was taken before antibiotics, so it does not exclude infection now.",
      differential: ["Delayed or persistent fluoropyrimidine toxicity (possible DPD deficiency; last dose 19 Sep)", "Other infective colitis", "Early recurrent dehydration"],
      why: "He had AKI 7 days ago (creatinine still 1.3), ketoacidosis triggered by dehydration, and neutropenia. Another episode of dehydration could quickly repeat the ICU admission. Loperamide must not be taken until C. difficile is excluded: slowing the bowel risks toxic megacolon.",
    },
    escalation: {
      who: "Remote-care nurse calls the patient now; inform the on-call oncology registrar within 30 minutes",
      where: "Same-day assessment in the oncology day-care unit today, or the Emergency Department after hours or with any red answer",
      tests: ["Stool C. difficile (GDH/toxin or PCR per lab protocol)", "CBC with ANC", "Creatinine and electrolytes including K and Mg", "Venous gas and ketones (DKA 7 days ago)", "CRP; lactate if hypotensive"],
      notify: ["Endocrinology: glucose trend and ketone check", "Nephrology if creatinine has risen"],
    },
    reply: "Thank you for telling us, Mr Thomas. Please do not take the loperamide for now. After the antibiotics you had in hospital, this diarrhoea needs a stool test first, and loperamide can make some infections worse. Your readings show your body is losing fluid. A nurse will call you in the next few minutes, and we would like to see you today at the hospital. Until then, keep sipping ORS or kanji water, and continue your insulin. Go straight to Emergency if you feel faint, are confused, have severe stomach pain, pass blood, or cannot keep fluids down.",
    script: [
      { question: "How many loose stools since morning? Any blood or black stool?", upgradeIf: "Blood or black stool" },
      { question: "Stomach pain: where, and how bad (0–10)? Is your stomach swollen?", upgradeIf: "Severe pain or a swollen stomach" },
      { question: "Are you dizzy when you stand, or have you fainted?", upgradeIf: "Yes: do not drive" },
      { question: "When did you last pass urine, and how much?", upgradeIf: "None in 8 hours" },
      { question: "Can you drink and keep fluids down?", upgradeIf: "No" },
      { question: "What is your temperature now?", upgradeIf: "38.0 °C or higher (recent neutropenia)" },
      { question: "What was your last sugar? Do you have ketone strips?", upgradeIf: "Ketones ≥1.5, or sugar >300 with vomiting" },
    ],
    monitoring: [
      "Vitals every 4 hours while awake for 72 h, with a stool count at each reading and temperature at night",
      "Lower alert thresholds for this episode: HR ≥100, SBP <105, temperature ≥37.8 °C, ≥3 loose stools a day, weight loss ≥1 kg in 24 h",
      "Pause the rehab coach's exercise sessions until diarrhoea settles; resume at the week-1 level",
      "Daily ketone check while glucose runs above 250",
    ],
  },
};

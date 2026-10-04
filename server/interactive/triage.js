import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: WhatsApp intake conversation → triage card for the nurse.
export default {
  instructions: `Triage the WhatsApp intake conversation below. Return the triage decision as JSON for the triage nurse's console.
- urgency: one disposition. redFlags: every screened red flag with the patient's answer and a status.
- concerns: what the receiving doctor must not miss, including problems the patient did not ask about.
- reply: WhatsApp-length (under 120 words), plain English, with the appointment plan and "go to Emergency now if..." safety-netting. Never diagnose or change medicines in the reply.`,
  schema: obj({
    urgency: oneOf(["Emergency now", "Same day", "Within 1 week", "Routine"]),
    urgencyReason: str("One sentence"),
    redFlags: list(obj({ flag: str(), answer: str(), status: oneOf(["absent", "present", "unknown"]) })),
    concerns: list(str()),
    routing: obj({ department: str(), appointmentType: str(), why: str(), later: list(str()) }),
    preVisit: list(str()),
    callBack: str("Nurse call-back plan, or empty string if none"),
    reply: str(),
    flags: list(str("Short front-desk flag")),
  }),
  toText(payload) {
    const lines = (payload.conversation || []).map((m) => `${m.from === "patient" ? "Patient" : "Lakeshore Care (automated intake)"}: ${m.text}`);
    return `Channel: WhatsApp (Lakeshore Care line). Matched record: ${payload.mrn || "unknown"}. Preferred slot: ${payload.slotPreference || "not stated"}.\n\n${lines.join("\n")}`;
  },
  // Offline sample for the "chest pain" variation of the same patient.
  demoFor(payload) {
    return payload?.scenario === "chest-pain" ? CHEST_PAIN : this.demo;
  },
  demo: {
    urgency: "Within 1 week",
    urgencyReason: "No emergency features, but recurrent night-time hypoglycaemia on a sulfonylurea plus insulin and unexplained weight loss need prompt specialist review.",
    redFlags: [
      { flag: "Chest pain or breathlessness at rest", answer: "No", status: "absent" },
      { flag: "Confusion or drowsiness", answer: "No", status: "absent" },
      { flag: "Vomiting, unable to keep fluids down", answer: "No", status: "absent" },
      { flag: "Hypoglycaemia (<70 mg/dL)", answer: "Lowest 58 mg/dL at 3 AM, self-treated with juice", status: "present" },
      { flag: "Very high sugar with symptoms (>400, vomiting)", answer: "Post-meal 250–300, no vomiting", status: "absent" },
      { flag: "Blood in stool or black stools", answer: "Not noticed", status: "absent" },
      { flag: "Fever", answer: "No", status: "absent" },
      { flag: "Unintentional weight loss", answer: "About 4 kg in 6 months", status: "present" },
    ],
    concerns: [
      "Recurrent nocturnal hypoglycaemia (around 3 AM) on glimepiride plus glargine 16 units: risk of a severe episode before the appointment.",
      "Unintentional weight loss of about 4 kg with marked tiredness: needs evaluation beyond diabetes, starting with a blood count.",
      "Daily aceclofenac with diabetes: kidney and stomach-bleeding risk.",
      "Knee pain limits walking. Orthopaedic referral is likely, but the diabetes review comes first.",
    ],
    routing: {
      department: "Endocrinology OPD",
      appointmentType: "New-problem slot within 1 week, morning",
      why: "Endocrinology covers both the hypoglycaemia and the weight-loss work-up.",
      later: ["Orthopaedics, referred by the endocrinologist after the medical review"],
    },
    preVisit: [
      "Fasting blood tests on the morning of the visit (diabetes return-visit protocol): HbA1c, fasting glucose, creatinine/eGFR, CBC",
      "Bring the glucometer and any written readings",
      "Bring all medicine strips, including the knee tablet, and last year's reports",
    ],
    callBack: "Nurse call-back within 24 hours with hypoglycaemia safety advice, because lows are recurring.",
    reply: "Thank you, Mr. Thomas. We have booked you with our diabetes specialist (Endocrinology) this week, on a morning slot. Please come fasting so we can do blood tests first, and bring your sugar meter and all your medicines, including the knee tablet. A nurse will call you tomorrow about the night-time low sugars. If your sugar falls below 70, take 3 teaspoons of sugar in water and recheck after 15 minutes.\n\nGo to Emergency now, or call 108 for an ambulance, if you have chest pain, breathlessness, confusion, fainting, vomiting blood or black stools, or a low sugar that does not improve.",
    flags: ["Recurrent hypoglycaemia", "Unintentional weight loss", "Daily NSAID"],
  },
};

const CHEST_PAIN = {
  urgency: "Emergency now",
  urgencyReason: "Central chest pressure at rest for 40 minutes, spreading to the left arm, with sweating and nausea, in a 58-year-old with diabetes and hypertension: possible acute coronary syndrome.",
  redFlags: [
    { flag: "Chest pain or pressure at rest", answer: "Yes: heavy pressure for 40 minutes, going to the left arm", status: "present" },
    { flag: "Breathlessness at rest", answer: "A little", status: "present" },
    { flag: "Sweating, nausea or fainting", answer: "Sweating a lot, feels sick", status: "present" },
    { flag: "Confusion or drowsiness", answer: "No", status: "absent" },
    { flag: "Hypoglycaemia (<70 mg/dL)", answer: "Sugar 190 mg/dL now", status: "absent" },
    { flag: "Blood in stool or black stools", answer: "Not noticed", status: "absent" },
    { flag: "Fever", answer: "No", status: "absent" },
  ],
  concerns: [
    "Possible acute coronary syndrome: ECG within 10 minutes of arrival and troponin; diabetes can blunt typical symptoms, so do not be reassured by a normal sugar.",
    "Father had a heart attack at 66; known hypertension, dyslipidaemia and type 2 diabetes.",
    "Takes aceclofenac most days: an NSAID raises cardiovascular and bleeding risk. Tell the ED team.",
    "The weight loss and night-time lows from his earlier messages still need follow-up once he is safe.",
  ],
  routing: {
    department: "Emergency Department",
    appointmentType: "Ambulance now (108); ED pre-alert",
    why: "Symptoms suggest a possible heart attack. This cannot wait for a clinic appointment.",
    later: ["Endocrinology follow-up for diabetes, lows and weight loss once the emergency is managed"],
  },
  preVisit: [
    "Pre-alert the ED: 58-year-old man, suspected ACS, ETA by ambulance",
    "Ask the family to bring his medicine strips and glucometer",
  ],
  callBack: "Nurse calls now and stays on the line until the ambulance is confirmed.",
  reply: "Mr Thomas, your symptoms could be a heart problem and need emergency care now. Please call 108 for an ambulance straight away, or ask your family to take you to the nearest Emergency Department. Do not drive yourself. Sit down and rest while you wait. A nurse from Lakeshore is calling you right now.",
  flags: ["Suspected ACS", "Diabetes", "Daily NSAID"],
};

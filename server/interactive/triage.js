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

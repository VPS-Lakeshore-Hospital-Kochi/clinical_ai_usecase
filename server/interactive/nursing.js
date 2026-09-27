import { obj, str, list, oneOf, bool } from "./schema.js";

// Clinician view: live observation chart (NEWS2 scored by the app) → Claude reads the trend and drafts the handover.
export default {
  instructions: `The app has already scored NEWS2 (RCP 2017, SpO2 scale 1) for each set of observations below; use those scores. Read the trend with the fluid balance and nursing notes, and return JSON for the nurse's handover panel.
- escalate: whether to call now rather than wait for handover, who, how fast (per the NEWS2 response thresholds) and why.
- differential: causes to consider at this point after surgery, most likely first, with what supports and argues against each.
- sbar: short Situation, Background, Assessment, Recommendation.
- tasks: the day shift's timed task list. gaps: what the night shift's protocol required that is not documented.`,
  schema: obj({
    escalate: obj({ now: bool(), who: str(), howFast: str(), why: str() }),
    differential: list(obj({ cause: str(), likelihood: oneOf(["Most likely", "Possible", "Less likely"]), supports: str(), against: str() })),
    sbar: obj({ situation: str(), background: str(), assessment: str(), recommendation: str() }),
    tasks: list(obj({ time: str(), task: str() })),
    gaps: list(str()),
  }),
  toText(payload) {
    const rows = (payload.obs || []).map((o) => `- ${o.time}: RR ${o.rr}, SpO2 ${o.spo2}%, ${o.oxygen ? "on oxygen" : "air"}, BP ${o.sbp}/${o.dbp}, HR ${o.hr}, ${o.avpu === "A" ? "Alert" : o.avpu}, temp ${o.temp} → NEWS2 ${o.news2} (${o.breakdown})`);
    return `Observation chart (NEWS2 calculated by the app):\n${rows.join("\n")}\n\nNursing record:\n${payload.notes || ""}`;
  },
  demo: {
    escalate: {
      now: true,
      who: "Surgical doctor on call, and the nurse in charge",
      howFast: "Now: urgent response, medical review within the hour, observations at least hourly",
      why: "NEWS2 is 6 at 06:00 (5–6 triggers an urgent response) and has risen 0 → 1 → 4 → 6 in 10 hours, with urine output of about 18 mL/h. Waiting 90 minutes for handover is not safe. The 04:00 score of 4 was not escalated.",
    },
    differential: [
      { cause: "Hypovolaemia / under-filling", likelihood: "Most likely", supports: "Urine 180 mL in 10 h (about 0.2 mL/kg/h) on only 60 mL/h IV fluid; heart rate rising, BP falling", against: "Drain output modest; no bleeding seen" },
      { cause: "Basal atelectasis from pain and shallow breathing", likelihood: "Most likely", supports: "RR rising, SpO2 falling, pain 6/10 on movement, incentive spirometer not used", against: "No chest findings recorded yet" },
      { cause: "Early anastomotic leak or intra-abdominal sepsis", likelihood: "Possible", supports: "Tachycardia with rising temperature after bowel surgery", against: "Day 1 is early; drain serosanguinous. Check abdomen, lactate, CRP" },
      { cause: "Cardiac event", likelihood: "Possible", supports: "RCRI 2; troponin due at 08:00; no ECG since theatre", against: "No chest pain recorded. Do an ECG now" },
      { cause: "Pulmonary embolism", likelihood: "Less likely", supports: "Hypoxia and tachycardia", against: "On enoxaparin; day 1. Reconsider if hypoxia worsens" },
    ],
    sbar: {
      situation: "Mr Thomas Varghese, 58, bed 12, day 1 after laparoscopic anterior resection. NEWS2 6 at 06:00, up from 0 overnight, with low urine output.",
      background: "Stage III sigmoid cancer. Type 2 diabetes on basal-bolus insulin (empagliflozin stopped 14 Aug). RCRI 2 with a negative stress echo. Sulfonamide allergy. Neuropathy and knee osteoarthritis (falls risk).",
      assessment: "RR 22, SpO2 93% on air, BP 106/66, HR 108, temp 37.8, alert. Urine 180 mL over 10 h. Drain 120 mL serosanguinous. Pain 6/10 on movement. Glucose 276 and rising. Likely hypovolaemia plus atelectasis; leak and cardiac causes not yet excluded.",
      recommendation: "Urgent medical review now. Fluid bolus if the doctor agrees; ECG, lactate, venous gas with ketones, FBC, U&E, CRP, troponin with the bloods; oxygen to keep SpO2 94–98%; analgesia review; hourly observations and urine output; recalculate NEWS2 after each intervention.",
    },
    tasks: [
      { time: "06:30", task: "Doctor review; ECG; bloods including lactate, ketones and troponin" },
      { time: "Hourly", task: "Observations and NEWS2 with urine output until NEWS2 is below 5 for 4 hours" },
      { time: "As prescribed", task: "Fluid bolus or new IV rate; target urine at least 44 mL/h (0.5 mL/kg/h)" },
      { time: "2-hourly", task: "Capillary glucose while above 250; correction insulin per chart; ketones" },
      { time: "Hourly while awake", task: "Incentive spirometer, 10 breaths; sit up; chest physiotherapy referral" },
      { time: "08:00", task: "hs-troponin (24 h) if not sent at 06:30; 48 h troponin tomorrow" },
      { time: "4-hourly", task: "Drain volume and character; report if turbid, faeculent or above 100 mL/h" },
      { time: "20:00", task: "Enoxaparin 40 mg SC; stockings on" },
      { time: "Today", task: "Mobilise with physiotherapy and stick (falls risk)" },
    ],
    gaps: [
      "04:00 NEWS2 of 4: informing the nurse in charge and increasing observation frequency not documented",
      "06:00 NEWS2 not calculated, and escalation deferred to handover",
      "Hourly urine output not charted despite low totals",
      "Ketones not checked with glucose above 250 after recent SGLT2 inhibitor use",
      "Correction insulin given only once despite rising glucose at 02:00 and 06:00",
      "Incentive spirometry not encouraged or recorded",
    ],
  },
};

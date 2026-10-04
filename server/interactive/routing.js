import { obj, str, list, oneOf } from "./schema.js";

const URGENCY = ["Emergency", "Same day", "≤1 week", "Routine"];

// Clinician view: front-office routing queue. The app screens each request for red flags, finds
// duplicates by phone number and checks every proposed slot against the live roster; Claude
// routes the queue and drafts the escalation scripts and replies. Staff confirm each booking.
export default {
  instructions: `Route this morning's front-office queue against today's roster, as JSON. The app has screened each request for red flags and found duplicates (listed); build on them. Any request that could be an emergency is escalated to a nurse for an immediate call and routed to an emergency service, never booked into a clinic. Route only to roster slot ids that are listed; respect leave and capacity.
- escalations: requests needing an immediate nurse call, with the reason and the script's key line.
- routes: one row per request (merge duplicates onto the first request), with urgency, slotId from the roster, pre-visit preparation and reason.
- duplicates: merged request ids and what to do.
- dataIssues: missing details to collect, per request.
- capacity: pressure points in the roster and how to use free slots.
- replies: short WhatsApp-style replies for two routine requests, in plain English.`,
  schema: obj({
    escalations: list(obj({ request: str(), why: str(), script: str() })),
    routes: list(obj({ request: str(), urgency: oneOf(URGENCY), slotId: str(), prep: str(), reason: str() })),
    duplicates: list(obj({ requests: list(str()), action: str() })),
    dataIssues: list(obj({ request: str(), issue: str() })),
    capacity: list(str()),
    replies: list(obj({ request: str(), text: str() })),
  }),
  toText(payload) {
    const q = (payload.queue || []).map((r) => `${r.id} (${r.channel}, ${r.at}, ${r.from}${r.phone ? `, phone ${r.phone}` : ", no phone"}): "${r.text}"`);
    const ro = (payload.roster || []).map((s) => `- ${s.id}: ${s.service}, ${s.clinician}, ${s.when}, ${s.leave ? "ON LEAVE" : s.free == null ? "open 24 h" : `${s.free} free`}`);
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `Unrouted queue, 25 Sep 2026, 08:30 (synthetic, anonymised):\n${q.join("\n")}\n\nToday's roster (slot ids):\n${ro.join("\n")}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    escalations: [
      { request: "R2", why: "Sudden worst-ever headache with vomiting: possible subarachnoid haemorrhage", script: "Please come to our Emergency Department now, or call 108. Do not wait for a clinic appointment and do not drive yourself." },
      { request: "R9", why: "34 weeks pregnant with face and hand swelling and headache: possible pre-eclampsia", script: "Please come to the obstetric assessment unit now so we can check your blood pressure and urine. Come straight away if the headache is severe, your vision changes or you have pain under your ribs." },
      { request: "R4", why: "Thirst, bedwetting and weight loss in a 6-year-old: possible new type 1 diabetes, risk of DKA", script: "Please bring him to the paediatric department today for a finger-prick sugar test. Go to paediatric emergency at once if he is vomiting, breathing fast, drowsy or has tummy pain." },
    ],
    routes: [
      { request: "R2", urgency: "Emergency", slotId: "ED", prep: "—", reason: "Thunderclap headache; do not book neurology OPD" },
      { request: "R9", urgency: "Emergency", slotId: "OBS-DAU", prep: "Bring the antenatal card", reason: "Possible pre-eclampsia" },
      { request: "R4", urgency: "Same day", slotId: "PAED-OPD", prep: "Capillary glucose and urine ketones on arrival", reason: "Polyuria, polydipsia and weight loss" },
      { request: "R1", urgency: "≤1 week", slotId: "GI2-TODAY", prep: "CBC and ferritin; colonoscopy pre-assessment; list of blood thinners", reason: "Rectal bleeding and weight loss at 72: suspected colorectal cancer pathway (Consultant 1 on leave)" },
      { request: "R5", urgency: "≤1 week", slotId: "BREAST-MON", prep: "Same-day mammogram and ultrasound ± biopsy", reason: "Hard breast lump at 58: suspected cancer pathway; Thursday clinic full" },
      { request: "R6", urgency: "Same day", slotId: "CARD-RAC", prep: "ECG on arrival", reason: "Exertional chest tightness in a diabetic. Advise ED if pain comes at rest, lasts over 15 minutes, or with sweating or breathlessness" },
      { request: "R7", urgency: "Routine", slotId: "TX-COORD", prep: "LFTs, INR, imaging, endoscopy and discharge summaries", reason: "Liver transplant second opinion" },
      { request: "R3", urgency: "Routine", slotId: "ORTHO-TUE", prep: "Bring the X-ray (standing views if older than 6 months); diabetes status", reason: "Knee replacement opinion (merged with R8)" },
    ],
    duplicates: [{ requests: ["R3", "R8"], action: "Same phone number and request: one booking, one reply" }],
    dataIssues: [
      { request: "R1", issue: "Collect the father's name, blood thinners and any previous colonoscopy" },
      { request: "R5", issue: "GP letter has no patient phone number: call the GP clinic today" },
      { request: "R7", issue: "Check whether the mother is an inpatient elsewhere; urgency may be higher than stated" },
    ],
    capacity: [
      "Gastroenterology is at half capacity until 30 Sep: today's only slot goes to R1; hold Monday's slots for further suspected-cancer referrals.",
      "Breast clinic is full this week: Monday's overflow slot goes to R5. Tell the unit head if more suspected-cancer referrals arrive.",
      "Neurology has 2 free slots today, but R2 must not use one.",
      "The rapid-access chest-pain clinic has spare capacity today: suitable for R6.",
    ],
    replies: [
      { request: "R3", text: "Namaskaram. We have booked your knee consultation at our joint-replacement clinic on Tuesday 30 September at 10:30 am. Please bring your X-ray and a list of your medicines. Reply 1 to confirm or 2 to change the time." },
      { request: "R7", text: "Thank you for contacting VPS Lakeshore. Our liver transplant coordinator will call you within 24 hours to arrange the clinic visit. Please keep your mother's recent reports ready. If she becomes confused, vomits blood or is very drowsy, take her to the nearest emergency department immediately." },
    ],
  },
};

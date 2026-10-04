import { obj, str, int, list } from "./schema.js";

// Clinician view: home rehab coach after the ICU stay. The app runs the pre-session traffic
// light on each daily check-in; Claude drafts the targets, the six-week plan, the check-in
// questions, the reply to today's message and the physiotherapist summary fields.
export default {
  instructions: `Draft the six-week home rehabilitation plan for the supervising physiotherapist, as JSON. The app runs the pre-session traffic light on each daily check-in (thresholds and today's result listed); keep every rule and exercise consistent with it and with the stated limits.
- targets: measure | today | 6-week target.
- plan: one row per week (1–6) with aerobic, strength, balance and notes; knee-friendly and fitted around chemotherapy if it resumes.
- questions: the 4–6 daily check-in questions.
- reply: reply to the patient's first message, warm and plain, under 120 words, with tomorrow's session consistent with the traffic light.
- weekly: what the physiotherapist's weekly summary reports and when to escalate.
- goals: how the plan links to the church walk and to preparing for the knee replacement.`,
  schema: obj({
    targets: list(obj({ measure: str(), today: str(), target: str() })),
    plan: list(obj({ week: int(), aerobic: str(), strength: str(), balance: str(), notes: str() })),
    questions: list(str()),
    reply: str(),
    weekly: list(str()),
    goals: list(str()),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.assessment || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    targets: [
      { measure: "6-minute walk", today: "240 m (1 stop)", target: "330–360 m, no stops" },
      { measure: "30-second sit-to-stand", today: "7 (with arms)", target: "11–12 without arms" },
      { measure: "Grip strength", today: "26 kg", target: "≥30 kg" },
      { measure: "Right knee pain on walking", today: "6/10", target: "≤4/10" },
      { measure: "Knee extension deficit", today: "−10°", target: "−5° or better" },
      { measure: "Tandem stance", today: "6 s", target: "20 s" },
      { measure: "Continuous walking", today: "About 5 min", target: "20–30 min" },
      { measure: "Clinical Frailty Scale", today: "5", target: "4" },
    ],
    plan: [
      { week: 1, aerobic: "Walk 5 min × 3 a day on flat ground with the stick; bike 5 min, no resistance", strength: "Seated knee straightening, ankle pumps, heel slides: 10 each, twice daily", balance: "Feet together at the kitchen counter, 3 × 20 s", notes: "Rest days allowed; bathroom night light and a mat now" },
      { week: 2, aerobic: "Walk 8 min × 3 a day; bike 8 min", strength: "Sit-to-stand from a high chair 2 × 6; straight-leg raises 2 × 10", balance: "Semi-tandem stance at the counter 3 × 20 s", notes: "Knee extension stretch (heel on a stool) 2 min, twice daily" },
      { week: 3, aerobic: "Walk 12 min × 2 a day; bike 10 min, light resistance", strength: "Sit-to-stand 2 × 8; wall push-ups 2 × 8; step-ups on the bottom stair 2 × 6", balance: "Tandem stance at the counter 3 × 15 s", notes: "0.5 kg ankle weight only if knee pain is 4 or less" },
      { week: 4, aerobic: "Walk 15 min × 2 a day, including a gentle slope", strength: "Sit-to-stand 3 × 8 without arms; bridges 2 × 10", balance: "Tandem walking along the counter, 3 lengths", notes: "Chemotherapy may restart: on days 1–5 of each cycle, drop back to week 2" },
      { week: 5, aerobic: "Walk 20 min once a day + bike 10 min", strength: "Resistance band for thighs and arms 2 × 10 (only if platelets ≥100)", balance: "Single-leg stance at the counter 3 × 10 s each side", notes: "6-minute walk test at home with the coach" },
      { week: 6, aerobic: "Walk 25–30 min, or the route to church and back", strength: "Continue at 3 × 10", balance: "Eyes-closed balance at the counter, only if steady", notes: "Repeat the formal physiotherapy assessment" },
    ],
    questions: [
      "Temperature this morning?",
      "Loose stools since yesterday: how many?",
      "Fasting sugar?",
      "Knee pain 0–10, and yesterday's walking minutes?",
      "Any dizziness, falls or chest symptoms?",
      "Energy 0–10?",
    ],
    reply: "Welcome home, Mr Thomas. Five minutes to the gate on your first evening is a good start. Feeling weak after an ICU stay is normal, and strength comes back week by week. Tomorrow: walk 5 minutes three times (morning, after lunch, after dinner) on flat ground with your stick. Twice in the day, sit and straighten each knee 10 times. Stand at the kitchen counter for 20 seconds, 3 times. Your sugar of 212 is fine for exercise, and walking after meals helps bring it down. Please use a night light on the way to the bathroom, and message me each morning with your temperature, stools, sugar and knee pain.",
    weekly: [
      "Report every Sunday: walking minutes per day, sit-to-stand count, knee pain trend, amber and red days and why, falls, fasting glucose range.",
      "Escalate within 24 h: any red day, walking minutes falling 3 days in a row, a new fall, or knee swelling.",
      "Adjust the targets once the oncology re-plan dates are known (lighter weeks around each cycle).",
    ],
    goals: [
      "Church walk: the week-6 target (25–30 minutes) matches the distance he describes.",
      "Knee replacement: stronger thigh muscles and better knee extension before surgery predict a faster recovery; the repeat walk test and sit-to-stand give the orthopaedic team objective baselines.",
    ],
  },
};

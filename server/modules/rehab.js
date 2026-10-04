export default {
  id: "rehab",
  order: 12,
  title: "Rehab Coach",
  specialty: "Physiotherapy",
  stage: "recovery",
  date: "2026-09-25",
  summary:
    "Turns the physiotherapy assessment at discharge into a home rehab plan that respects the knee, the neuropathy, blood counts and upcoming chemotherapy, with daily check-in rules and a coaching conversation.",
  claudeRole: "Builds the plan, sets the safety rules and runs the daily check-ins. The physiotherapist sets the targets and reviews weekly.",
  inputLabel: "Discharge physiotherapy assessment",
  inputHint: "Assessment scores, limits and goals from the ward physiotherapist, plus the patient's first check-in message.",
  outputLabel: "Draft rehab plan & first check-in",
  system: `Task: home rehabilitation coach after a hospital stay, supervised by a physiotherapist.

Keep every exercise safe for the stated limits. Tie each safety rule to a measurable trigger. Produce in order:
1. "## Starting point": a table of measure | today | 6-week target, from the assessment.
2. "## Safety rules (check before every session)": a traffic-light table (🟢 go / 🟠 go gently / 🔴 skip and call) with specific triggers covering blood counts, fever, glucose, diarrhoea or dehydration, chest symptoms, knee pain, dizziness and falls.
3. "## Six-week plan": a table of week | aerobic | strength | balance | notes, progressing gradually, knee-friendly and fitted around chemotherapy cycles if they resume.
4. "## Daily check-in": the 4–6 questions the coach asks each day and how answers change that day's session.
5. "## Reply to today's check-in": respond to the patient's first message in warm, plain English, under 120 words, with today's session.
6. "## Weekly summary for the physiotherapist": which fields to report and when to escalate.
7. "## Longer-term goals": how this plan links to returning to church walks and to preparing for the future knee replacement.`,
  buildPrompt: (input) => `Assessment and first check-in:\n\n${input}`,
  defaultInput: `Physiotherapy discharge assessment, 25 Sep 2026 (after ICU and ward stay, 20–25 Sep).
Admission: euglycaemic DKA, neutropenic sepsis and AKI during chemotherapy cycle 1. Now eating, mobilising with a walking stick.
Latest bloods (24 Sep): ANC 1.9, platelets 142, Hb 10.1, creatinine 1.3, K 4.0. Stool C. difficile PCR negative on 20 Sep. Piperacillin-tazobactam 20–24 Sep.
Glucose: insulin glargine 12 U; metformin and empagliflozin stopped; home glucose checks twice daily.
Chemotherapy: on hold; Oncology will re-plan at a genotype-guided dose (DPYD*2A) in 3–4 weeks.
Measures:
- 6-minute walk: 240 m, with stick, stopped once (knee pain and breathlessness)
- 30-second sit-to-stand: 7 (uses arms)
- Grip strength (dominant): 26 kg
- Right knee pain on walking: 6/10; flexion 100°, extension lacks 10°
- Balance: tandem stance 6 s; reduced sensation in both feet (diabetic neuropathy)
- Clinical Frailty Scale: 5 (mildly frail)
- Falls: none, but reports unsteadiness in the bathroom at night
Home: two-storey house, bedroom upstairs (14 steps with rail). Wife at home. Has a stationary exercise bike (unused).
Goal (patient's words): "Walk to church again and be strong for the knee operation."
First check-in message (WhatsApp, 25 Sep, 19:10): "Reached home. Legs feel very weak, knee pain 6. Walked to the gate and back, about 5 minutes. Sugar 212 before dinner. What should I do tomorrow?"`,
  demoOutput: `## Starting point
| Measure | Today | 6-week target |
|---|---|---|
| 6-minute walk | 240 m (1 stop) | 330–360 m, no stops |
| 30-s sit-to-stand | 7 (with arms) | 11–12 without arms |
| Grip strength | 26 kg | ≥30 kg |
| Right knee pain on walking | 6/10 | ≤4/10 |
| Knee extension deficit | −10° | −5° or better |
| Tandem stance | 6 s | 20 s |
| Continuous walking | ~5 min | 20–30 min |
| Clinical Frailty Scale | 5 | 4 |

## Safety rules (check before every session)
| Signal | 🟢 Go | 🟠 Go gently (half session, seated work) | 🔴 Skip and call the care team |
|---|---|---|---|
| Temperature | <37.5 °C | 37.5–37.9 °C | **≥38.0 °C** (recent neutropenia) |
| Blood counts (latest) | ANC ≥1.5, platelets ≥100 | ANC 1.0–1.5, platelets 50–100: no resistance bands | **ANC <1.0 or platelets <50** |
| Glucose before exercise | 100–250 mg/dL | 250–300: check ketones if you have strips; walk only | **<100** (eat first, recheck) or **>300** |
| Diarrhoea | ≤2 loose stools/day | 3 loose stools/day: fluids first, gentle only | **≥4 loose stools/day**, dizziness on standing, or passing little urine |
| Chest / breathing | None | Breathless but can talk in sentences | **Chest pain or pressure**, breathless at rest |
| Right knee | Pain ≤5/10 | 6/10: bike and seated exercise instead of walking | Hot, swollen knee, or pain ≥8/10 |
| Dizziness / falls | None | Light-headed on standing: rise slowly | Any fall, or fainting |

## Six-week plan
| Week | Aerobic | Strength | Balance | Notes |
|---|---|---|---|---|
| 1 | Walk 5 min × 3/day on flat ground with stick; bike 5 min, no resistance | Seated knee straightening, ankle pumps, heel slides: 1 × 10 each, twice daily | Stand at kitchen counter, feet together, 3 × 20 s | Rest days are allowed. Bathroom night light and a mat now |
| 2 | Walk 8 min × 3/day; bike 8 min | Sit-to-stand from a high chair 2 × 6, straight-leg raises 2 × 10 | Counter: semi-tandem stance 3 × 20 s | Knee extension stretch (heel on a stool) 2 min, twice daily |
| 3 | Walk 12 min × 2/day; bike 10 min, light resistance | Sit-to-stand 2 × 8, wall push-ups 2 × 8, step-ups on the bottom stair 2 × 6 (left leg leads up, right leads down) | Tandem stance at counter 3 × 15 s | Add a light 0.5 kg ankle weight if knee pain ≤4 |
| 4 | Walk 15 min × 2/day, including a gentle slope | Sit-to-stand 3 × 8 without arms, bridges 2 × 10 | Tandem walking along the counter 3 lengths | **Chemotherapy may restart this week:** on days 1–5 of each cycle, drop back to the week-2 level |
| 5 | Walk 20 min once daily + bike 10 min | Resistance band for thigh and arms 2 × 10 (only if platelets ≥100) | Single-leg stance at counter, 3 × 10 s each side | Test the 6-minute walk at home with the coach |
| 6 | Walk 25–30 min, or the route to church and back | Continue at 3 × 10 | Balance with eyes closed at counter (only if steady) | Repeat the formal physiotherapy assessment |

*Neuropathy:* always wear footwear, check feet daily for blisters, and never exercise barefoot. Oxaliplatin can worsen numbness, so report any change.

## Daily check-in
The coach asks each morning by WhatsApp:
1. **Temperature?** (≥38.0 → 🔴 skip and call)
2. **Stools since yesterday: how many loose?** (≥4 → 🔴)
3. **Fasting sugar?** (<100 or >300 → adjust or skip)
4. **Knee pain 0–10 and yesterday's walking minutes?** (pain ≥6 → swap walking for bike)
5. **Any dizziness, falls or chest symptoms?** (any → 🔴 call)
6. **Energy 0–10?** (≤3 → half session; three low days in a row → tell the physiotherapist)

## Reply to today's check-in
Welcome home, Mr. Thomas. Five minutes to the gate on your first evening is a good start. Feeling weak after an ICU stay is normal, and strength comes back week by week.
**Tomorrow:** walk 5 minutes three times (morning, after lunch, after dinner), on flat ground with your stick. Twice in the day, sit and straighten each knee 10 times. Stand at the kitchen counter for 20 seconds, 3 times.
Your sugar of 212 is acceptable for exercise. Walking after meals helps bring it down.
Please use a night light on the way to the bathroom. Message me each morning with your temperature, stools, sugar and knee pain.

## Weekly summary for the physiotherapist
- **Report every Sunday:** total walking minutes per day, sit-to-stand count, knee pain trend, any 🟠/🔴 days and why, falls, fasting glucose range.
- **Escalate within 24 h:** any 🔴 day, walking minutes falling for 3 days in a row, a new fall, or knee swelling.
- **Adjust targets** once the oncology re-plan dates are known (lighter weeks around each cycle).

## Longer-term goals
- **Church walk:** the week-6 target (25–30 minutes) matches the distance he describes.
- **Knee replacement preparation:** stronger thigh muscles and better knee extension before surgery predict faster recovery afterwards. This plan doubles as pre-habilitation, and the repeat 6-minute walk and sit-to-stand give the orthopaedic team objective baselines for the future re-planning visit.
`,
};

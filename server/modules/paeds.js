export default {
  id: "paeds",
  order: 41,
  patientId: "syn-000416",
  title: "Paediatric Prescription Safety",
  specialty: "Paediatric Emergency / Pharmacy",
  stage: "inpatient",
  date: "2026-09-26",
  summary:
    "Checks every paediatric prescription against weight-based dosing before it is dispensed: mg/kg per dose and per day, maximums, formulation and volume, age restrictions, and the child's current state. It writes the corrected orders and a dosing card for parents.",
  claudeRole: "Recalculates every dose from the child's weight, flags errors and age restrictions, and drafts corrections. The prescriber and pharmacist confirm before dispensing.",
  inputLabel: "ED prescription for checking",
  inputHint: "Orders as written by the prescriber, with weight and the clinical picture. Claude recalculates each dose independently.",
  outputLabel: "Draft prescription check",
  system: `Task: paediatric prescription safety check before dispensing (weight-based dosing; BNFc / IAP / AAP guidance).

Recalculate every dose from the documented weight, and show mg/kg per dose and per day. Convert every liquid volume to mg using the stated strength. Produce in order:
1. "## Stop before dispensing": numbered critical errors (overdose, contraindication, wrong formulation or unit), each with the correction.
2. "## Dose check": a table of drug | as written | mg per dose | mg/kg/dose | mg/kg/day | recommended | verdict (✅ / ⚠️ / ❌).
3. "## Corrected prescription": the full list as it should be dispensed, with strength, dose in mg and mL, frequency, maximum per 24 h and duration.
4. "## Is the treatment appropriate?": brief check of the indication against guidance (for example, whether antibiotics are indicated and for how long).
5. "## Dosing card for parents": plain English, with doses in mL and times, a note to use the syringe provided, and when to return.
6. "## Prescribing-safety notes": system learning points (for example, writing doses in mg as well as mL).`,
  buildPrompt: (input) => `Prescription for checking:\n\n${input}`,
  defaultInput: `Paediatric ED, 26 Sep 2026, 21:40. Ayaan Rasheed, 4 years, weight 16 kg (measured today). No known allergies.
Presentation: fever 39.2 °C for 2 days, right ear pain, one episode of vomiting today, reduced drinking. Right tympanic membrane red and bulging. Mild dehydration (dry lips, capillary refill 2 s, passed urine 6 hours ago). Alert, no rash, no neck stiffness. HR 132.
Diagnosis: acute otitis media (right), mild dehydration.

Orders as written:
1. Paracetamol suspension 250 mg/5 mL: 15 mL orally every 6 hours
2. Ibuprofen suspension 100 mg/5 mL: 8 mL orally every 8 hours
3. Amoxicillin suspension 250 mg/5 mL: 10 mL orally three times daily for 10 days
4. Ondansetron 8 mg orally, stat
5. Codeine + chlorpheniramine cough syrup: 5 mL at night as needed
6. Oral rehydration solution: "as tolerated"`,
  demoOutput: `## Stop before dispensing
1. **Paracetamol: 3× overdose.** 15 mL of 250 mg/5 mL = **750 mg** = 46.9 mg/kg per dose (**187.5 mg/kg/day** if given 6-hourly). The maximum is 15 mg/kg per dose and 60 mg/kg/day. **Correct: 5 mL (250 mg) every 6 hours, maximum 4 doses in 24 hours.** This looks like a volume-for-dose error.
2. **Codeine-containing cough syrup: contraindicated under 12 years** (risk of breathing suppression in ultra-rapid metabolisers; WHO/EMA/FDA). **Remove it.** No cough medicine is needed for otitis media.
3. **Ondansetron 8 mg: double the weight-band dose.** For 15–30 kg the single oral dose is **4 mg** (8 mg is 0.5 mg/kg). **Correct: 4 mg once.**
4. **Ibuprofen with dehydration:** the dose is correct (10 mg/kg), but **withhold until he is drinking well and passing urine**, because NSAIDs increase kidney risk when dehydrated. Use paracetamol for now.

## Dose check
| Drug | As written | mg per dose | mg/kg/dose | mg/kg/day | Recommended | Verdict |
|---|---|---|---|---|---|---|
| Paracetamol 250 mg/5 mL | 15 mL 6-hourly | 750 | 46.9 | 187.5 | 15 mg/kg/dose; max 60 mg/kg/day | ❌ 3× overdose |
| Ibuprofen 100 mg/5 mL | 8 mL 8-hourly | 160 | 10 | 30 | 5–10 mg/kg/dose; max 30 mg/kg/day | ⚠️ Correct dose; hold while dehydrated |
| Amoxicillin 250 mg/5 mL | 10 mL TDS, 10 days | 500 | 31.3 | 93.8 | 80–90 mg/kg/day in 2 doses | ⚠️ Slightly above range; adjust; duration too long |
| Ondansetron | 8 mg stat | 8 | 0.5 | — | 15–30 kg: 4 mg single dose | ❌ Double dose |
| Codeine + chlorpheniramine | 5 mL at night | — | — | — | Contraindicated <12 years | ❌ Remove |
| ORS | "As tolerated" | — | — | — | Mild dehydration: 50 mL/kg over 4 h = 800 mL | ⚠️ Specify volume |

## Corrected prescription
1. **Paracetamol 250 mg/5 mL: 5 mL (250 mg) orally every 6 hours when needed for fever or pain.** Maximum 4 doses (1 g) in 24 hours.
2. **Ondansetron 4 mg orally, once**, then start oral rehydration 15–30 minutes later.
3. **Oral rehydration solution: 800 mL over 4 hours** (50 mL/kg), given as 5–10 mL every 1–2 minutes by spoon or syringe, then replace losses.
4. **Amoxicillin 250 mg/5 mL: 14.4 mL (720 mg) orally twice daily for 7 days** (90 mg/kg/day). If available, the 400 mg/5 mL strength (9 mL twice daily) means a smaller volume.
5. **Ibuprofen 100 mg/5 mL: 8 mL (160 mg) every 8 hours when needed**, **only once drinking normally and passing urine.** Maximum 3 doses in 24 hours.
6. ~~Codeine + chlorpheniramine syrup~~: **removed.**

## Is the treatment appropriate?
- **Antibiotics are indicated:** unilateral acute otitis media with fever ≥39 °C counts as severe symptoms (AAP), so start high-dose amoxicillin now rather than wait and watch.
- **Duration:** 7 days for age 2–5 years with severe symptoms (10 days is for under-2s or recurrent/complicated cases).
- **Dehydration:** mild. Oral rehydration after ondansetron is appropriate; no IV fluids needed if he drinks.
- **Review in 48–72 hours** if fever or ear pain persist (consider amoxicillin-clavulanate).

## Dosing card for parents
Ayaan weighs 16 kg. Use **the syringe we give you**, not a kitchen spoon.
| Medicine | How much | When |
|---|---|---|
| Paracetamol (250 mg in 5 mL) | **5 mL** | Every 6 hours if fever or pain. **No more than 4 times in a day** |
| Amoxicillin (antibiotic) | **14.4 mL** (we will mark the syringe) | Morning and night for **7 days**, even when he feels better |
| ORS | Small sips: 1–2 spoons every 1–2 minutes | Over the next 4 hours, then after each loose stool or vomit |
| Ibuprofen (100 mg in 5 mL) | **8 mL** | Only after he is drinking well and passing urine; every 8 hours if needed |

**Come back straight away** if Ayaan is very sleepy or hard to wake, has not passed urine for 8 hours, keeps vomiting, has a stiff neck or a rash that does not fade when pressed, swelling or redness behind the ear, or is still feverish after 3 days of antibiotics.

## Prescribing-safety notes
- Write liquid doses as **mg and mL** ("250 mg = 5 mL"); a volume alone caused the paracetamol error.
- Build **weight-band defaults** for ondansetron and common analgesics into the ED order set.
- Block **codeine-containing products for under-12s** at order entry.
- Default antibiotic durations by age for otitis media.
`,
};

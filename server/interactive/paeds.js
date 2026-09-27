import { obj, str, list } from "./schema.js";

// Clinician view: the app recalculates every dose from the weight; Claude reviews appropriateness and writes advice.
export default {
  instructions: `The app has already recalculated every dose below from the child's weight against a local formulary (its findings are listed). Do not repeat the arithmetic. Return JSON for the prescriber's review panel:
- appropriateness: whether each treatment is indicated for this presentation and for how long, citing guidance briefly.
- perDrug: one short clinical comment per order that adds something beyond the dose check (or say "No further comment").
- returnIf: plain-English reasons for parents to come back straight away.
- safetyNotes: system learning points for the ED.`,
  schema: obj({
    appropriateness: list(str()),
    perDrug: list(obj({ drug: str(), comment: str() })),
    returnIf: list(str()),
    safetyNotes: list(str()),
  }),
  toText(payload) {
    const orders = (payload.orders || []).map((o, i) => `${i + 1}. ${o.written} → app check: ${o.finding}`);
    return `Paediatric ED, ${payload.when || ""}. ${payload.patient || ""}, ${payload.ageYears} years, weight ${payload.weightKg} kg. ${payload.dehydrated ? "Clinically dehydrated." : "Not dehydrated."}\nPresentation: ${payload.presentation || ""}\n\nOrders and the app's dose check:\n${orders.join("\n")}`;
  },
  demo: {
    appropriateness: [
      "Antibiotics are indicated: unilateral acute otitis media with fever of 39 °C or more counts as severe symptoms (AAP), so start high-dose amoxicillin now rather than wait and watch.",
      "Duration: 7 days for age 2–5 years with severe symptoms. 10 days is for under-2s or recurrent or complicated cases.",
      "Mild dehydration: oral rehydration after a single dose of ondansetron is appropriate; IV fluids are not needed if he drinks.",
      "Review in 48–72 hours if fever or ear pain persist; consider amoxicillin-clavulanate then.",
    ],
    perDrug: [
      { drug: "Paracetamol", comment: "The written 15 mL looks like a volume-for-dose error: 15 mg/kg was intended, written as 15 mL." },
      { drug: "Ibuprofen", comment: "Correct dose, but withhold until he is drinking well and passing urine: NSAIDs add kidney risk when dehydrated." },
      { drug: "Amoxicillin", comment: "Use twice-daily high-dose dosing. The 400 mg/5 mL strength halves the volume if the pharmacy stocks it." },
      { drug: "Ondansetron", comment: "Single dose only; start oral rehydration 15–30 minutes after it." },
      { drug: "Codeine + chlorpheniramine", comment: "No cough medicine is needed for otitis media. Codeine is contraindicated under 12 years (breathing suppression in ultra-rapid metabolisers)." },
      { drug: "Oral rehydration solution", comment: "Give small frequent volumes: 5–10 mL every 1–2 minutes by spoon or syringe." },
    ],
    returnIf: [
      "He is very sleepy or hard to wake",
      "He has not passed urine for 8 hours",
      "He keeps vomiting and cannot keep fluids down",
      "He has a stiff neck, or a rash that does not fade when pressed",
      "There is swelling or redness behind the ear",
      "He still has a fever after 3 days of antibiotics",
    ],
    safetyNotes: [
      "Write liquid doses as mg and mL (\"250 mg = 5 mL\"); a volume alone caused the paracetamol error.",
      "Build weight-band defaults for ondansetron and common analgesics into the ED order set.",
      "Block codeine-containing products for under-12s at order entry.",
      "Default antibiotic durations by age for otitis media.",
    ],
  },
};

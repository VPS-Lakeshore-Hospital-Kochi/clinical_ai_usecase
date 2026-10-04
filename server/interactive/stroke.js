import { obj, str, list, bool } from "./schema.js";

// Clinician view: stroke code timeline; the app tracks clocks and eligibility, Claude drafts the plan.
export default {
  instructions: `A stroke code is in progress. The app tracks the clock and checks the listed eligibility criteria against the data so far. Return JSON for the stroke team's plan panel:
- decision: IV thrombolysis and mechanical thrombectomy, each yes/no with a one-sentence reason.
- next60: the actions for the next hour, each with its target.
- post24: care for the first 24 hours after the procedure.
- neurosurgery: triggers and the decompressive hemicraniectomy discussion for this patient.
- medicineSafety: findings about her medicines (check the anticoagulant dose against its criteria) with the action for each.
- familyBriefing: plain English, under 120 words.`,
  schema: obj({
    decision: obj({
      thrombolysis: obj({ give: bool(), reason: str() }),
      thrombectomy: obj({ go: bool(), reason: str() }),
    }),
    next60: list(obj({ action: str(), target: str() })),
    post24: list(str()),
    neurosurgery: list(str()),
    medicineSafety: list(obj({ finding: str(), action: str() })),
    familyBriefing: str(),
  }),
  toText(payload) {
    const events = (payload.events || []).map((e) => `- ${e.time} ${e.title}: ${e.detail}`);
    const checks = (payload.checks || []).map((c) => `- ${c.group}: ${c.label} → ${c.status}`);
    return `Stroke code, 21 Sep 2026. Leela Menon, 71, 62 kg. Time now: ${payload.now}.\n\nEvents so far:\n${events.join("\n")}\n\nApp eligibility check:\n${checks.join("\n")}`;
  },
  demo: {
    decision: {
      thrombolysis: { give: false, reason: "Apixaban taken at 08:00 today (within 48 h) and no drug-specific anti-Xa level is available; a normal INR does not exclude apixaban effect." },
      thrombectomy: { go: true, reason: "Left M1 occlusion, NIHSS 14, ASPECTS 8, core 18 mL with a large penumbra, pre-stroke mRS 0, within 6 hours. Anticoagulation does not contraindicate thrombectomy." },
    },
    next60: [
      { action: "Activate the neuro-interventional team and move to the angiography suite now", target: "Groin puncture by 12:05 (door-to-groin ≤90 min)" },
      { action: "Blood pressure: labetalol 10 mg IV, repeat once if needed", target: "≤185/110 before and during the procedure; avoid systolic <140" },
      { action: "Anaesthesia: conscious sedation or GA per the anaesthetist; be ready to convert (aphasia)", target: "No delay, no hypotension" },
      { action: "Consent: she lacks capacity; explain to her daughter and proceed in her best interests; document", target: "Before groin puncture" },
      { action: "Glucose monitoring", target: "140–180 mg/dL" },
      { action: "Nil by mouth; ECG; troponin; oxygen only if needed", target: "SpO2 >94%" },
      { action: "No heparin or antiplatelets in the ED", target: "—" },
    ],
    post24: [
      "BP after successful reperfusion: ≤180/105, and avoid intensive lowering below 140 systolic (ENCHANTED2/MT, OPTIMAL-BP)",
      "Neuro observations and NIHSS every 15 min for 2 h, every 30 min for 6 h, then hourly; urgent CT for a drop of 4 or more NIHSS points",
      "CT or MRI at 24 h before any antithrombotic",
      "No antithrombotics for 24 h unless a stent is placed",
      "Swallow screen before anything by mouth",
      "Glucose 140–180 mg/dL; treat temperature above 37.5 °C; intermittent pneumatic compression for VTE prophylaxis",
      "Cardiac monitoring for AF rate control",
    ],
    neurosurgery: [
      "Malignant MCA oedema risk: the whole M1 territory is at risk. Watch days 1–5 for a falling GCS, a new pupil change or midline shift",
      "Decompressive hemicraniectomy at 71: trials over 60 (DESTINY II) show lower mortality, but survivors often live with moderate to severe disability. Discuss early with her daughter what outcome she would find acceptable",
      "Symptomatic haemorrhagic transformation: urgent CT, stop antithrombotics, neurosurgical review",
      "Inform neurosurgery today",
    ],
    medicineSafety: [
      { finding: "Apixaban 2.5 mg twice daily is under-dosed: the reduced dose needs 2 of age ≥80, weight ≤60 kg, creatinine ≥1.5 mg/dL, and she meets none (71, 62 kg, 0.9)", action: "Report as a medication-safety event; restart at 5 mg twice daily" },
      { finding: "Restart timing depends on infarct size on 24 h imaging (ELAN)", action: "Within 48 h for minor or moderate infarcts; day 6–7 for major; later if haemorrhagic transformation" },
      { finding: "Rosuvastatin 10 mg", action: "Increase to 20 mg (LDL target <70 mg/dL)" },
      { finding: "Long-term blood pressure", action: "Target <130/80 once stable" },
    ],
    familyBriefing: "Your mother has had a stroke. A blood clot has blocked a main artery on the left side of her brain, which controls speech and the right side of the body. Because she takes a blood thinner, the clot-dissolving injection is not safe for her. The best treatment is a procedure to remove the clot through a thin tube passed from the groin, which we want to start within the hour. It carries risks, including bleeding in the brain, but gives her the best chance of recovering speech and movement. We will update you as soon as it is done.",
  },
};

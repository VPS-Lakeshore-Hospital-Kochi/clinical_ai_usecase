import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: lab and pathology explainer. The app flags each result against its reference
// range and trend, and scores the patient copy live (reading grade, jargon, survival figures);
// Claude writes the clinician summary and the plain-language take-home explanation.
export default {
  instructions: `Explain these results in two versions, as JSON. The app has flagged each result and its trend (listed); build on them. The patient version is given only after the doctor has discussed the results: never introduce news the doctor has not covered, never give survival figures, and point back to the care team for decisions. The app checks the patient copy for reading grade (target 8 or below), jargon and survival figures.
- clinician: one row per result with today, previous, trend and significance.
- actions: 2–3 short lines on what needs action, each with who acts.
- patientCopy: sections with a short heading and plain-English text (short sentences, about a 6th-grade level, addressed to the patient as "you").
- glossary: 5–8 terms from the report with plain meanings.
- questions: 4–6 questions the patient may want to ask.`,
  schema: obj({
    clinician: list(obj({ result: str(), today: str(), previous: str(), trend: oneOf(["up", "down", "stable", "confirmed"]), significance: str() })),
    actions: list(obj({ action: str(), who: str() })),
    patientCopy: list(obj({ heading: str(), text: str() })),
    glossary: list(obj({ term: str(), meaning: str() })),
    questions: list(str()),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.visit || ""}\n\nPathology report:\n${payload.pathology || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    clinician: [
      { result: "CEA", today: "2.1 ng/mL", previous: "6.8 (29 Jul, before surgery)", trend: "down", significance: "Normalised: consistent with complete resection; the post-operative baseline for surveillance" },
      { result: "Pathology stage", today: "pT3 pN1b M0, stage IIIB", previous: "cT3 cN1 (CT 1 Aug)", trend: "confirmed", significance: "2/18 nodes; R0; no LVI or PNI; no tumour deposits; pMMR" },
      { result: "Haemoglobin", today: "11.2 g/dL", previous: "10.9 (24 Aug), 9.8 (4 Aug)", trend: "up", significance: "Improving with iron and removal of the bleeding source; recheck ferritin at 4–6 weeks" },
      { result: "Creatinine", today: "1.0 mg/dL", previous: "1.0 (24 Aug), 1.23 (6 Jul)", trend: "stable", significance: "Improved since the NSAID was stopped" },
      { result: "HbA1c", today: "8.3% (14 Aug)", previous: "9.1% (6 Jul)", trend: "down", significance: "Improving but above target before chemotherapy" },
    ],
    actions: [
      { action: "Proceed with the Medical Oncology referral (adjuvant CAPOX; low-risk stage III, consistent with 3 months)", who: "Surgical team" },
      { action: "Ferritin and Hb recheck in 4–6 weeks", who: "Surgical / Oncology team" },
      { action: "HbA1c above target before chemotherapy: review already booked for 2 Sep", who: "Endocrinology" },
    ],
    patientCopy: [
      { heading: "Your operation report", text: "After your operation, a specialist doctor looked at the removed piece of bowel under a microscope. The cancer was removed completely. The edges of the removed piece had no cancer cells. Doctors call this clear margins. 2 of the 18 lymph glands removed with the bowel had cancer cells. Lymph glands are small filters near the bowel. Because some glands were involved, your doctors call this stage 3. They recommend chemotherapy to lower the chance of the cancer coming back. No cancer was seen in the small blood vessels or nerves near the tumour. This is a helpful finding." },
      { heading: "CEA, a blood marker", text: "CEA is a substance some bowel cancers release into the blood. Yours was 6.8 before the operation. It is now 2.1, which is normal. This fits with the tumour having been removed. Your doctors will check it regularly over the coming years. One normal result does not mean you can skip chemotherapy." },
      { heading: "Haemoglobin, your blood count", text: "Haemoglobin carries oxygen in your blood. It was low because the tumour was bleeding slowly. It is now 11.2 and rising, thanks to the iron drip and the operation. You may still feel a little tired. This should get better over the next few weeks." },
      { heading: "Kidney test", text: "Your kidneys are working well. The test is better than in July, after you stopped the aceclofenac pain tablets." },
      { heading: "Sugar control", text: "This test shows your average sugar over three months. It has come down from 9.1 to 8.3. That is good progress. It is still higher than we would like before chemotherapy. You will see the diabetes doctor on 2 September." },
      { heading: "What happens next", text: "You will meet the cancer doctor to plan chemotherapy. Keep taking your medicines. Bring this sheet and your questions to that appointment." },
    ],
    glossary: [
      { term: "Adenocarcinoma", meaning: "the most common type of bowel cancer" },
      { term: "Margins", meaning: "the edges of the removed tissue; clear means no cancer at the edges" },
      { term: "Lymph nodes (glands)", meaning: "small filters that can trap cancer cells" },
      { term: "Stage 3", meaning: "cancer that has reached nearby lymph glands but not other organs" },
      { term: "Adjuvant chemotherapy", meaning: "treatment after surgery to lower the chance of the cancer coming back" },
      { term: "CEA", meaning: "a blood marker used to follow bowel cancer over time" },
      { term: "pMMR", meaning: "a result about how the cancer cells repair their genes; it helps doctors choose treatment" },
    ],
    questions: [
      "Which chemotherapy do you recommend, and for how long?",
      "What side effects should I watch for, and who do I call?",
      "How will chemotherapy affect my diabetes and sugar checks?",
      "How often will you check my CEA and do scans after treatment?",
      "When can I think about my knee operation again?",
      "What can I do myself, with food and walking, to help my recovery?",
    ],
  },
};

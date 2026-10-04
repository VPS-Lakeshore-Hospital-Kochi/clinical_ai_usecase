import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: the dictation with Claude's issues highlighted in place → corrected structured report.
export default {
  instructions: `Check this staging CT dictation and return JSON for the radiologist's reporting screen. Never add findings that were not dictated.
- issues: contradictions (findings vs impression, laterality), missing staging elements and anything to confirm. "quotes" must be exact, verbatim substrings of the dictation (case-sensitive) that locate the problem.
- report: the structured report using corrected wording, marking each change "(corrected, verify)".
- impression: numbered points with radiological TNM.
- incidentals: each incidental finding with classification, recommendation, guideline and the team that should act.
- patientSummary: 4–6 plain sentences without staging details the clinician has not yet discussed.`,
  schema: obj({
    issues: list(obj({ title: str(), severity: oneOf(["Changes staging", "Correct before sign-off", "Add for completeness"]), quotes: list(str()), correction: str() })),
    critical: str("Findings needing a phone call, or 'None requiring urgent communication' with the reason"),
    report: obj({ indication: str(), technique: str(), primaryTumour: str(), nodes: str(), distant: str(), other: str() }),
    impression: list(str()),
    incidentals: list(obj({ finding: str(), classification: str(), recommendation: str(), guideline: str(), routeTo: str() })),
    patientSummary: str(),
  }),
  toText(payload) {
    return `Dictation to check:\n\n${payload.dictation || ""}`;
  },
  demo: {
    issues: [
      { title: "Findings contradict the impression on lymph nodes", severity: "Changes staging", quotes: ["Three pericolic nodes largest 11 mm short axis, round, one with irregular margin", "No significant lymphadenopathy"], correction: "Impression: \"Three suspicious pericolic lymph nodes (cN1)\". As dictated, the impression would understage the tumour at the MDT." },
      { title: "Laterality error: renal cyst", severity: "Correct before sign-off", quotes: ["simple cyst 1.2 cm upper pole left kidney", "Right renal cyst"], correction: "Impression: \"Left renal cyst\"." },
      { title: "Adrenal nodule not characterised in the impression", severity: "Correct before sign-off", quotes: ["left adrenal nodule 1.6 cm, 8 HU on plain images", "Adrenal nodule"], correction: "\"Left adrenal lipid-rich adenoma (8 HU), benign\". This matters in a cancer staging study." },
      { title: "EMVI not stated", severity: "Add for completeness", quotes: ["no clear invasion into bladder or adjacent small bowel"], correction: "State extramural venous invasion: present, absent or indeterminate." },
      { title: "T sub-stage not stated", severity: "Add for completeness", quotes: ["small spiculations extending less than 5 mm beyond the muscularis"], correction: "Supports T3a–b; state it explicitly for the MDT." },
      { title: "Cardiovascular finding missing from the impression", severity: "Add for completeness", quotes: ["Coronary artery calcification noted"], correction: "Add coronary artery calcification to the impression (relevant before surgery)." },
    ],
    critical: "None requiring urgent communication. The malignancy is known to the treating team, and the tumour board is on 5 Aug.",
    report: {
      indication: "Biopsy-proven sigmoid adenocarcinoma (colonoscopy 29 Jul 2026). Staging.",
      technique: "Portal venous phase CT of thorax, abdomen and pelvis with oral contrast; unenhanced images through the adrenals. No prior imaging.",
      primaryTumour: "Irregular circumferential wall thickening of the sigmoid colon over 4.5 cm (maximum thickness 1.6 cm), about 25 cm from the anal verge (endoscopic measurement). Pericolic fat stranding with spiculation extending <5 mm beyond the muscularis propria. No invasion of the bladder or small bowel. No obstruction. EMVI: not stated in dictation, radiologist to add.",
      nodes: "Three pericolic lymph nodes, largest 11 mm short axis, round, one with an irregular margin: suspicious for nodal metastases (corrected, verify). No nodes at the IMA root.",
      distant: "Liver without focal lesion. No pulmonary nodules. No ascites or peritoneal nodularity. No suspicious bone lesion.",
      other: "Diffuse hepatic steatosis. Left adrenal nodule 1.6 cm, 8 HU unenhanced. Simple cyst 1.2 cm, left kidney upper pole (corrected, verify). Coronary artery calcification and moderate aortic calcification. Degenerative spine.",
    },
    impression: [
      "Sigmoid adenocarcinoma, radiological T3 (a–b) N1 M0. EMVI to be stated.",
      "Three suspicious pericolic lymph nodes (corrected from \"no significant lymphadenopathy\", verify).",
      "No distant metastases. The left adrenal nodule is a lipid-rich adenoma, not a metastasis.",
      "Coronary artery and aortic calcification.",
      "Hepatic steatosis. Simple left renal cyst.",
    ],
    incidentals: [
      { finding: "Left adrenal nodule 1.6 cm, 8 HU", classification: "Lipid-rich adenoma, benign", recommendation: "No imaging follow-up. 1 mg overnight dexamethasone suppression test: hypertension and diabetes can be driven by autonomous cortisol secretion", guideline: "ACR incidental adrenal white paper; ESE 2023", routeTo: "Endocrinology" },
      { finding: "Coronary artery calcification", classification: "Atherosclerosis marker", recommendation: "Communicate before surgery; supports statin intensification", guideline: "Peri-operative cardiovascular assessment", routeTo: "Cardiology" },
      { finding: "Hepatic steatosis", classification: "Probable MASLD", recommendation: "FIB-4 from existing labs; elastography if FIB-4 ≥1.3", guideline: "AASLD MASLD guidance", routeTo: "Hepatology" },
      { finding: "Left renal cyst 1.2 cm", classification: "Bosniak I (simple)", recommendation: "No follow-up", guideline: "Bosniak 2019", routeTo: "No action" },
    ],
    patientSummary: "Your scan looked at your chest, tummy and pelvis. It shows the growth in the bowel that was found at your colonoscopy, and some nearby glands that your doctors will discuss with you. No spread was seen to the liver, lungs or bones. The scan also showed a few common things that are not dangerous, such as a small harmless swelling on a gland near the kidney and a fluid-filled bubble on the kidney. Your doctors may do a simple blood test to check that gland.",
  },
};

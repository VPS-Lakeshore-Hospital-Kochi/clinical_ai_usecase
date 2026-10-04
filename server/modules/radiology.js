export default {
  id: "radiology",
  order: 5,
  title: "Structured Radiology Reporting",
  specialty: "Radiology",
  stage: "diagnosis",
  date: "2026-08-01",
  summary:
    "Turns a radiologist's free-text dictation into a structured cancer-staging report, checks it for internal contradictions, handles incidental findings with guideline follow-up, and writes a version the patient can read.",
  claudeRole: "Structures the report, catches contradictions and assigns incidental-finding follow-up. The radiologist corrects and signs.",
  inputLabel: "Radiologist dictation",
  inputHint: "Raw dictation as it comes from speech recognition, including its errors. Claude checks it against itself and the chart.",
  outputLabel: "Draft structured report",
  system: `Task: radiology reporting assistant for a staging CT.

Never add findings that were not dictated. Where the dictation contradicts itself or is incomplete, flag it rather than silently choosing. Produce in order:
1. "## Report quality check": a table of issue | where in the dictation | suggested correction, covering contradictions (findings vs impression, laterality), missing staging elements (for example EMVI, distance of the tumour, nodal features), and anything to confirm. Put this first.
2. "## Critical & time-sensitive findings": anything needing a phone call, or "None requiring urgent communication".
3. "## Structured report": Clinical indication, Technique, then Findings under Primary tumour, Lymph nodes, Distant disease (liver, lungs, peritoneum, bones) and Other findings. Use the corrected wording and mark each change "(corrected, verify)".
4. "## Impression": numbered, with radiological TNM.
5. "## Incidental findings & follow-up": a table of finding | classification | recommendation | guideline (for example ACR incidental-findings white papers, Bosniak 2019, ESE adrenal guideline). Route each to the team that should act.
6. "## Summary for the patient": 4–6 plain-English sentences, no jargon, without disclosing staging details the clinician has not yet discussed.`,
  buildPrompt: (input) => `Dictation to structure:\n\n${input}`,
  defaultInput: `CECT thorax abdomen pelvis, 1 Aug 2026.
Clinical: sigmoid mass on colonoscopy 29 Jul, biopsy adenocarcinoma. Staging. No prior imaging for comparison.
Technique: portal venous phase thorax abdomen pelvis with oral contrast, unenhanced images through the adrenals.

Findings: sigmoid colon approx 25 cm from verge as per scope, there is irregular circumferential wall thickening over a 4.5 cm segment max thickness 1.6 cm with pericolic fat stranding and small spiculations extending less than 5 mm beyond the muscularis, no clear invasion into bladder or adjacent small bowel, no obstruction, proximal colon not dilated. Three pericolic nodes largest 11 mm short axis, round, one with irregular margin. No nodes along the IMA root.
Liver normal size, diffusely low attenuation suggesting fatty infiltration, no focal lesion. Gallbladder normal. Pancreas and spleen normal.
Adrenals: left adrenal nodule 1.6 cm, 8 HU on plain images. Right adrenal normal.
Kidneys: simple cyst 1.2 cm upper pole left kidney, fluid density, no enhancement, thin wall, no septa. No hydronephrosis.
Bladder and prostate unremarkable. No ascites, no peritoneal nodularity.
Chest: no pulmonary nodules, no effusion, no mediastinal or hilar nodes. Coronary artery calcification noted, moderate aortic calcification.
Bones: degenerative spine, no lytic or sclerotic lesion.

Impression: Sigmoid carcinoma T3. No significant lymphadenopathy. No metastases. Right renal cyst. Adrenal nodule.`,
  demoOutput: `## Report quality check
| Issue | Where in the dictation | Suggested correction |
|---|---|---|
| **Findings vs impression: nodes** | Findings: three pericolic nodes, round, one irregular. Impression: "No significant lymphadenopathy" | "Three suspicious pericolic lymph nodes (cN1)". The impression as dictated would understage the tumour at the MDT |
| **Laterality error** | Findings: cyst in the *left* kidney. Impression: "*Right* renal cyst" | "Left renal cyst" |
| Adrenal nodule not characterised in impression | Impression: "Adrenal nodule" | "Left adrenal lipid-rich adenoma (8 HU), benign". Matters in a cancer staging study |
| EMVI not stated | Primary tumour section | State extramural venous invasion present / absent / indeterminate |
| T sub-stage | Spiculation "<5 mm beyond muscularis" | Supports T3a–b; state it explicitly for the MDT |
| Cardiovascular finding not in impression | Chest: coronary artery calcification | Add to impression (relevant for pre-operative assessment) |

## Critical & time-sensitive findings
None requiring urgent communication. The malignancy is already known to the treating team, and the tumour board is on 5 Aug.

## Structured report
**Clinical indication:** Biopsy-proven sigmoid adenocarcinoma (colonoscopy 29 Jul 2026). Staging.
**Technique:** Portal venous phase CT of thorax, abdomen and pelvis with oral contrast; unenhanced images through the adrenals. No prior imaging.

**Findings**
- **Primary tumour:** Irregular circumferential wall thickening of the sigmoid colon over 4.5 cm (maximum thickness 1.6 cm), about 25 cm from the anal verge (endoscopic measurement). Pericolic fat stranding with spiculation extending <5 mm beyond the muscularis propria. No invasion of the bladder or small bowel. No obstruction. EMVI: *not stated in dictation, radiologist to add*.
- **Lymph nodes:** Three pericolic lymph nodes, largest 11 mm short axis, round, one with an irregular margin: **suspicious for nodal metastases** (corrected, verify). No nodes at the IMA root.
- **Distant disease:** Liver without focal lesion. No pulmonary nodules. No ascites or peritoneal nodularity. No suspicious bone lesion.
- **Other findings:** Diffuse hepatic steatosis. Left adrenal nodule 1.6 cm, 8 HU unenhanced. Simple cyst 1.2 cm, **left** kidney upper pole (corrected, verify). Coronary artery calcification and moderate aortic calcification. Degenerative spine.

## Impression
1. Sigmoid adenocarcinoma, radiological **T3 (a–b) N1 M0**. EMVI to be stated.
2. **Three suspicious pericolic lymph nodes** (corrected from "no significant lymphadenopathy", verify).
3. No distant metastases. The left adrenal nodule is a lipid-rich adenoma, not a metastasis.
4. Coronary artery and aortic calcification.
5. Hepatic steatosis. Simple left renal cyst.

## Incidental findings & follow-up
| Finding | Classification | Recommendation | Guideline |
|---|---|---|---|
| Left adrenal nodule 1.6 cm, 8 HU | Lipid-rich adenoma, benign | No imaging follow-up. **1 mg overnight dexamethasone suppression test**: he has hypertension and diabetes, which can be driven by autonomous cortisol secretion. **→ Endocrinology** | ACR incidental adrenal white paper; ESE 2023 adrenal incidentaloma guideline |
| Coronary artery calcification | Atherosclerosis marker | Communicate before surgery; supports statin intensification. **→ Cardiology / Anaesthesia** | Cardiovascular risk stratification; relevant to peri-operative assessment |
| Hepatic steatosis | Probable MASLD | FIB-4 from existing labs; ultrasound elastography if FIB-4 ≥1.3. **→ Endocrinology / Hepatology** | AASLD MASLD guidance |
| Left renal cyst 1.2 cm | Bosniak I (simple) | No follow-up | Bosniak 2019 |

## Summary for the patient
Your scan looked at your chest, tummy and pelvis. It shows the growth in the bowel that was found at your colonoscopy, and some nearby glands that your doctors will discuss with you. No spread was seen to the liver, lungs or bones. The scan also showed a few common things that are not dangerous, such as a small harmless swelling on one gland near the kidney and a fluid-filled bubble on the kidney. Your doctors may do a simple blood test to check that gland.
`,
};

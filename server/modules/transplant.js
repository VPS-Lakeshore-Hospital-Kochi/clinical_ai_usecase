export default {
  id: "transplant",
  order: 20,
  patientId: "syn-000271",
  title: "Liver Transplant Work-up",
  specialty: "Hepatology / Liver Transplant",
  stage: "specialty",
  date: "2026-09-22",
  summary:
    "Brings the recipient's scores, cancer staging and work-up together with the living donor's volumetry and tests: transplant candidacy, a readiness tracker for both, legal steps and open items before surgery.",
  claudeRole: "Calculates the scores, checks the cancer criteria and graft size, and tracks every open item for recipient and donor. The transplant team and Authorisation Committee decide.",
  inputLabel: "Transplant evaluation pack",
  inputHint: "Recipient and donor results as collected by the transplant coordinator. Claude shows its calculations and flags anything missing.",
  outputLabel: "Draft transplant evaluation summary",
  system: `Task: living-donor liver transplant (LDLT) evaluation support for a transplant team in India.

Show the arithmetic for every score. Never state that a donor is approved: donor approval is a separate, independent decision. Produce in order:
1. "## Candidacy summary": indication(s), urgency, and a one-line verdict (for example "Suitable to proceed to LDLT, subject to open items").
2. "## Severity scores": a table of score | inputs | result, covering MELD 3.0 (with the formula applied), Child-Pugh (each component) and sarcopenia. Say what the scores mean for timing.
3. "## HCC & transplant criteria": Milan (and UCSF) assessment, AFP, and whether bridging therapy is needed given the expected time to transplant and liver function.
4. "## Recipient work-up tracker": a table of domain | status (✅ done / ⏳ pending / ❌ problem) | result | action.
5. "## Living-donor assessment": ABO compatibility, volumetry, graft-to-recipient weight ratio (GRWR) and remnant volume with arithmetic, steatosis, vascular and biliary anatomy, donor risk to discuss, and what is still needed for independent donor clearance.
6. "## Legal & ethics": steps under the Transplantation of Human Organs and Tissues Act 1994 (amended 2011) and THOT Rules 2014 for a near-related living donor, including Authorisation Committee review. Tell the team to confirm current forms with the transplant coordinator.
7. "## Open items before surgery": a "- [ ]" checklist with owners.
8. "## Explaining it to the family": plain English, under 150 words, for the patient and her son. Include that the son may withdraw at any time without explanation.`,
  buildPrompt: (input) => `Evaluation pack:\n\n${input}`,
  defaultInput: `Liver transplant evaluation meeting, 22 Sep 2026.

RECIPIENT: Anitha Joseph, 49 F, blood group B+. Height 156 cm, weight 64 kg (estimated dry weight 58 kg).
Diagnosis: MASH cirrhosis, decompensated since 2023: diuretic-refractory ascites (large-volume paracentesis every ~3 weeks), hepatic encephalopathy grade 1–2 on lactulose + rifaximin, varices banded 2025.
Labs 15 Sep: bilirubin 3.4 mg/dL, albumin 2.6 g/dL, INR 1.9, Na 131, creatinine 1.3, platelets 62, AFP 38 ng/mL.
HCC: multiphase CT 5 Sep: single 2.4 cm LI-RADS 5 lesion, segment VI. No macrovascular invasion. CT chest and bone scan: no extrahepatic disease.
Cardiopulmonary: dobutamine stress echo negative; RVSP 32 mmHg; bubble study negative; PaO2 88 mmHg on air.
Infection screen: HBsAg neg, anti-HBc neg, anti-HBs <10 mIU/mL; HCV and HIV neg; CMV IgG pos; EBV IgG pos; IGRA neg; Strongyloides serology pending.
Cancer screening: mammogram BI-RADS 1; Pap smear normal; colonoscopy: two small polyps removed (tubular adenomas).
Dental: two carious molars, extraction advised.
Nutrition: CT L3 skeletal muscle index 36 cm²/m². Dietitian review pending.
Psychosocial: no alcohol ever; strong family support; husband is primary caregiver. Social work assessment done.
Funding: self-pay with family support; transplant assistance applications not yet submitted.

DONOR CANDIDATE: Kevin Joseph, son, 26 M, blood group O+. Height 175 cm, weight 72 kg (BMI 23.5). Non-smoker, no alcohol.
Labs: normal LFTs, renal function, CBC, coagulation; HBV/HCV/HIV negative; HbA1c 5.3%.
MRI-PDFF: 4% liver fat.
CT volumetry: total liver 1,580 mL; right lobe graft (without middle hepatic vein) 830 mL; left lobe remnant 750 mL.
Anatomy: conventional portal vein and hepatic artery; right inferior hepatic vein 6 mm; segment V and VIII veins 4 mm. MRCP: conventional biliary anatomy.
Psychological assessment: completed, no concerns. Independent donor assessment: not yet done.
Relationship documentation: birth certificate and family photos collected; Authorisation Committee meeting not yet scheduled.`,
  demoOutput: `## Candidacy summary
- **Indications:** decompensated MASH cirrhosis (refractory ascites, hepatic encephalopathy, varices) **and** hepatocellular carcinoma within Milan criteria.
- **Urgency:** high. MELD 3.0 is **26**, with a paracentesis every ~3 weeks and progressive sarcopenia.
- **Verdict:** **suitable to proceed to living-donor liver transplant**, subject to the open items below (dental extraction, Strongyloides result, HBV vaccination, nutrition, independent donor assessment and Authorisation Committee approval).

## Severity scores
| Score | Inputs | Result |
|---|---|---|
| **MELD 3.0** | Female; bilirubin 3.4; Na 131; INR 1.9; creatinine 1.3; albumin 2.6 | **26** |
| Child-Pugh | Bilirubin >3 (3) · albumin <2.8 (3) · INR 1.7–2.3 (2) · ascites moderate–severe (3) · encephalopathy grade 1–2 (2) | **13, class C** |
| Sarcopenia | CT L3 skeletal muscle index 36 cm²/m² (female cut-off <39) | **Present** |

**MELD 3.0 arithmetic**
1.33 (female) + 4.56 × ln(3.4) [5.58] + 0.82 × (137 − 131) [4.92] − 0.24 × (137 − 131) × ln(3.4) [−1.76] + 9.09 × ln(1.9) [5.83] + 11.14 × ln(1.3) [2.92] + 1.85 × (3.5 − 2.6) [1.67] − 1.83 × (3.5 − 2.6) × ln(1.3) [−0.43] + 6 = **26.06 → 26**

*What it means:* a MELD of 26 carries a substantial 90-day mortality without transplant. Living donation avoids waiting, so timing should be driven by completing the work-up safely, ideally within weeks.

## HCC & transplant criteria
- **Milan:** single lesion 2.4 cm (≤5 cm), no macrovascular invasion, no extrahepatic disease → **within Milan** (and within UCSF).
- **AFP 38 ng/mL:** below the 100–1,000 thresholds used in AFP-based models, so a favourable profile.
- **Bridging therapy:** **not recommended routinely.** With Child-Pugh C, TACE risks further decompensation. If LDLT is expected within ~3 months, observe with repeat multiphase imaging at 6–8 weeks. Reconsider (for example ablation, if technically feasible) only if surgery is delayed.

## Recipient work-up tracker
| Domain | Status | Result | Action |
|---|---|---|---|
| Cardiac | ✅ | Dobutamine stress echo negative | None |
| Portopulmonary HTN | ✅ | RVSP 32 mmHg | None |
| Hepatopulmonary syndrome | ✅ | Bubble study negative, PaO2 88 | None |
| Kidney | ⚠️ | Creatinine 1.3, Na 131 | Watch for hepatorenal physiology; avoid nephrotoxins; review diuretic doses |
| HBV immunity | ❌ | Anti-HBs <10 | **Start accelerated HBV vaccination now** |
| Strongyloides | ⏳ | Serology pending | **Result before transplant** (hyperinfection risk with immunosuppression); ivermectin if positive |
| CMV / EBV | ✅ | Both IgG positive | Standard prophylaxis/monitoring plan |
| TB | ✅ | IGRA negative | None |
| Cancer screening | ✅ | Mammogram, Pap, colonoscopy done (adenomas removed) | Colonoscopy surveillance per result |
| Dental | ❌ | Two carious molars | **Extraction before transplant** (platelets 62, INR 1.9: plan with haematology/dental team) |
| Nutrition | ⏳ | Sarcopenia | **Dietitian now:** 1.2–1.5 g/kg/day protein, late-evening snack, supervised exercise |
| Diabetes | ✅ | Glargine 10 U; HbA1c unreliable | Plan for post-transplant hyperglycaemia on tacrolimus/steroids |
| Psychosocial | ✅ | No alcohol, strong support | None |
| Funding | ⏳ | Applications not submitted | **Social work / finance desk** to start assistance applications |

## Living-donor assessment
- **ABO:** donor O, recipient B → **compatible** (not identical).
- **Donor BMI 23.5**, MRI-PDFF **4%** fat (well under the usual 10% threshold for right-lobe donation).
- **Graft-to-recipient weight ratio** (assuming 1 mL ≈ 1 g of graft):
  - Using actual weight: 830 ÷ 64,000 × 100 = **1.30%**
  - Using dry weight (more appropriate with ascites): 830 ÷ 58,000 × 100 = **1.43%**
  - Both are comfortably above the 0.8% minimum.
- **Donor remnant:** 750 ÷ 1,580 × 100 = **47.5%**, above the ≥30–35% safety threshold.
- **Anatomy:** conventional portal vein, artery and bile duct (favourable). Right inferior hepatic vein 6 mm: plan to **reconstruct** it. Segment V/VIII veins are 4 mm; the surgical team decides on reconstruction.
- **Donor risk to discuss:** right-lobe donation carries a small but real risk of death (commonly quoted around 0.1–0.5%), with major complications (for example bile leak) in a minority, and several weeks of recovery.
- **Still needed:** **independent donor assessment** by a physician outside the recipient team, a documented voluntary consent discussion, and confirmation that there is no coercion or financial inducement.

## Legal & ethics
- Son = **near relative** under the Transplantation of Human Organs and Tissues Act 1994 (amended 2011) and THOT Rules 2014.
- Required: documentary proof of relationship (collected), donor and recipient applications with the treating team's certification, and **review and approval by the hospital Authorisation Committee**, including an interview with the donor, before surgery.
- Record the donor's informed, voluntary consent and his right to withdraw at any time.
- *Confirm the current prescribed forms and any state-level requirements with the transplant coordinator.*
- Consider parallel registration on the state deceased-donor list (K-SOTTO) as a back-up, per unit policy.

## Open items before surgery
- [ ] Strongyloides serology result; treat if positive (Transplant ID)
- [ ] Accelerated HBV vaccination started (Hepatology)
- [ ] Dental extractions with platelet/coagulation plan (Dental + Haematology)
- [ ] Dietitian and physiotherapy pre-habilitation (Nutrition / Physio)
- [ ] Repeat multiphase CT or MRI at 6–8 weeks if surgery has not happened (Radiology)
- [ ] Independent donor assessment (Independent physician)
- [ ] Authorisation Committee meeting scheduled (Transplant coordinator)
- [ ] Funding and assistance applications submitted (Social work / finance)
- [ ] Final surgical planning for hepatic vein reconstruction (Transplant surgery)

## Explaining it to the family
Anitha, your liver is badly scarred and is no longer doing its job. There is also a small cancer in it. A new liver is the best treatment for both. Kevin has offered part of his liver, and his tests so far show that the piece we would take is a good size for you, while the part left behind is large enough for him to stay healthy. His liver regrows over a few months. Before surgery, Anitha needs some dental treatment, vaccines and extra nutrition. Kevin will meet a doctor who is not part of your team, and a hospital committee, to make sure this is his free choice. Kevin, you can change your mind at any time, and you do not have to give a reason.
`,
};

import { obj, str, list, oneOf } from "./schema.js";

// Clinician view: living-donor liver transplant evaluation. The app calculates MELD 3.0 and
// Child-Pugh with the arithmetic, checks Milan criteria and the donor graft/remnant/fat/ABO
// limits; Claude summarises candidacy, the work-up tracker, open items and the family explanation.
export default {
  instructions: `Support this living-donor liver transplant evaluation meeting, as JSON. The app has calculated MELD 3.0 and Child-Pugh (with arithmetic), the Milan assessment and the donor graft-to-recipient weight ratio, remnant, fat and ABO checks (listed); build on them and do not contradict their numbers. Never state that the donor is approved: donor approval is a separate, independent decision.
- candidacy: indications, urgency and a one-line verdict.
- hcc: Milan/UCSF, AFP and bridging-therapy advice.
- tracker: recipient work-up domain | status (done, pending, problem) | result | action.
- donor: points on anatomy, donor risk to discuss and what is still needed for independent donor clearance.
- legal: THOTA 1994 (amended 2011) and THOT Rules 2014 steps for a near-related living donor; remind the team to confirm current forms with the transplant coordinator.
- openItems: items before surgery with an owner.
- family: plain English, under 150 words, for the patient and her son, including that the son may withdraw at any time without giving a reason.`,
  schema: obj({
    candidacy: obj({ indications: str(), urgency: str(), verdict: str() }),
    hcc: list(str()),
    tracker: list(obj({ domain: str(), status: oneOf(["done", "pending", "problem"]), result: str(), action: str() })),
    donor: list(str()),
    legal: list(str()),
    openItems: list(obj({ item: str(), owner: str() })),
    family: str(),
  }),
  toText(payload) {
    const rules = (payload.appChecks || []).map((a) => `- ${a}`);
    return `${payload.meeting || ""}\n\nApp checks:\n${rules.join("\n")}`;
  },
  demo: {
    candidacy: {
      indications: "Decompensated MASH cirrhosis (refractory ascites, hepatic encephalopathy, varices) and hepatocellular carcinoma within Milan criteria",
      urgency: "High: MELD 3.0 is 26, with paracentesis every 3 weeks and sarcopenia",
      verdict: "Suitable to proceed to living-donor liver transplant, subject to the open items",
    },
    hcc: [
      "Single 2.4 cm lesion, no macrovascular invasion or extrahepatic disease: within Milan and UCSF.",
      "AFP 38 ng/mL is below the thresholds used in AFP-based models: a favourable profile.",
      "Bridging therapy is not recommended routinely: with Child-Pugh C, TACE risks further decompensation. If surgery is expected within about 3 months, repeat multiphase imaging at 6–8 weeks.",
    ],
    tracker: [
      { domain: "Cardiac", status: "done", result: "Dobutamine stress echo negative", action: "None" },
      { domain: "Portopulmonary hypertension", status: "done", result: "RVSP 32 mmHg", action: "None" },
      { domain: "Hepatopulmonary syndrome", status: "done", result: "Bubble study negative, PaO2 88", action: "None" },
      { domain: "Kidney", status: "pending", result: "Creatinine 1.3, Na 131", action: "Watch for hepatorenal physiology; avoid nephrotoxins; review diuretics" },
      { domain: "HBV immunity", status: "problem", result: "Anti-HBs <10", action: "Start accelerated HBV vaccination now" },
      { domain: "Strongyloides", status: "pending", result: "Serology pending", action: "Result before transplant; ivermectin if positive" },
      { domain: "CMV / EBV", status: "done", result: "Both IgG positive", action: "Standard prophylaxis and monitoring" },
      { domain: "TB", status: "done", result: "IGRA negative", action: "None" },
      { domain: "Cancer screening", status: "done", result: "Mammogram, Pap and colonoscopy done (adenomas removed)", action: "Colonoscopy surveillance" },
      { domain: "Dental", status: "problem", result: "Two carious molars", action: "Extraction before transplant, with a platelet and INR plan" },
      { domain: "Nutrition", status: "pending", result: "Sarcopenia (SMI 36 cm²/m²)", action: "Dietitian now: 1.2–1.5 g/kg/day protein, late-evening snack" },
      { domain: "Funding", status: "pending", result: "Applications not submitted", action: "Social work and finance desk to start applications" },
    ],
    donor: [
      "Conventional portal vein, artery and bile duct: favourable. Right inferior hepatic vein 6 mm: plan to reconstruct; segment V/VIII veins 4 mm for the surgeons to decide.",
      "Right-lobe donation carries a small but real risk of death (commonly quoted around 0.1–0.5%), major complications such as bile leak in a minority, and several weeks of recovery.",
      "Still needed: independent donor assessment by a physician outside the recipient team, a documented voluntary consent discussion, and confirmation of no coercion or payment.",
    ],
    legal: [
      "The son is a near relative under THOTA 1994 (amended 2011) and THOT Rules 2014.",
      "Proof of relationship (collected), donor and recipient applications with the treating team's certification, and review and approval by the hospital Authorisation Committee, including a donor interview, before surgery.",
      "Record the donor's informed, voluntary consent and his right to withdraw at any time.",
      "Confirm the current prescribed forms and state requirements with the transplant coordinator; consider parallel K-SOTTO registration as a back-up.",
    ],
    openItems: [
      { item: "Strongyloides serology result; treat if positive", owner: "Transplant ID" },
      { item: "Accelerated HBV vaccination started", owner: "Hepatology" },
      { item: "Dental extractions with a platelet and coagulation plan", owner: "Dental + Haematology" },
      { item: "Dietitian and physiotherapy pre-habilitation", owner: "Nutrition / Physio" },
      { item: "Independent donor assessment", owner: "Independent physician" },
      { item: "Authorisation Committee meeting scheduled and approval recorded", owner: "Transplant coordinator" },
      { item: "Funding and assistance applications submitted", owner: "Social work / finance" },
      { item: "Final surgical plan for hepatic vein reconstruction", owner: "Transplant surgery" },
    ],
    family: "Anitha, your liver is badly scarred and is no longer doing its job. There is also a small cancer in it. A new liver is the best treatment for both. Kevin has offered part of his liver, and his tests so far show that the piece we would take is a good size for you, while the part left behind is large enough for him to stay healthy. His liver regrows over a few months. Before surgery, Anitha needs some dental treatment, vaccines and extra nutrition. Kevin will meet a doctor who is not part of your team, and a hospital committee, to make sure this is his free choice. Kevin, you can change your mind at any time, and you do not have to give a reason.",
  },
};

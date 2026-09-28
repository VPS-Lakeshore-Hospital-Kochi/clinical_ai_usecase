import { obj, str, list, oneOf, bool } from "./schema.js";

const whoItem = obj({ item: str(), prefill: str("What the chart supports, or empty"), confirmInOT: bool() });

// Clinician view: admission-day readiness gate across earlier plans + an interactive WHO checklist.
export default {
  instructions: `Run the admission-day readiness gate for this elective operation. Return JSON for the ward and theatre team. The app checks medicine hold times (listed); build on them.
- checklist: items across identity and consent, medical optimisation, medicines, blood, anaesthesia, surgical preparation (bowel preparation, stoma marking, antibiotic and VTE prophylaxis), ERAS and administration. Compare against plans made earlier by other teams.
- actions: what must happen before theatre, each with an owner, a deadline and the checklist item it resolves (exact item name).
- who: the WHO Surgical Safety Checklist pre-filled from the chart; mark items that must be confirmed live in theatre.
- nightBefore: plain English for the patient, under 120 words.`,
  schema: obj({
    checklist: list(obj({ domain: str(), item: str(), status: oneOf(["ok", "warn", "fail"]), evidence: str() })),
    actions: list(obj({ action: str(), owner: str(), deadline: str(), resolves: str() })),
    who: obj({ signIn: list(whoItem), timeOut: list(whoItem), signOut: list(whoItem) }),
    nightBefore: str(),
  }),
  toText(payload) {
    const holds = (payload.holds || []).map((h) => `- ${h}`);
    return `${payload.admission || ""}\n\nApp medicine-hold check (surgery 19 Aug 08:00):\n${holds.join("\n")}`;
  },
  demo: {
    checklist: [
      { domain: "Identity & consent", item: "Identity and allergy bands", status: "ok", evidence: "Sulfonamide allergy band on" },
      { domain: "Identity & consent", item: "Procedure consent", status: "fail", evidence: "Covers resection and open conversion, not the planned possible diverting ileostomy" },
      { domain: "Identity & consent", item: "Anaesthesia consent", status: "ok", evidence: "Signed" },
      { domain: "Medical", item: "Glycaemia", status: "ok", evidence: "HbA1c 8.3% (improving); glucose 168 mg/dL this morning" },
      { domain: "Medical", item: "Anaemia", status: "ok", evidence: "Hb 11.6 after IV iron" },
      { domain: "Medical", item: "Cardiac", status: "ok", evidence: "Stress echo negative; troponin baseline and post-op plan in place" },
      { domain: "Medical", item: "Kidney and potassium", status: "ok", evidence: "Creatinine 1.1, K 4.3" },
      { domain: "Medicines", item: "Empagliflozin", status: "ok", evidence: "Last dose 14 Aug, at least 3 days before surgery" },
      { domain: "Medicines", item: "Telmisartan", status: "warn", evidence: "Last dose 07:00 on 18 Aug meets the 24-hour hold; make sure no dose is given tomorrow morning" },
      { domain: "Medicines", item: "Insulin glargine", status: "fail", evidence: "Tonight's dose not adjusted: give about 80% (10 U instead of 12 U)" },
      { domain: "Blood", item: "Group and screen", status: "warn", evidence: "Sent 10:00, result pending; crossmatch not needed if the screen is negative" },
      { domain: "Anaesthesia", item: "Pre-assessment", status: "ok", evidence: "ASA 3; GA + TAP blocks; airway normal" },
      { domain: "Anaesthesia", item: "PONV prophylaxis", status: "warn", evidence: "Moderate risk: non-steroid antiemetic combination (dexamethasone raises glucose)" },
      { domain: "Surgical preparation", item: "Oral antibiotic bowel preparation", status: "fail", evidence: "Not prescribed; mechanical plus oral antibiotic preparation reduces surgical-site infection in left-sided resection" },
      { domain: "Surgical preparation", item: "Stoma-site marking", status: "fail", evidence: "Not documented, although a diverting ileostomy is possible" },
      { domain: "Surgical preparation", item: "Antibiotic prophylaxis", status: "ok", evidence: "Cefazolin + metronidazole at induction; no sulfonamide" },
      { domain: "Surgical preparation", item: "VTE prophylaxis", status: "warn", evidence: "In-hospital plan fine; add extended 28-day enoxaparin to the discharge plan" },
      { domain: "ERAS", item: "Carbohydrate drink", status: "warn", evidence: "Diabetes on insulin: omit, or give with a glucose check per unit protocol" },
      { domain: "Administration", item: "Insurance and room", status: "ok", evidence: "Cashless approval 14 Aug; standard single within the cap" },
    ],
    actions: [
      { action: "Mark the ileostomy site", owner: "Stoma nurse", deadline: "20:00", resolves: "Stoma-site marking" },
      { action: "Re-consent to add possible diverting loop ileostomy, with a plain-language explanation", owner: "Operating surgeon", deadline: "20:00", resolves: "Procedure consent" },
      { action: "Glargine 10 U tonight; capillary glucose at 06:00 and on arrival in theatre", owner: "Ward doctor / nurse", deadline: "21:00", resolves: "Insulin glargine" },
      { action: "Prescribe oral antibiotic bowel preparation per protocol, or document why it is omitted", owner: "Surgical team", deadline: "18:00", resolves: "Oral antibiotic bowel preparation" },
      { action: "Chase the group-and-screen result", owner: "Ward nurse", deadline: "20:00", resolves: "Group and screen" },
      { action: "Decide on the carbohydrate drink per the diabetes ERAS protocol", owner: "Anaesthesia", deadline: "21:00", resolves: "Carbohydrate drink" },
      { action: "Mark telmisartan \"do not give\" on 19 Aug", owner: "Pharmacy / nurse", deadline: "Tonight", resolves: "Telmisartan" },
      { action: "Plan a non-steroid antiemetic combination", owner: "Anaesthesia", deadline: "Before induction", resolves: "PONV prophylaxis" },
      { action: "Add extended enoxaparin (28 days) to the discharge plan", owner: "Surgical team", deadline: "Before discharge", resolves: "VTE prophylaxis" },
    ],
    who: {
      signIn: [
        { item: "Patient identity, procedure and consent confirmed", prefill: "Laparoscopic anterior resection ± diverting ileostomy; confirm the updated consent", confirmInOT: true },
        { item: "Site marked", prefill: "Midline / laparoscopic; stoma site marked", confirmInOT: true },
        { item: "Anaesthesia machine and medication check complete", prefill: "", confirmInOT: true },
        { item: "Pulse oximeter on and working", prefill: "", confirmInOT: true },
        { item: "Known allergy", prefill: "Sulfonamide antibiotics", confirmInOT: false },
        { item: "Difficult airway or aspiration risk", prefill: "No: normal airway assessment", confirmInOT: false },
        { item: "Risk of >500 mL blood loss", prefill: "Low; group and screen result to confirm", confirmInOT: true },
      ],
      timeOut: [
        { item: "Team members introduced by name and role", prefill: "", confirmInOT: true },
        { item: "Patient, procedure and incision confirmed", prefill: "", confirmInOT: true },
        { item: "Antibiotic prophylaxis given within 60 minutes", prefill: "Cefazolin 2 g + metronidazole 500 mg: record the time", confirmInOT: true },
        { item: "Anticipated critical events reviewed", prefill: "About 3.5 h; ASA 3, insulin-treated diabetes, glucose 140–180; stapler and leak-test kit", confirmInOT: true },
        { item: "Essential imaging displayed", prefill: "CT 1 Aug", confirmInOT: true },
        { item: "Glucose checked before incision", prefill: "Record the value", confirmInOT: true },
      ],
      signOut: [
        { item: "Procedure recorded, including whether a stoma was formed", prefill: "", confirmInOT: true },
        { item: "Instrument, sponge and needle counts correct", prefill: "", confirmInOT: true },
        { item: "Specimen labelled", prefill: "Sigmoid / rectosigmoid resection, orientation marked", confirmInOT: true },
        { item: "Equipment problems addressed", prefill: "", confirmInOT: true },
        { item: "Recovery handover", prefill: "Glucose plan; troponin at 24 h and 48 h; enoxaparin this evening; telmisartan and metformin on hold; empagliflozin only when eating normally", confirmInOT: false },
      ],
    },
    nightBefore: "Mr Thomas, your operation is first on the list tomorrow at 8 am. Tonight, take 10 units of your night insulin, not 12; the nurse will check your sugar at 6 am. Drink the bowel-cleaning medicine as the nurse explains. You can have clear fluids (water, black tea, clear juice) until 6 am. Do not take your BP tablet (telmisartan), metformin or empagliflozin tomorrow morning. The stoma nurse will visit this evening to explain a possible temporary bag and mark the best place for it, just in case. Tell the nurse if you feel shaky or sweaty during the night.",
  },
};

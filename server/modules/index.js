import { DEFAULT_PATIENT_ID } from "../patient.js";
import triage from "./triage.js";
import scribe from "./scribe.js";
import diabetes from "./diabetes.js";
import ortho from "./ortho.js";
import radiology from "./radiology.js";
import oncology from "./oncology.js";
import cardiology from "./cardiology.js";
import preauth from "./preauth.js";
import discharge from "./discharge.js";
import nephrology from "./nephrology.js";
import icu from "./icu.js";
import rehab from "./rehab.js";
import monitoring from "./monitoring.js";
import transplant from "./transplant.js";
import journey from "./journey.js";

export const modules = [triage, scribe, diabetes, ortho, radiology, oncology, cardiology, preauth, discharge, nephrology, icu, rehab, monitoring, journey, transplant].sort(
  (a, b) => a.order - b.order,
);

// Modules belong to Thomas's journey unless they name another patient.
for (const m of modules) m.patientId ??= DEFAULT_PATIENT_ID;

const byId = new Map(modules.map((m) => [m.id, m]));

export function getModule(id) {
  return byId.get(id);
}

// Fields safe to send to the browser (prompts and demo text stay server-side).
export function publicModule(m) {
  const { id, order, title, specialty, stage, date, summary, claudeRole, inputLabel, inputHint, outputLabel, defaultInput, widgets = [], patientId } = m;
  return { id, order, title, specialty, stage, date, summary, claudeRole, inputLabel, inputHint, outputLabel, defaultInput, widgets, patientId };
}

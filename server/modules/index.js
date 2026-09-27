import triage from "./triage.js";
import scribe from "./scribe.js";
import diabetes from "./diabetes.js";
import ortho from "./ortho.js";
import oncology from "./oncology.js";
import cardiology from "./cardiology.js";
import preauth from "./preauth.js";
import discharge from "./discharge.js";
import journey from "./journey.js";

export const modules = [triage, scribe, diabetes, ortho, oncology, cardiology, preauth, discharge, journey].sort(
  (a, b) => a.order - b.order,
);

const byId = new Map(modules.map((m) => [m.id, m]));

export function getModule(id) {
  return byId.get(id);
}

// Fields safe to send to the browser (prompts and demo text stay server-side).
export function publicModule(m) {
  const { id, order, title, specialty, stage, date, summary, claudeRole, inputLabel, inputHint, outputLabel, defaultInput, widgets = [] } = m;
  return { id, order, title, specialty, stage, date, summary, claudeRole, inputLabel, inputHint, outputLabel, defaultInput, widgets };
}

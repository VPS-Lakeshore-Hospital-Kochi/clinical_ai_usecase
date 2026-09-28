import { DEFAULT_PATIENT_ID } from "../patient.js";
import triage from "./triage.js";
import routing from "./routing.js";
import referral from "./referral.js";
import stroke from "./stroke.js";
import scribe from "./scribe.js";
import diabetes from "./diabetes.js";
import ortho from "./ortho.js";
import radiology from "./radiology.js";
import oncology from "./oncology.js";
import cardiology from "./cardiology.js";
import preauth from "./preauth.js";
import preop from "./preop.js";
import nursing from "./nursing.js";
import medrec from "./medrec.js";
import discharge from "./discharge.js";
import coding from "./coding.js";
import labs from "./labs.js";
import nephrology from "./nephrology.js";
import icu from "./icu.js";
import rehab from "./rehab.js";
import monitoring from "./monitoring.js";
import transplant from "./transplant.js";
import heartfailure from "./heartfailure.js";
import decision from "./decision.js";
import antenatal from "./antenatal.js";
import paeds from "./paeds.js";
import journey from "./journey.js";
import triageView from "../interactive/triage.js";
import scribeView from "../interactive/scribe.js";
import nursingView from "../interactive/nursing.js";
import paedsView from "../interactive/paeds.js";
import strokeView from "../interactive/stroke.js";
import decisionView from "../interactive/decision.js";
import radiologyView from "../interactive/radiology.js";
import oncologyView from "../interactive/oncology.js";
import icuView from "../interactive/icu.js";
import preauthView from "../interactive/preauth.js";
import referralView from "../interactive/referral.js";
import preopView from "../interactive/preop.js";
import dischargeView from "../interactive/discharge.js";
import medrecView from "../interactive/medrec.js";
import monitoringView from "../interactive/monitoring.js";
import diabetesView from "../interactive/diabetes.js";
import antenatalView from "../interactive/antenatal.js";
import routingView from "../interactive/routing.js";
import orthoView from "../interactive/ortho.js";
import cardiologyView from "../interactive/cardiology.js";
import codingView from "../interactive/coding.js";
import labsView from "../interactive/labs.js";
import rehabView from "../interactive/rehab.js";
import transplantView from "../interactive/transplant.js";
import heartfailureView from "../interactive/heartfailure.js";
import journeyView from "../interactive/journey.js";
import nephrologyView from "../interactive/nephrology.js";

export const modules = [routing, triage, referral, scribe, diabetes, ortho, radiology, oncology, cardiology, preauth, preop, nursing, discharge, coding, labs, nephrology, icu, medrec, rehab, monitoring, journey, transplant, decision, heartfailure, antenatal, paeds, stroke].sort(
  (a, b) => a.order - b.order,
);

// Modules belong to Thomas's journey unless they name another patient.
// Operational modules that span many patients set patientId: null.
for (const m of modules) if (m.patientId === undefined) m.patientId = DEFAULT_PATIENT_ID;

// Flagship modules with an interactive clinician view (structured output + sample data).
const views = { triage: triageView, scribe: scribeView, nursing: nursingView, paeds: paedsView, stroke: strokeView, decision: decisionView, radiology: radiologyView, oncology: oncologyView, icu: icuView, preauth: preauthView, referral: referralView, preop: preopView, discharge: dischargeView, medrec: medrecView, monitoring: monitoringView, diabetes: diabetesView, antenatal: antenatalView, routing: routingView, ortho: orthoView, cardiology: cardiologyView, nephrology: nephrologyView, coding: codingView, labs: labsView, rehab: rehabView, transplant: transplantView, heartfailure: heartfailureView, journey: journeyView };
for (const m of modules) if (views[m.id]) m.interactive = views[m.id];

const byId = new Map(modules.map((m) => [m.id, m]));

export function getModule(id) {
  return byId.get(id);
}

// Fields safe to send to the browser (prompts and demo text stay server-side).
export function publicModule(m) {
  const { id, order, title, specialty, stage, date, summary, claudeRole, inputLabel, inputHint, outputLabel, defaultInput, widgets = [], patientId } = m;
  return { id, order, title, specialty, stage, date, summary, claudeRole, inputLabel, inputHint, outputLabel, defaultInput, widgets, patientId, interactive: Boolean(m.interactive) };
}

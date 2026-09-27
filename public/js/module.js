import {
  renderHeader, renderPatientStrip, renderStepper, getJSON, esc, formatDate,
  stepsFor, getFiled, fileOutput,
} from "./common.js";
import { attachRunner } from "./runner.js";
import { renderCgmWidget, renderVitalsWidget } from "./charts.js";

const id = new URLSearchParams(location.search).get("id") || "scribe";
if (id === "journey") location.replace("dashboard.html");

renderHeader("home");

const $ = (sel) => document.getElementById(sel);

const mod = await getJSON(`/api/modules/${encodeURIComponent(id)}`);
// Operational modules (for example a routing queue) have no single patient.
const patient = mod.patientId ? await getJSON(`/api/patient?id=${encodeURIComponent(mod.patientId)}`) : null;
const steps = mod.patientId ? stepsFor(mod.patientId) : [];
if (patient) renderStepper($("stepper"), id, mod.patientId);
else $("stepper").hidden = true;

document.title = `${mod.title} · VPS Lakeshore Clinical AI`;
if (patient) renderPatientStrip($("patient"), patient);
else $("patient").hidden = true;
$("module-chips").innerHTML = `
  <span class="chip">${esc(mod.specialty)}</span>
  <span class="chip chip--muted">${formatDate(mod.date)}</span>`;
$("module-title").textContent = mod.title;
$("module-summary").textContent = mod.summary;
$("module-role").textContent = mod.claudeRole;
$("input-label").textContent = mod.inputLabel;
$("input-hint").textContent = mod.inputHint;
$("output-label").textContent = mod.outputLabel;

const input = $("input");
input.value = mod.defaultInput;
$("reset").addEventListener("click", () => (input.value = mod.defaultInput));

if (mod.widgets.includes("cgm")) renderCgmWidget($("widgets"), patient.cgm);
if (mod.widgets.includes("vitals")) renderVitalsWidget($("widgets"), patient.homeMonitoring);

let latest = "";
const approve = $("approve");
const copy = $("copy");
const filedNote = $("filed-note");

const runner = attachRunner({
  moduleId: id,
  getInput: () => input.value,
  runBtn: $("run"),
  sampleBtn: $("sample"),
  output: $("output"),
  empty: $("output-empty"),
  status: $("status"),
  wrap: $("output-wrap"),
  onStart: () => {
    approve.disabled = true;
    copy.disabled = true;
    filedNote.textContent = "";
  },
  onComplete: (text) => {
    latest = text;
    approve.disabled = false;
    copy.disabled = false;
  },
});

approve.addEventListener("click", () => {
  fileOutput(id, { title: mod.title, specialty: mod.specialty, date: mod.date, text: latest });
  approve.disabled = true;
  filedNote.textContent = patient ? "✓ Approved and filed to the patient timeline" : "✓ Approved";
  if (patient) renderStepper($("stepper"), id, mod.patientId);
});

copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(latest);
    copy.textContent = "Copied";
    setTimeout(() => (copy.textContent = "Copy"), 1500);
  } catch {
    copy.textContent = "Copy failed";
  }
});

const filed = getFiled()[id];
if (filed) {
  latest = filed.text;
  runner.show(filed.text, `Filed ${new Date(filed.filedAt).toLocaleString("en-IN")}`);
  copy.disabled = false;
  filedNote.textContent = patient ? "✓ Filed to the patient timeline" : "✓ Approved";
}

const idx = steps.findIndex((s) => s.id === id);
const prev = steps[idx - 1];
const next = steps[idx + 1];
$("module-nav").innerHTML = `
  <span>${prev ? `<a class="btn btn--ghost" href="${prev.href}">← ${esc(prev.label)}</a>` : ""}</span>
  <span>${next ? `<a class="btn btn--secondary" href="${next.href}">Next: ${esc(next.label)} →</a>` : ""}</span>`;

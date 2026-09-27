import {
  renderHeader, renderPatientStrip, renderStepper, getJSON, esc, formatDate,
  JOURNEY_STEPS, getFiled, fileOutput,
} from "./common.js";
import { attachRunner } from "./runner.js";
import { renderCgmWidget } from "./charts.js";

const id = new URLSearchParams(location.search).get("id") || "scribe";
if (id === "journey") location.replace("dashboard.html");

renderHeader("home");
renderStepper(document.getElementById("stepper"), id);

const $ = (sel) => document.getElementById(sel);

const [mod, patient] = await Promise.all([getJSON(`/api/modules/${encodeURIComponent(id)}`), getJSON("/api/patient")]);

document.title = `${mod.title} · VPS Lakeshore Clinical AI`;
renderPatientStrip($("patient"), patient);
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
  filedNote.textContent = "✓ Approved and filed to the patient timeline";
  renderStepper($("stepper"), id);
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
  filedNote.textContent = "✓ Filed to the patient timeline";
}

const idx = JOURNEY_STEPS.findIndex((s) => s.id === id);
const prev = JOURNEY_STEPS[idx - 1];
const next = JOURNEY_STEPS[idx + 1];
$("module-nav").innerHTML = `
  <span>${prev ? `<a class="btn btn--ghost" href="${prev.href}">← ${esc(prev.label)}</a>` : ""}</span>
  <span>${next ? `<a class="btn btn--secondary" href="${next.href}">Next: ${esc(next.label)} →</a>` : ""}</span>`;

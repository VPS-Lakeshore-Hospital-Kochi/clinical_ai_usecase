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

// Flagship modules open in an interactive clinician view; the text workspace stays one tab away.
if (mod.interactive) {
  const tabs = $("view-tabs");
  const views = { clinician: $("clinician-view"), classic: $("classic-view") };
  const show = (name) => {
    for (const [k, v] of Object.entries(views)) v.hidden = k !== name;
    tabs.querySelectorAll("[role=tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.view === name)));
    try { localStorage.setItem("lakeshore.view", name); } catch { /* optional */ }
  };
  tabs.hidden = false;
  tabs.addEventListener("click", (e) => { const v = e.target.closest("[data-view]")?.dataset.view; if (v) show(v); });
  let saved = null;
  try { saved = localStorage.getItem("lakeshore.view"); } catch { /* optional */ }
  show(location.hash === "#classic" || saved === "classic" ? "classic" : "clinician");

  const status = await getJSON("/api/status").catch(() => ({ mode: "demo" }));
  const { default: view } = await import(`./demos/${id}.js`);
  $("guide").innerHTML = view.guide.map((g) => `<li>${esc(g)}</li>`).join("");
  view.mount($("view-root"), {
    mod,
    patient,
    live: status.mode === "live",
    async ask(payload, { demo = false } = {}) {
      const res = await fetch(`/api/interactive/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, demo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      return body;
    },
    file(markdown) {
      fileOutput(id, { title: mod.title, specialty: mod.specialty, date: mod.date, text: markdown });
      if (patient) renderStepper($("stepper"), id, mod.patientId);
    },
  });
}

const idx = steps.findIndex((s) => s.id === id);
const prev = steps[idx - 1];
const next = steps[idx + 1];
$("module-nav").innerHTML = `
  <span>${prev ? `<a class="btn btn--ghost" href="${prev.href}">← ${esc(prev.label)}</a>` : ""}</span>
  <span>${next ? `<a class="btn btn--secondary" href="${next.href}">Next: ${esc(next.label)} →</a>` : ""}</span>`;

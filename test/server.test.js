import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// A local stand-in for the Claude Messages API, so the live code path can be
// exercised without a real key. It records the request and streams a reply.
let lastRequest;
const mockApi = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    lastRequest = { url: req.url, headers: req.headers, body: JSON.parse(body) };
    res.writeHead(200, { "content-type": "text/event-stream" });
    // Structured (clinician view) requests get a JSON answer; text runs get markdown.
    const deltas = lastRequest.body.output_config?.format
      ? [JSON.stringify({ urgency: "Routine" })]
      : ["## Safety flags\n", "- None identified"];
    const events = [
      { type: "message_start", message: { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      ...deltas.map((text) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } })),
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 8 } },
      { type: "message_stop" },
    ];
    for (const e of events) res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
    res.end();
  });
});

let appServer;
let base;

before(async () => {
  await new Promise((r) => mockApi.listen(0, r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${mockApi.address().port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  delete process.env.DEMO_MODE;
  const { createApp } = await import("../server/index.js");
  appServer = createApp({ demoChunkDelayMs: 0, demoDelayMs: 0 }).listen(0);
  await new Promise((r) => appServer.once("listening", r));
  base = `http://127.0.0.1:${appServer.address().port}`;
});

after(() => {
  appServer?.close();
  mockApi.close();
});

async function readEvents(res) {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((f) => f.startsWith("data: "))
    .map((f) => JSON.parse(f.slice(6)));
}

test("lists all twenty-seven modules in journey order without leaking prompts", async () => {
  const mods = await (await fetch(`${base}/api/modules`)).json();
  assert.deepEqual(mods.map((m) => m.id), ["routing", "triage", "referral", "scribe", "diabetes", "ortho", "radiology", "oncology", "cardiology", "preauth", "preop", "nursing", "discharge", "coding", "labs", "nephrology", "icu", "medrec", "rehab", "monitoring", "journey", "transplant", "decision", "heartfailure", "antenatal", "paeds", "stroke"]);
  for (const m of mods) {
    assert.equal(m.system, undefined);
    assert.equal(m.demoOutput, undefined);
  }
});

test("every module has a sample output and builds a prompt", async () => {
  const { modules } = await import("../server/modules/index.js");
  for (const m of modules) {
    assert.ok(m.demoOutput.length > 500, `${m.id} sample output`);
    assert.match(m.demoOutput, /^## /m, `${m.id} sample uses section headings`);
    const prompt = m.buildPrompt(m.defaultInput || "timeline");
    assert.ok(prompt.length > 0);
  }
});

test("serves the synthetic patient", async () => {
  const p = await (await fetch(`${base}/api/patient`)).json();
  assert.equal(p.patient.mrn, "LH-SYN-000158");
  const r = p.cgm.ranges;
  assert.equal(r.veryLow + r.low + r.inRange + r.high + r.veryHigh, 100);
});

test("serves the second patient and rejects unknown ids", async () => {
  const p = await (await fetch(`${base}/api/patient?id=syn-000271`)).json();
  assert.equal(p.patient.mrn, "LH-SYN-000271");
  const missing = await fetch(`${base}/api/patient?id=nobody`);
  assert.equal(missing.status, 404);
  const mods = await (await fetch(`${base}/api/modules`)).json();
  assert.equal(mods.find((m) => m.id === "transplant").patientId, "syn-000271");
  assert.equal(mods.find((m) => m.id === "icu").patientId, "syn-000158");
  assert.equal(mods.find((m) => m.id === "heartfailure").patientId, "syn-000342");
  const hf = await (await fetch(`${base}/api/patient?id=syn-000342`)).json();
  assert.equal(hf.patient.mrn, "LH-SYN-000342");
  for (const [mod, id] of [["antenatal", "syn-000415"], ["paeds", "syn-000416"], ["decision", "syn-000342"]]) {
    assert.equal(mods.find((m) => m.id === mod).patientId, id);
    const p = await (await fetch(`${base}/api/patient?id=${id}`)).json();
    assert.equal(p.patient.id, id);
  }
});

test("transplant prompt carries the transplant patient's record", async () => {
  const { buildRequest } = await import("../server/claude.js");
  const { getModule } = await import("../server/modules/index.js");
  const req = buildRequest(getModule("transplant"), "x");
  assert.match(req.system[0].text, /LH-SYN-000271/);
  assert.doesNotMatch(req.system[0].text, /LH-SYN-000158/);
  assert.match(req.messages[0].content, /^Today is 2026-09-22\./);
});

test("operational modules run without a patient record", async () => {
  const { buildRequest } = await import("../server/claude.js");
  const { getModule } = await import("../server/modules/index.js");
  const routing = getModule("routing");
  assert.equal(routing.patientId, null);
  const req = buildRequest(routing, "queue");
  assert.doesNotMatch(req.system[0].text, /patient_record/);
  const stroke = await (await fetch(`${base}/api/patient?id=syn-000527`)).json();
  assert.equal(stroke.patient.mrn, "LH-SYN-000527");
});

test("reports live mode when a credential is set", async () => {
  const s = await (await fetch(`${base}/api/status`)).json();
  assert.equal(s.mode, "live");
  assert.equal(s.model, "claude-opus-5");
});

test("live run streams Claude text and sends the expected request", async () => {
  const res = await fetch(`${base}/api/run/scribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "Doctor: Hello." }),
  });
  const events = await readEvents(res);
  assert.equal(events[0].type, "meta");
  assert.equal(events[0].mode, "live");
  const text = events.filter((e) => e.type === "text").map((e) => e.text).join("");
  assert.equal(text, "## Safety flags\n- None identified");
  assert.equal(events.at(-1).type, "done");
  assert.equal(events.at(-1).model, "claude-opus-5");

  assert.match(lastRequest.url, /^\/v1\/messages/);
  assert.match(lastRequest.headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
  const b = lastRequest.body;
  assert.equal(b.model, "claude-opus-5");
  assert.equal(b.fallbacks, "default");
  assert.equal(b.stream, true);
  assert.deepEqual(b.thinking, { type: "adaptive" });
  assert.equal(b.system[0].cache_control.type, "ephemeral");
  assert.match(b.system[0].text, /LH-SYN-000158/);
  assert.match(b.messages[0].content, /Doctor: Hello\./);
  assert.match(b.messages[0].content, /^Today is 2026-07-06\./);
});

test("demo run replays the sample output", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const res = await fetch(`${base}/api/run/oncology`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "x", demo: true }),
  });
  const events = await readEvents(res);
  assert.equal(events[0].mode, "demo");
  const text = events.filter((e) => e.type === "text").map((e) => e.text).join("");
  assert.equal(text, getModule("oncology").demoOutput);
});

test("rejects empty input and unknown modules", async () => {
  const empty = await fetch(`${base}/api/run/scribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "  " }),
  });
  assert.equal(empty.status, 400);
  const unknown = await fetch(`${base}/api/run/nope`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: "x" }),
  });
  assert.equal(unknown.status, 404);
});

test("serves pages and vendored libraries", async () => {
  for (const path of ["/", "/module.html", "/dashboard.html", "/vendor/marked/marked.esm.js", "/vendor/dompurify/purify.es.mjs"]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 200, path);
  }
});

// Minimal JSON Schema check for the strict schemas used by the clinician views.
function conforms(schema, value, path = "$") {
  if (schema.enum) assert.ok(schema.enum.includes(value), `${path}: ${value} not in enum`);
  if (schema.type === "object") {
    assert.equal(typeof value, "object", `${path} should be an object`);
    assert.deepEqual(Object.keys(value).sort(), [...schema.required].sort(), `${path} keys`);
    for (const [k, sub] of Object.entries(schema.properties)) conforms(sub, value[k], `${path}.${k}`);
  } else if (schema.type === "array") {
    assert.ok(Array.isArray(value) && value.length > 0, `${path} should be a non-empty array`);
    value.forEach((v, i) => conforms(schema.items, v, `${path}[${i}]`));
  } else if (schema.type === "integer") assert.ok(Number.isInteger(value), `${path} should be an integer`);
  else if (schema.type) assert.equal(typeof value, schema.type, `${path} should be ${schema.type}`);
}

const FLAGSHIPS = ["triage", "scribe", "nursing", "paeds", "stroke", "decision", "radiology", "oncology", "icu", "preauth", "referral", "preop", "discharge", "medrec", "monitoring", "diabetes", "antenatal", "routing"];

test("flagship sample data matches each clinician view's schema", async () => {
  const { getModule } = await import("../server/modules/index.js");
  for (const id of FLAGSHIPS) {
    const view = getModule(id).interactive;
    assert.ok(view, `${id} has a clinician view`);
    conforms(view.schema, view.demo, id);
    if (view.demoFor) conforms(view.schema, view.demoFor({ scenario: "chest-pain" }), `${id} (variation)`);
    assert.ok(view.toText({}).length > 0);
  }
  const mods = await (await fetch(`${base}/api/modules`)).json();
  assert.deepEqual(mods.filter((m) => m.interactive).map((m) => m.id).sort(), [...FLAGSHIPS].sort());
});

test("scribe sample cites real transcript lines", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const mod = getModule("scribe");
  const n = mod.defaultInput.split("\n").filter((l) => l.trim()).length;
  const d = mod.interactive.demo;
  for (const item of [...d.safetyFlags, ...d.codes, ...d.orders]) {
    for (const l of item.lines) assert.ok(l >= 1 && l <= n, `line ${l} out of range`);
  }
});

test("radiology sample quotes are verbatim in the dictation", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const mod = getModule("radiology");
  for (const issue of mod.interactive.demo.issues) {
    for (const q of issue.quotes) assert.ok(mod.defaultInput.includes(q), `quote not found: ${q}`);
  }
});

test("records digest sources quote their documents verbatim", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const { splitDocuments } = await import("../public/js/clinical.js");
  const mod = getModule("referral");
  const docs = Object.fromEntries(splitDocuments(mod.defaultInput).map((x) => [x.letter, x.text]));
  assert.deepEqual(Object.keys(docs), ["A", "B", "C", "D", "E", "F", "Record"]);
  const d = mod.interactive.demo;
  for (const item of [...d.redFlags, ...d.problems, ...d.medicines, ...d.allergies, ...d.updates]) {
    for (const src of item.sources) if (src.quote) assert.ok(docs[src.doc].includes(src.quote), `not in ${src.doc}: ${src.quote}`);
  }
});

test("pre-op actions resolve real checklist items", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const d = getModule("preop").interactive.demo;
  const items = new Set(d.checklist.map((c) => c.item));
  for (const a of d.actions) assert.ok(items.has(a.resolves), `unknown item: ${a.resolves}`);
  for (const c of d.checklist.filter((x) => x.status === "fail")) assert.ok(d.actions.some((a) => a.resolves === c.item), `no action for blocking item ${c.item}`);
});

test("routing sample uses valid roster slots and escalates every emergency flag", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const { QUEUE, ROSTER } = await import("../public/js/routing-data.js");
  const { screenRequest, slotCheck } = await import("../public/js/clinical.js");
  const d = getModule("routing").interactive.demo;
  const used = {};
  for (const r of d.routes) {
    const slot = ROSTER.find((s) => s.id === r.slotId);
    const check = slotCheck(slot, r.urgency, used[r.slotId] || 0);
    assert.ok(check.ok, `${r.request} → ${r.slotId}: ${check.reason}`);
    used[r.slotId] = (used[r.slotId] || 0) + 1;
  }
  const merged = new Set(d.duplicates.flatMap((x) => x.requests.slice(1)));
  for (const q of QUEUE) if (!merged.has(q.id)) assert.ok(d.routes.some((r) => r.request === q.id), `${q.id} not routed`);
  for (const q of QUEUE) if (screenRequest(`${q.from}: ${q.text}`).some((f) => f.level === "emergency")) assert.ok(d.escalations.some((e) => e.request === q.id), `${q.id} not escalated`);
});

test("diabetes and antenatal samples stay consistent with the app's rules", async () => {
  const { getModule } = await import("../server/modules/index.js");
  const dm = getModule("diabetes").interactive.demo;
  for (const p of dm.patterns) assert.ok(p.fromHour >= 0 && p.toHour <= 23 && p.fromHour <= p.toHour, p.title);
  assert.match(dm.changes.find((c) => c.drug === "Insulin glargine").suggested, /^1[34] U/);
  assert.equal(dm.changes.find((c) => c.drug === "Glimepiride").kind, "Stop");
  const an = getModule("antenatal").interactive.demo;
  for (const p of ["Blood pressure", "Gestational diabetes", "Anaemia", "Rhesus", "Fetal wellbeing"]) assert.ok(an.orders.some((o) => o.problem === p), p);
});

test("clinician view returns sample data offline and validates input", async () => {
  const post = (id, body) => fetch(`${base}/api/interactive/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const res = await post("paeds", { payload: { orders: [] }, demo: true });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mode, "demo");
  assert.ok(body.data.appropriateness.length);
  assert.match(body.input, /Orders and the app's dose check/);
  const chest = await (await post("triage", { payload: { scenario: "chest-pain", conversation: [] }, demo: true })).json();
  assert.equal(chest.data.urgency, "Emergency now");
  assert.equal((await post("coding", { payload: {}, demo: true })).status, 404);
  assert.equal((await post("rehab", { payload: {}, demo: true })).status, 404);
  assert.equal((await post("triage", { demo: true })).status, 400);
});

test("live clinician view sends a JSON-schema request and parses the answer", async () => {
  const res = await fetch(`${base}/api/interactive/triage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: { conversation: [{ from: "patient", text: "My sugar is high" }], mrn: "LH-SYN-000158" } }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mode, "live");
  assert.deepEqual(body.data, { urgency: "Routine" });
  const req = lastRequest.body;
  assert.equal(req.output_config.format.type, "json_schema");
  assert.equal(req.output_config.format.schema.additionalProperties, false);
  assert.equal(req.fallbacks, "default");
  assert.match(req.messages[0].content, /Today is 2026-07-02/);
  assert.match(req.messages[0].content, /Patient: My sugar is high/);
  assert.match(req.system[0].text, /<patient_record>/);
});

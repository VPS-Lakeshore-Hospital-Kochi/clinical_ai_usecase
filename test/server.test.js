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
    const events = [
      { type: "message_start", message: { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "## Safety flags\n" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "- None identified" } },
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
  appServer = createApp({ demoChunkDelayMs: 0 }).listen(0);
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

test("lists the eleven journey modules without leaking prompts", async () => {
  const mods = await (await fetch(`${base}/api/modules`)).json();
  assert.deepEqual(mods.map((m) => m.id), ["triage", "scribe", "diabetes", "ortho", "radiology", "oncology", "cardiology", "preauth", "discharge", "nephrology", "journey"]);
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

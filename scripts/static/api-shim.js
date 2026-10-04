// Offline API for the static build. The pages call /api/* exactly as they do against the
// Node server; this script answers those calls in the browser from the bundled sample data,
// with the same response shapes as server/index.js in demo mode.
(() => {
  const DATA = window.__LK_STATIC;
  const realFetch = window.fetch.bind(window);
  const INTERACTIVE_DELAY_MS = 900;
  const CHUNK_DELAY_MS = 12;

  let viewsPromise;
  const loadViews = () => (viewsPromise ??= import(new URL("js/views.js", document.baseURI).href).then((m) => m.default));

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const wait = (ms, signal) => new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });

  // Replays a module's sample output as server-sent events, like server/demo.js.
  function streamDemo(text, signal) {
    const tokens = text.match(/\S+\s*|\s+/g) ?? [];
    const enc = new TextEncoder();
    const frame = (obj) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(frame({ type: "meta", mode: "demo" }));
        try {
          for (let i = 0; i < tokens.length; i += 3) {
            await wait(CHUNK_DELAY_MS, signal);
            controller.enqueue(frame({ type: "text", text: tokens.slice(i, i + 3).join("") }));
          }
          controller.enqueue(frame({ type: "done", model: "sample output" }));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
    return new Response(body, { headers: { "Content-Type": "text/event-stream; charset=utf-8" } });
  }

  async function handle(url, init) {
    const route = url.pathname.slice(url.pathname.indexOf("/api/") + 5).split("/").map(decodeURIComponent);
    const method = (init?.method || "GET").toUpperCase();
    const body = () => { try { return JSON.parse(init?.body || "{}"); } catch { return {}; } };

    if (route[0] === "status") return json({ mode: "demo", model: "sample output" });
    if (route[0] === "modules" && route.length === 1) return json(DATA.modules);
    if (route[0] === "modules") {
      const mod = DATA.modules.find((m) => m.id === route[1]);
      return mod ? json(mod) : json({ error: "Unknown module" }, 404);
    }
    if (route[0] === "patient") {
      const p = DATA.patients[url.searchParams.get("id") || DATA.defaultPatientId];
      return p ? json(p) : json({ error: "Unknown patient" }, 404);
    }
    if (route[0] === "run" && method === "POST") {
      const text = DATA.demoOutputs[route[1]];
      if (text === undefined) return json({ error: "Unknown module" }, 404);
      if (!String(body().input ?? "").trim()) return json({ error: "Input is empty" }, 400);
      return streamDemo(text, init?.signal);
    }
    if (route[0] === "interactive" && method === "POST") {
      const view = (await loadViews())[route[1]];
      if (!view) return json({ error: "This module has no clinician view" }, 404);
      const { payload } = body();
      if (!payload || typeof payload !== "object") return json({ error: "Missing payload" }, 400);
      await wait(INTERACTIVE_DELAY_MS, init?.signal);
      const data = view.demoFor?.(payload) ?? view.demo;
      return json({ mode: "demo", model: "sample output", data, input: view.toText(payload) });
    }
    return json({ error: "Not found" }, 404);
  }

  window.fetch = (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    if (!url.pathname.includes("/api/")) return realFetch(input, init);
    return handle(url, init);
  };
})();

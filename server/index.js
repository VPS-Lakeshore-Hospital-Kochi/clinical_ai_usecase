import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { modules, getModule, publicModule } from "./modules/index.js";
import { patient } from "./patient.js";
import { streamModule, liveMode, MODEL, RefusalError } from "./claude.js";
import { streamDemo } from "./demo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const MAX_INPUT_CHARS = 60_000;

export function createApp({ demoChunkDelayMs } = {}) {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.use(express.static(path.join(root, "public")));
  app.use("/vendor/marked", express.static(path.join(root, "node_modules/marked/lib")));
  app.use("/vendor/dompurify", express.static(path.join(root, "node_modules/dompurify/dist")));

  app.get("/api/status", (_req, res) => {
    res.json({ mode: liveMode() ? "live" : "demo", model: MODEL });
  });

  app.get("/api/modules", (_req, res) => {
    res.json(modules.map(publicModule));
  });

  app.get("/api/modules/:id", (req, res) => {
    const mod = getModule(req.params.id);
    if (!mod) return res.status(404).json({ error: "Unknown module" });
    res.json(publicModule(mod));
  });

  app.get("/api/patient", (_req, res) => {
    res.json(patient);
  });

  // Runs a module and streams the result as server-sent events:
  //   {type:"meta", mode}  {type:"text", text}  {type:"done", model, usage}  {type:"error", error}
  app.post("/api/run/:id", async (req, res) => {
    const mod = getModule(req.params.id);
    if (!mod) return res.status(404).json({ error: "Unknown module" });

    const input = typeof req.body?.input === "string" ? req.body.input : "";
    if (!input.trim()) return res.status(400).json({ error: "Input is empty" });
    if (input.length > MAX_INPUT_CHARS) return res.status(413).json({ error: "Input is too long" });

    const mode = req.body?.demo === true || !liveMode() ? "demo" : "live";

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const abort = new AbortController();
    res.on("close", () => abort.abort());

    send({ type: "meta", mode });
    const onText = (text) => send({ type: "text", text });

    try {
      if (mode === "demo") {
        await streamDemo(mod.demoOutput, onText, { signal: abort.signal, chunkDelayMs: demoChunkDelayMs });
        send({ type: "done", model: "sample output" });
      } else {
        const { model, usage } = await streamModule(mod, input, onText, { signal: abort.signal });
        send({ type: "done", model, usage });
      }
    } catch (err) {
      if (!abort.signal.aborted) send({ type: "error", error: describeError(err) });
    } finally {
      res.end();
    }
  });

  return app;
}

function describeError(err) {
  if (err instanceof RefusalError) return `Claude declined this request: ${err.message}`;
  if (err instanceof Anthropic.AuthenticationError) return "The Claude API credential was rejected. Check ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API. Wait a moment and try again.";
  if (err instanceof Anthropic.APIError) return `Claude API error${err.status ? ` ${err.status}` : ""}: ${err.message}`;
  console.error(err);
  return "Unexpected server error.";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`VPS Lakeshore Clinical AI Showcase on http://localhost:${port}`);
    console.log(liveMode() ? `Live mode: ${MODEL}` : "Demo mode: sample outputs (set ANTHROPIC_API_KEY for live Claude)");
  });
}

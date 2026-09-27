import Anthropic from "@anthropic-ai/sdk";
import { composeSystem } from "./modules/common.js";
import { patientSummaryFor } from "./patient.js";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const EFFORT = process.env.CLAUDE_EFFORT || "high";

export function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function liveMode() {
  return process.env.DEMO_MODE !== "1" && hasCredentials();
}

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export class RefusalError extends Error {}

// The record spans the whole journey; each step only knows what existed on its date.
export function asOfNote(date) {
  return `Today is ${date}. Only record entries dated on or before today are known at this point in the journey; ignore anything dated later.`;
}

// Builds the request for a module run. The system prompt and patient record
// come first and never change between runs, so they are cached.
export function buildRequest(mod, input) {
  return {
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    system: [
      {
        type: "text",
        text: `${composeSystem(mod.system)}\n\n<patient_record>\n${patientSummaryFor(mod.patientId)}\n</patient_record>`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: `${asOfNote(mod.date)}\n\n${mod.buildPrompt(input)}` }],
  };
}

// Streams Claude's answer for a module, calling onText with each text delta.
// Resolves with { model, usage } once the message is complete.
export async function streamModule(mod, input, onText, { signal } = {}) {
  const stream = getClient().beta.messages.stream(buildRequest(mod, input), { signal });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      onText(event.delta.text);
    }
  }

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new RefusalError(
      message.stop_details?.explanation || "Claude declined this request.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    onText("\n\n> _Output reached the length limit and was cut short._\n");
  }
  return { model: message.model, usage: message.usage };
}

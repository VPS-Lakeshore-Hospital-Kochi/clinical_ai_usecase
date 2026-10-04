// Replays a module's pre-written sample output in small chunks so the UI
// behaves the same as a live streamed response. Used when no API credential is
// configured, or when the presenter asks for the sample explicitly.
export async function streamDemo(text, onText, { signal, chunkDelayMs = 12 } = {}) {
  const tokens = text.match(/\S+\s*|\s+/g) ?? [];
  for (let i = 0; i < tokens.length; i += 3) {
    if (signal?.aborted) return;
    onText(tokens.slice(i, i + 3).join(""));
    if (chunkDelayMs > 0) await new Promise((r) => setTimeout(r, chunkDelayMs));
  }
}

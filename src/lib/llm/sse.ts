// Reads an OpenAI-compatible SSE stream and yields content deltas.
export async function* readSseDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        const delta = parseSseLine(line);
        if (delta === null) return;
        if (delta) yield delta;
      }
    }
    const tail = parseSseLine(buffer.trim());
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

// Returns the delta text, "" for lines without content, or null for [DONE].
export function parseSseLine(line: string): string | null {
  if (!line.startsWith("data:")) return "";
  const data = line.slice(5).trim();
  if (data === "[DONE]") return null;
  try {
    const json = JSON.parse(data) as { choices?: { delta?: { content?: string | null } }[] };
    return json.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

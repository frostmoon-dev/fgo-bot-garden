// Reasoning models often put their thinking in the reply itself, inside <think>…</think> (also <thinking>,
// <reasoning>). It is never story, so it is cut out before the reply is streamed or saved.
const OPEN = /<(think|thinking|reasoning)>/i;
const CLOSE = /<\/(think|thinking|reasoning)>/i;
// The longest tag, so a tag split across deltas is still found.
const HOLD = "</reasoning>".length - 1;

export function stripReasoning(text: string): string {
  let out = text.replace(/<(think|thinking|reasoning)>[\s\S]*?(?:<\/\1>|$)/gi, "");
  // Some providers drop the opening tag: everything before a lone closing tag was thinking.
  const close = out.match(CLOSE);
  if (close) out = out.slice(close.index! + close[0].length);
  return out.replace(/^\s+/, "");
}

export async function* stripReasoningStream(deltas: AsyncIterable<string>): AsyncGenerator<string> {
  let pending = "";
  let thinking = false;
  let started = false;
  for await (const delta of deltas) {
    pending += delta;
    while (true) {
      if (thinking) {
        const close = pending.match(CLOSE);
        if (!close) {
          pending = pending.slice(Math.max(0, pending.length - HOLD));
          break;
        }
        pending = pending.slice(close.index! + close[0].length);
        thinking = false;
        continue;
      }
      const open = pending.match(OPEN);
      const close = pending.match(CLOSE);
      if (close && (!open || close.index! < open.index!)) {
        // A lone closing tag: what came before it (and was already sent) was thinking. Only the tag can go.
        pending = pending.slice(0, close.index) + pending.slice(close.index! + close[0].length);
        continue;
      }
      let text: string;
      if (open) {
        text = pending.slice(0, open.index);
        pending = pending.slice(open.index! + open[0].length);
        thinking = true;
      } else {
        const safe = pending.length - HOLD;
        // A "<" near the end may be the start of a tag: hold it back.
        const cut = safe > 0 ? safe : 0;
        text = pending.slice(0, cut);
        pending = pending.slice(cut);
      }
      if (!started) text = text.replace(/^\s+/, "");
      if (text) {
        started = true;
        yield text;
      }
      if (!open) break;
    }
  }
  if (!thinking) {
    const text = started ? pending : pending.replace(/^\s+/, "");
    if (text) yield text;
  }
}

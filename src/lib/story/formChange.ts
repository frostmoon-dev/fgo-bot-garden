// Switching a character's ascension in a running story adds this line to it. It shows on stage as
// narration, stays in the history, and the next prompt reads it to tell the model the change just happened.

const FORM_CHANGE = /^\(narration\) (.+) changes form: (.+)\.$/;

export function formChangeLine(name: string, form: string): string {
  return `(narration) ${name} changes form: ${form}.`;
}

export function readFormChange(content: string): { name: string; form: string } | null {
  const m = content.trim().match(FORM_CHANGE);
  return m ? { name: m[1], form: m[2] } : null;
}

// Form changes since the characters last spoke: the newest messages, skipping the user's own.
export function pendingFormChanges(messages: { role: string; content: string }[]): { name: string; form: string }[] {
  const out: { name: string; form: string }[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") continue;
    const change = readFormChange(m.content);
    if (!change) break;
    // Switched twice before a reply: only the latest form counts.
    if (!out.some((c) => c.name === change.name)) out.unshift(change);
  }
  return out;
}

export function formChangeNote(change: { name: string; form: string }): string {
  return `${change.name} has just changed form: ${change.form}. In this reply, show it: ${change.name} and anyone present notice the change and react in character, then ${change.name} carries on as this form (its description, personality and voice above). It is the same ${change.name}: they remember everything that happened before the change, and the story continues from where it was.`;
}

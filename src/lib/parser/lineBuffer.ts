// Splits streamed text into complete lines. A line is only released once its newline arrives,
// so a half-received tag is never shown.
export class LineBuffer {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const parts = this.buffer.split(/\r?\n/);
    this.buffer = parts.pop() ?? "";
    return parts;
  }

  flush(): string[] {
    const rest = this.buffer;
    this.buffer = "";
    return rest.trim() ? [rest] : [];
  }
}

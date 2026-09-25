import { describe, expect, it } from "vitest";
import { LineBuffer } from "../lineBuffer";

describe("LineBuffer", () => {
  it("only releases complete lines", () => {
    const buf = new LineBuffer();
    expect(buf.push("[BB|sm")).toEqual([]);
    expect(buf.push("irk] Hi\n(narr")).toEqual(["[BB|smirk] Hi"]);
    expect(buf.push("ation) Rain.\r\n")).toEqual(["(narration) Rain."]);
  });

  it("flushes the last line without a newline", () => {
    const buf = new LineBuffer();
    buf.push("a\nlast line");
    expect(buf.flush()).toEqual(["last line"]);
    expect(buf.flush()).toEqual([]);
  });

  it("releases several lines from one chunk", () => {
    expect(new LineBuffer().push("a\nb\nc")).toEqual(["a", "b"]);
  });
});

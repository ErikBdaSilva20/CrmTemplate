import { describe, it, expect } from "vitest";
import { parseCsv, escapeCsvField } from "./csv";

describe("parseCsv", () => {
  it("splits plain comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("does not split a comma inside quotes", () => {
    const csv = 'name,note\nAcme,"Empresa, LTDA"';
    expect(parseCsv(csv)).toEqual([
      ["name", "note"],
      ["Acme", "Empresa, LTDA"],
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    const csv = 'name\n"Say ""hi"""';
    expect(parseCsv(csv)).toEqual([["name"], ['Say "hi"']]);
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n3,4";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("supports a newline embedded inside a quoted field", () => {
    const csv = 'name,note\nAcme,"line one\nline two"';
    expect(parseCsv(csv)).toEqual([
      ["name", "note"],
      ["Acme", "line one\nline two"],
    ]);
  });

  it("ignores fully empty lines", () => {
    const csv = "a,b\n1,2\n\n3,4\n";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("escapeCsvField", () => {
  it("prefixes a leading '=' to neutralize formula injection (CWE-1236)", () => {
    expect(escapeCsvField("=cmd|'/c calc'")).toBe("'=cmd|'/c calc'");
  });

  it("prefixes a leading '+', '-' or '@' the same way", () => {
    expect(escapeCsvField("+1234")).toBe("'+1234");
    expect(escapeCsvField("-1234")).toBe("'-1234");
    expect(escapeCsvField("@mention")).toBe("'@mention");
  });

  it("leaves an ordinary value untouched", () => {
    expect(escapeCsvField("Acme Inc")).toBe("Acme Inc");
  });

  it("still quotes a formula-prefixed value that also contains a comma", () => {
    expect(escapeCsvField("=1,2")).toBe('"\'=1,2"');
  });

  it("does not touch a minus sign that isn't the first character", () => {
    expect(escapeCsvField("R$ -100")).toBe("R$ -100");
  });
});

import { describe, it, expect } from "vitest";
import { runBatch } from "./batch";

describe("runBatch", () => {
  it("reports every id as succeeded when the action always resolves", async () => {
    const result = await runBatch(["a", "b", "c"], async () => "ok");
    expect(result.succeededIds).toEqual(["a", "b", "c"]);
    expect(result.failed).toEqual([]);
  });

  it("reports every id as failed when the action always rejects", async () => {
    const result = await runBatch(["a", "b"], async () => {
      throw new Error("boom");
    });
    expect(result.succeededIds).toEqual([]);
    expect(result.failed.map((f) => f.id)).toEqual(["a", "b"]);
    expect(result.failed[0].error).toBeInstanceOf(Error);
  });

  it("separates succeeded from failed ids in a mixed batch, without aborting the others", async () => {
    const result = await runBatch(["ok-1", "fail", "ok-2"], async (id) => {
      if (id === "fail") throw new Error("nope");
      return id;
    });
    expect(result.succeededIds).toEqual(["ok-1", "ok-2"]);
    expect(result.failed.map((f) => f.id)).toEqual(["fail"]);
  });

  it("returns empty results for an empty id list", async () => {
    const result = await runBatch<string>([], async () => "unreachable");
    expect(result.succeededIds).toEqual([]);
    expect(result.failed).toEqual([]);
  });
});

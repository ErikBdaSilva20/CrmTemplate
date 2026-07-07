import { describe, it, expect } from "vitest";
import { isAllSelected, toggleSetAll, toggleSetOne } from "./selection";

describe("isAllSelected", () => {
  it("is false for an empty id list, even with an empty selection", () => {
    expect(isAllSelected(new Set(), [])).toBe(false);
  });

  it("is true only when every id is selected", () => {
    expect(isAllSelected(new Set(["a", "b"]), ["a", "b"])).toBe(true);
    expect(isAllSelected(new Set(["a"]), ["a", "b"])).toBe(false);
  });
});

describe("toggleSetAll", () => {
  it("selects every id when not all are selected", () => {
    const result = toggleSetAll(new Set(["a"]), ["a", "b", "c"]);
    expect(result).toEqual(new Set(["a", "b", "c"]));
  });

  it("clears the selection when all ids are already selected", () => {
    const result = toggleSetAll(new Set(["a", "b"]), ["a", "b"]);
    expect(result).toEqual(new Set());
  });

  it("does not mutate the input set", () => {
    const original = new Set(["a"]);
    toggleSetAll(original, ["a", "b"]);
    expect(original).toEqual(new Set(["a"]));
  });
});

describe("toggleSetOne", () => {
  it("adds an id that is not yet selected", () => {
    expect(toggleSetOne(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
  });

  it("removes an id that is already selected", () => {
    expect(toggleSetOne(new Set(["a", "b"]), "b")).toEqual(new Set(["a"]));
  });

  it("does not mutate the input set", () => {
    const original = new Set(["a"]);
    toggleSetOne(original, "b");
    expect(original).toEqual(new Set(["a"]));
  });
});

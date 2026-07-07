import { describe, it, expect } from "vitest";
import { getTaskBucket, dueDateForBucket } from "./tasks";

describe("getTaskBucket", () => {
  const now = new Date(2026, 5, 20, 12, 0, 0);

  it("returns 'done' for a completed task regardless of due_date", () => {
    expect(getTaskBucket({ due_date: new Date(2026, 4, 1).toISOString(), completed_at: new Date().toISOString() }, now)).toBe("done");
  });

  it("returns 'upcoming' when there is no due_date", () => {
    expect(getTaskBucket({ due_date: null, completed_at: null }, now)).toBe("upcoming");
  });

  it("returns 'overdue' for a due_date before today", () => {
    expect(getTaskBucket({ due_date: new Date(2026, 5, 19).toISOString(), completed_at: null }, now)).toBe("overdue");
  });

  it("returns 'today' for a due_date within today's range", () => {
    expect(getTaskBucket({ due_date: new Date(2026, 5, 20, 8, 0).toISOString(), completed_at: null }, now)).toBe("today");
  });

  it("returns 'upcoming' for a due_date after today", () => {
    expect(getTaskBucket({ due_date: new Date(2026, 5, 25).toISOString(), completed_at: null }, now)).toBe("upcoming");
  });
});

describe("dueDateForBucket", () => {
  const now = new Date(2026, 5, 20);

  it("targets yesterday for 'overdue'", () => {
    expect(new Date(dueDateForBucket("overdue", now)).getDate()).toBe(19);
  });

  it("targets today for 'today'", () => {
    expect(new Date(dueDateForBucket("today", now)).getDate()).toBe(20);
  });

  it("targets 7 days ahead for 'upcoming'", () => {
    expect(new Date(dueDateForBucket("upcoming", now)).getDate()).toBe(27);
  });
});

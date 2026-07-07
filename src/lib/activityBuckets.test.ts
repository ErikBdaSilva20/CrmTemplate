import { describe, it, expect } from "vitest";
import { filterByBucket, countByBucket, type Bucketable, type OperationalBucket } from "./activityBuckets";

const now = new Date(2026, 5, 17, 12, 0, 0); // Wednesday, 17 Jun 2026

function item(overrides: Partial<Bucketable>): Bucketable {
  return { due_date: null, completed_at: null, ...overrides };
}

describe("filterByBucket", () => {
  it("'todo' returns every item without completed_at, regardless of due_date", () => {
    const items = [item({}), item({ due_date: new Date(2020, 0, 1).toISOString() }), item({ completed_at: now.toISOString() })];
    expect(filterByBucket(items, "todo", now)).toHaveLength(2);
  });

  it("'done' returns only completed items, regardless of due_date", () => {
    const items = [item({ completed_at: now.toISOString() }), item({})];
    expect(filterByBucket(items, "done", now)).toHaveLength(1);
  });

  it("'overdue' requires a due_date strictly before now and not completed", () => {
    const items = [
      item({ due_date: new Date(2026, 5, 16).toISOString() }), // overdue
      item({ due_date: new Date(2026, 5, 18).toISOString() }), // future
      item({ due_date: new Date(2026, 5, 16).toISOString(), completed_at: now.toISOString() }), // completed, excluded
      item({ due_date: null }), // no due_date, excluded
    ];
    expect(filterByBucket(items, "overdue", now)).toHaveLength(1);
  });

  it("'today' matches a due_date within today's day boundaries", () => {
    const items = [
      item({ due_date: new Date(2026, 5, 17, 8, 0).toISOString() }),
      item({ due_date: new Date(2026, 5, 18, 8, 0).toISOString() }),
    ];
    expect(filterByBucket(items, "today", now)).toHaveLength(1);
  });

  it("'tomorrow' matches a due_date within tomorrow's day boundaries", () => {
    const items = [
      item({ due_date: new Date(2026, 5, 18, 8, 0).toISOString() }),
      item({ due_date: new Date(2026, 5, 17, 8, 0).toISOString() }),
    ];
    expect(filterByBucket(items, "tomorrow", now)).toHaveLength(1);
  });

  it("'this_week' matches the Monday-Sunday week containing now", () => {
    const items = [
      item({ due_date: new Date(2026, 5, 15).toISOString() }), // Monday of this week
      item({ due_date: new Date(2026, 5, 21).toISOString() }), // Sunday of this week
      item({ due_date: new Date(2026, 5, 22).toISOString() }), // Monday of next week
    ];
    expect(filterByBucket(items, "this_week", now)).toHaveLength(2);
  });

  it("'next_week' matches the following Monday-Sunday week", () => {
    const items = [
      item({ due_date: new Date(2026, 5, 22).toISOString() }), // next Monday
      item({ due_date: new Date(2026, 5, 21).toISOString() }), // this week's Sunday
    ];
    expect(filterByBucket(items, "next_week", now)).toHaveLength(1);
  });

  it("'next_30_days' matches from today through +30 days", () => {
    const items = [
      item({ due_date: new Date(2026, 6, 17).toISOString() }), // exactly 30 days out
      item({ due_date: new Date(2026, 7, 20).toISOString() }), // too far
      item({ due_date: new Date(2026, 5, 10).toISOString() }), // in the past
    ];
    expect(filterByBucket(items, "next_30_days", now)).toHaveLength(1);
  });
});

describe("countByBucket", () => {
  it("agrees with filterByBucket(...).length for each requested bucket", () => {
    const items = [
      item({ due_date: new Date(2026, 5, 16).toISOString() }),
      item({ due_date: new Date(2026, 5, 17, 8, 0).toISOString() }),
      item({ due_date: new Date(2026, 5, 18, 8, 0).toISOString() }),
      item({ completed_at: now.toISOString() }),
      item({}),
    ];
    const buckets: OperationalBucket[] = ["todo", "done", "overdue", "today", "tomorrow", "this_week", "next_week", "next_30_days"];
    const counts = countByBucket(items, buckets, now);
    for (const bucket of buckets) {
      expect(counts[bucket]).toBe(filterByBucket(items, bucket, now).length);
    }
  });
});

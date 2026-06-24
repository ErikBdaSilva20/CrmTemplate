import { db } from "./client";
import type { Database } from "./types.gen";

export type Segment = Database["public"]["Tables"]["segments"]["Row"];
export type SegmentInsert = Database["public"]["Tables"]["segments"]["Insert"];
export type SegmentUpdate = Database["public"]["Tables"]["segments"]["Update"];

export const listSegments = () => db.table<Segment>("segments").list();
export const createSegment = (input: SegmentInsert) => db.table<Segment>("segments").create(input);
export const updateSegment = (id: string, patch: SegmentUpdate) =>
  db.table<Segment>("segments").update(id, patch);
export const deleteSegment = (id: string) => db.table<Segment>("segments").remove(id);

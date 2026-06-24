import { db } from "./client";
import type { Database } from "./types.gen";

export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];
export type ActivityUpdate = Database["public"]["Tables"]["activities"]["Update"];

export const listActivities = () => db.table<Activity>("activities").list();
export const createActivity = (input: ActivityInsert) =>
  db.table<Activity>("activities").create(input);
export const updateActivity = (id: string, patch: ActivityUpdate) =>
  db.table<Activity>("activities").update(id, patch);
export const deleteActivity = (id: string) => db.table<Activity>("activities").remove(id);

// /tasks = activities com type='task' (filtra no front).
export const listTasks = async (): Promise<Activity[]> =>
  (await listActivities()).filter((a) => a.type === "task");

export const toggleTaskDone = (id: string, done: boolean) =>
  updateActivity(id, { completed_at: done ? new Date().toISOString() : null });

// Atividades de um deal/contato — filtro no front (sem join).
export const listActivitiesByDeal = async (dealId: string): Promise<Activity[]> =>
  (await listActivities()).filter((a) => a.deal_id === dealId);
export const listActivitiesByContact = async (contactId: string): Promise<Activity[]> =>
  (await listActivities()).filter((a) => a.contact_id === contactId);

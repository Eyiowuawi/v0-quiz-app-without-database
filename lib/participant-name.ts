import type { User } from "@/lib/redis";

/** Normalize participant display name from API / forms. */
export function normalizeParticipantName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").slice(0, 80);
}

/** Label shown in UI: stored name, else email local-part. */
export function displayNameForUser(user: Pick<User, "email" | "name">): string {
  const n = user.name?.trim();
  if (n) return n;
  const local = user.email.split("@")[0];
  return local || user.email;
}

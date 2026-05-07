import { redis, KEYS, Moderator } from "@/lib/redis";

export async function markTeamRegistered(teamId: string): Promise<void> {
  await redis.set(KEYS.TEAM_REGISTERED(teamId), "1");
}

export async function isTeamRegistered(teamId: string): Promise<boolean> {
  const registered = await redis.get<string>(KEYS.TEAM_REGISTERED(teamId));
  if (registered === "1") {
    return true;
  }

  const allModeratorEmails =
    (await redis.get<string[]>(KEYS.ALL_MODERATORS)) || [];

  for (const email of allModeratorEmails) {
    const moderator = await redis.get<Moderator>(KEYS.MODERATOR(email));
    if (moderator?.teamId === teamId) {
      await markTeamRegistered(teamId);
      return true;
    }
  }

  return false;
}

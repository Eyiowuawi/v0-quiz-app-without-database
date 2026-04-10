import { redis, KEYS } from "@/lib/redis";

/**
 * Atomically read JSON user array, upsert by email (update name or append), and SET back.
 * Prevents lost registrations when many students join at once (no read-modify-write races).
 */
const UPSERT_PARTICIPANT_LUA = `
local key = KEYS[1]
local email = ARGV[1]
local name = ARGV[2]
local joinedAt = tonumber(ARGV[3])

local raw = redis.call('GET', key)
local users = {}
if type(raw) == 'string' and #raw > 0 then
  local ok, decoded = pcall(cjson.decode, raw)
  if ok and type(decoded) == 'table' then
    users = decoded
  end
end

local found = false
for _, u in ipairs(users) do
  if u.email == email then
    u.name = name
    found = true
    break
  end
end

if not found then
  table.insert(users, { email = email, name = name, joinedAt = joinedAt })
end

redis.call('SET', key, cjson.encode(users))
return (not found) and 1 or 0
`;

export async function atomicUpsertParticipant(
  teamId: string,
  normalizedEmail: string,
  displayName: string,
  joinedAt: number,
): Promise<{ ok: true; wasNew: boolean } | { ok: false }> {
  const key = KEYS.USERS(teamId);
  let retries = 5;

  while (retries > 0) {
    try {
      const result = await redis.eval(UPSERT_PARTICIPANT_LUA, [key], [
        normalizedEmail,
        displayName,
        String(joinedAt),
      ]);
      const n = typeof result === "number" ? result : Number(result);
      return { ok: true, wasNew: n === 1 };
    } catch (error) {
      retries -= 1;
      if (retries === 0) {
        console.error("atomicUpsertParticipant failed:", error);
        return { ok: false };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 10 * Math.pow(2, 5 - retries)),
      );
    }
  }

  return { ok: false };
}

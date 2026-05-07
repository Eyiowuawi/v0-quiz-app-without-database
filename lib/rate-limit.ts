import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/** Participant join / POST /api/auth */
export const authJoinRatelimit = new Ratelimit({
  redis,
  prefix: "@ratelimit/auth-join",
  limiter: Ratelimit.slidingWindow(30, "60 s"),
});

/** Moderator register + login */
export const moderatorAuthRatelimit = new Ratelimit({
  redis,
  prefix: "@ratelimit/mod-auth",
  limiter: Ratelimit.slidingWindow(25, "60 s"),
});

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

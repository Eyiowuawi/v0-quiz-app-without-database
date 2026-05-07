/**
 * Full URL for players to open the quiz room. Prefer NEXT_PUBLIC_APP_URL in production
 * so copied links match your deployed domain.
 */
export function getQuizJoinUrl(teamId: string): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
      : undefined;
  const origin =
    fromEnv ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "";
  return `${origin}/quiz/${teamId}`;
}

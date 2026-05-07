export class UnknownTeamError extends Error {
  readonly code = "UNKNOWN_TEAM" as const;
  constructor() {
    super("UNKNOWN_TEAM");
    this.name = "UnknownTeamError";
  }
}

export async function fetchQuizState(url: string) {
  const res = await fetch(url);
  const data = (await res.json()) as { error?: string; code?: string };
  if (res.status === 404 && data?.code === "UNKNOWN_TEAM") {
    throw new UnknownTeamError();
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to load quiz",
    );
  }
  return data;
}

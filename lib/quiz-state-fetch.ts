export class UnknownTeamError extends Error {
  readonly code = "UNKNOWN_TEAM" as const;
  constructor() {
    super("UNKNOWN_TEAM");
    this.name = "UnknownTeamError";
  }
}

export async function fetchQuizState<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = (await res.json()) as T | { error?: string; code?: string };

  if (
    res.status === 404 &&
    (data as { code?: string })?.code === "UNKNOWN_TEAM"
  ) {
    throw new UnknownTeamError();
  }

  if (!res.ok) {
    const errorData = data as { error?: string };
    throw new Error(
      typeof errorData.error === "string"
        ? errorData.error
        : "Failed to load quiz"
    );
  }

  return data as T;
}

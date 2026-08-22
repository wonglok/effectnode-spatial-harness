export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
}

function safeParse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Thin fetch wrapper for the same-origin Nitro API. */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body,
    credentials: "include",
  });

  const data = safeParse(await res.text());

  if (!res.ok) {
    const message =
      (typeof data === "object" && data !== null &&
        ("statusMessage" in data || "message" in data)) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, String(message), data);
  }

  return data as T;
}

/** Extract a human-readable message from any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

import axios from "axios";

/** Pulls the useful bit out of an axios error's response body (most APIs
 * return { error, error_description } or { message }), falling back to the
 * generic "Request failed with status code N" axios gives by default. */
export function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    const detail =
      typeof data === "string"
        ? data
        : (data as { error_description?: string; error?: string; message?: string } | undefined)
            ?.error_description ??
          (data as { error?: string } | undefined)?.error ??
          (data as { message?: string } | undefined)?.message;
    return detail ? `${err.message} — ${detail}` : err.message;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

import { NextResponse } from "next/server";
import { AuthError } from "@/lib/session";

/**
 * Wraps an API handler so that thrown errors become consistent JSON responses.
 * AuthError → its status code, anything else → 500. Routes throw freely; the
 * wrapper logs and serializes.
 */
export function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  return fn()
    .then((data) => NextResponse.json({ success: true, error: null, ...(data ?? {}) }))
    .catch((err: unknown) => {
      if (err instanceof AuthError) {
        return NextResponse.json({ success: false, error: err.message }, { status: err.status });
      }
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    });
}

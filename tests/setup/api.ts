/**
 * Tiny request helpers for invoking App Router route handlers from tests.
 *
 * The route handlers are async functions that take a NextRequest and return a
 * NextResponse, so we just construct a NextRequest and await the handler.
 * NextRequest extends the Web `Request` so we can pass headers, body and
 * method directly. The handlers also call `cookies()` from next/headers,
 * which is mocked separately in `installMocks.ts`.
 */

import { NextRequest } from "next/server";

export interface RequestInit {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  url?: string;
}

/**
 * Build a NextRequest. Body is JSON-stringified automatically if provided.
 * Default URL is a placeholder — handlers in this codebase don't read it
 * unless they parse query strings, in which case the test should pass an
 * absolute URL with the params already in place.
 */
export function buildRequest(init: RequestInit = {}): NextRequest {
  const url = init.url ?? "http://localhost/test";
  const headers = new Headers();
  let body: string | undefined;
  if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers.set("content-type", "application/json");
  }
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers,
    body,
  });
}

/**
 * Read a NextResponse and return { status, json } in a single await. Saves
 * boilerplate at the call site.
 */
export async function readResponse<T = unknown>(res: Response): Promise<{ status: number; json: T }> {
  const text = await res.text();
  const json = (text ? JSON.parse(text) : null) as T;
  return { status: res.status, json };
}

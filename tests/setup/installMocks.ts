/**
 * Vitest `setupFiles` entry — runs once per test file before any code under
 * test is imported. This is where we install module mocks that need to be in
 * place before the route handlers (or anything they import) load.
 *
 * Currently we only mock `next/headers` so that `cookies()` returns the test
 * jar from `./cookies.ts`. The jar is global mutable state inside that module
 * and tests reset it via `clearActiveCookies()` in their own beforeEach.
 */

import { vi, beforeEach } from "vitest";
import { createMockCookieJar, clearActiveCookies } from "./cookies";

vi.mock("next/headers", () => ({
  cookies: async () => createMockCookieJar(),
  // headers() isn't used by the routes under test, but next/headers exports it,
  // so we provide a no-op implementation to avoid "named export not found".
  headers: async () => new Headers(),
}));

beforeEach(() => {
  clearActiveCookies();
});

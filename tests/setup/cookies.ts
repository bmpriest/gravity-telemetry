/**
 * Cookie jar mock for tests.
 *
 * Next.js App Router routes call `cookies()` from `next/headers` to read and
 * write cookies. That helper only works inside a real request context, which
 * we don't have when invoking route handlers directly from a vitest test. So
 * we mock `next/headers` with a tiny in-memory jar that the test controls.
 *
 * Test usage:
 *   import { setActiveCookies, getActiveCookies } from "./setup/cookies";
 *   setActiveCookies({});                       // anonymous request
 *   await POST(req);                            // route may call cookies().set
 *   const after = getActiveCookies();           // inspect what got set
 *   setActiveCookies({ gt_session: after.gt_session }); // carry into next call
 *
 * The mock is installed via vi.mock in `tests/setup/installMocks.ts`, which is
 * loaded by vitest via the `setupFiles` option in vitest.config.ts.
 */

interface CookieRecord {
  name: string;
  value: string;
}

let activeCookies: Map<string, string> = new Map();

export function setActiveCookies(cookies: Record<string, string>): void {
  activeCookies = new Map(Object.entries(cookies));
}

export function getActiveCookies(): Record<string, string> {
  return Object.fromEntries(activeCookies);
}

export function clearActiveCookies(): void {
  activeCookies = new Map();
}

/**
 * The shape returned by next/headers cookies(). We only implement the methods
 * that the routes under test actually use: get, set, delete.
 */
export interface MockCookieJar {
  get(name: string): CookieRecord | undefined;
  set(name: string, value: string, opts?: unknown): void;
  set(opts: { name: string; value: string } & Record<string, unknown>): void;
  delete(name: string): void;
}

export function createMockCookieJar(): MockCookieJar {
  return {
    get(name: string) {
      const value = activeCookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(nameOrOpts: string | ({ name: string; value: string } & Record<string, unknown>), value?: string) {
      if (typeof nameOrOpts === "string") {
        activeCookies.set(nameOrOpts, value ?? "");
      } else {
        activeCookies.set(nameOrOpts.name, nameOrOpts.value);
      }
    },
    delete(name: string) {
      activeCookies.delete(name);
    },
  };
}

import type { Op } from "quill";

export type SaveTemplate = {
  id: string;
  name: string;
  ops: Op[];
  /** ISO timestamp */
  lastSaved: string;
  /** ISO timestamp */
  createdAt: string;
};

/**
 * Authenticated user. Returned by /api/auth/me, /api/auth/login, etc.
 *
 * Replaces the legacy `UserData` shape which had savedMails / blueprints
 * embedded — those now live in dedicated stores backed by their own endpoints.
 */
export type SessionUser = {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
};

export type Alert = {
  id: string;
  /** Whether to show the alert or not */
  show: boolean;
  tag: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
};

export type TruncatedOp = {
  a?: { c: string };
  i: string;
};

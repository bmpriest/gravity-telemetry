import type { Op } from "quill/core"

export type SaveTemplate = {
  id: string;
  name: string;
  ops: Op[];
  /** YYYY-MM-DD */
  lastSaved: string;
  /** YYYY-MM-DD */
  createdAt: string;
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

import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return jsonError(err.status, err.message);
      }
      console.error("[api]", err);
      return jsonError(500, "Internal server error");
    }
  };
}

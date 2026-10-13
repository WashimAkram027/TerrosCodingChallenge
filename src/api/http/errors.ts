import type { ErrorRequestHandler } from "express";

import type { ApiErrorBody } from "../../shared/types";
import { DomainError } from "../domain/errors";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** `express.json()` reports a body it cannot parse as a SyntaxError tagged `entity.parse.failed`. */
function isMalformedJsonBody(error: unknown): boolean {
  return error instanceof SyntaxError && (error as { type?: unknown }).type === "entity.parse.failed";
}

const statusByDomainCode: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  conflict: 409,
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody = { error: { code: "internal_error", message: "Something went wrong" } };

  if (error instanceof HttpError) {
    status = error.status;
    body = { error: { code: error.code, message: error.message } };
  } else if (error instanceof DomainError) {
    status = statusByDomainCode[error.code] ?? 400;
    body = { error: { code: error.code, message: error.message } };
  } else if (isMalformedJsonBody(error)) {
    status = 400;
    body = { error: { code: "invalid_request", message: "Request body must be valid JSON" } };
  } else {
    console.error(error);
  }

  res.status(status).json(body);
};

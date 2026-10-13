import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { DirectoryRepository, SessionRepository } from "../repository/types";
import { HttpError } from "../http/errors";
import { buildRequestContext, type RequestContext } from "./requestContext";

/** The scheme name is case-insensitive, as HTTP specifies; a space separates it from the token. */
const BEARER_HEADER = /^Bearer (.+)$/i;

/**
 * Resolves the bearer token on the request to a signed-in user. Tokens are the
 * demo session tokens from the local fixtures; there is no password flow.
 */
export function authenticate(sessions: SessionRepository, directory: DirectoryRepository): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const match = BEARER_HEADER.exec(req.get("authorization") ?? "");
    if (!match) {
      throw new HttpError(401, "unauthenticated", "Missing bearer token");
    }

    const session = await sessions.findSessionByToken(match[1]!.trim());
    const user = session ? await directory.findUserById(session.userId) : undefined;
    if (!user) {
      throw new HttpError(401, "unauthenticated", "Session is not valid");
    }

    res.locals.context = await buildRequestContext(user, directory);
    next();
  };
}

export function requestContext(res: Response): RequestContext {
  const context = res.locals.context as RequestContext | undefined;
  if (!context) {
    throw new HttpError(401, "unauthenticated", "Request is not authenticated");
  }
  return context;
}

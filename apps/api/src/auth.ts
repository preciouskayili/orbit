import type { RequestHandler } from "express";

export type AccountAccess = {
  /** Must validate the session with the identity provider, never decode an unverified JWT. */
  verify: (accessToken: string) => Promise<{ id: string } | null>;
  /** Server-owned membership lookup; never accept membership from the request body. */
  canAccessWorkspace: (userId: string, workspaceId: string) => Promise<boolean>;
};

/** Runs after the installation-token check, before every workspace route. */
export function requireAccount(access: AccountAccess): RequestHandler {
  return async (req, res, next) => {
    const token = req.get("X-Orbit-Session");
    if (!token || token.length > 16_384) {
      res.status(401).json({ message: "Sign in to continue." });
      return;
    }
    let user: { id: string } | null;
    try {
      user = await access.verify(token);
    } catch {
      res.status(503).json({ message: "Could not verify your session. Try again." });
      return;
    }
    if (!user?.id) {
      res.status(401).json({ message: "Your session has expired. Sign in again." });
      return;
    }
    const workspaceId = req.params.workspaceId;
    try {
      if (typeof workspaceId !== "string" || !await access.canAccessWorkspace(user.id, workspaceId)) {
        res.status(403).json({ message: "You do not have access to this workspace." });
        return;
      }
    } catch {
      res.status(503).json({ message: "Could not verify workspace access. Try again." });
      return;
    }
    res.locals.userId = user.id;
    next();
  };
}

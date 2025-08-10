import type { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export interface AuthedRequest extends Request {
  user?: { uid: string; token: any };
}

export const authMiddleware = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return res.status(401).json({ error: "Missing Authorization header" });
  try {
    const idToken = match[1];
    const token = await getAuth().verifyIdToken(idToken);
    req.user = { uid: token.uid, token };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

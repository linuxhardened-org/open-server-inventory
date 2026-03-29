import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

export const sessionAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    sendError(res, 'Unauthorized: Session required', 401);
  }
};

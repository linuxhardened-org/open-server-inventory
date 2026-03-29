import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    next();
  } else {
    sendError(res, 'Forbidden: Admin access required', 403);
  }
};

import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, message: string, statusCode = 400) {
  res.status(statusCode).json({ success: false, error: message });
}

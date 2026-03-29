import { Request } from 'express';

export function getActorUserId(req: Request): number | undefined {
  return req.userId ?? req.session?.userId;
}

import 'express-session';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by bearer auth; session routes use session.userId */
    userId?: number;
  }
}

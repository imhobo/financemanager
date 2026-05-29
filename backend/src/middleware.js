import { verifySessionToken } from './auth.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const payload = verifySessionToken(authHeader.replace('Bearer ', ''));
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

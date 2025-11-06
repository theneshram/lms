import jwt from 'jsonwebtoken';

export function requireAuth(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (!token) return res.status(401).json({ ok: false, error: 'Missing token' });

      const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      req.user = payload;
      if (allowed.length && !allowed.includes(payload.role)) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  };
}

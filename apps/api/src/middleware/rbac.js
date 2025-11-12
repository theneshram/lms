const roleHierarchy = ['STUDENT', 'TA', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'];

function hasRequiredRole(userRole, roles) {
  if (roles.includes(userRole)) return true;
  const userRank = roleHierarchy.indexOf(userRole);
  if (userRank === -1) return false;
  const minimumRank = Math.min(
    ...roles.map((role) => {
      const rank = roleHierarchy.indexOf(role);
      return rank === -1 ? Number.POSITIVE_INFINITY : rank;
    })
  );
  if (!Number.isFinite(minimumRank)) return false;
  return userRank >= minimumRank;
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.length) return next();
    if (!hasRequiredRole(req.user.role, roles)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

export const ROLE_HIERARCHY = roleHierarchy;
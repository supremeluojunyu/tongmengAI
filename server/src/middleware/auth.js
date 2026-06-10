import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tongmeng-ai-secret-2026';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, orgId: user.org_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '无权限' });
    }
    next();
  };
}

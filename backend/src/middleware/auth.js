import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      if (!JWT_SECRET) {
        return res.status(500).json({ error: 'ServerMisconfigured', message: 'JWT_SECRET is not set.' });
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      // Expired or malformed tokens are treated as unauthenticated guests
    }
  }

  req.user = {
    user_id: null,
    name: 'Guest',
    email: null,
    role: 'non_member'
  };
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Action requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
}

export function blockNonMembers(req, res, next) {
  if (!req.user || !req.user.user_id || req.user.role === 'non_member') {
    return res.status(403).json({
      error: 'MembershipRequired',
      message: 'Non-members are in read-only mode. An active membership plan is strictly required to book venues or check out equipment.',
      actionRequired: 'UPGRADE_MEMBERSHIP'
    });
  }
  next();
}

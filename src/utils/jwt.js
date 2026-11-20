import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signAccessToken({ userId, role }) {
  return jwt.sign({ role }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.accessTokenTtlSeconds,
    subject: String(userId),
  });
}

// Throws jwt.TokenExpiredError for expired tokens and jwt.JsonWebTokenError for any other problem.
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

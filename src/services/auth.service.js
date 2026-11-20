import { config } from '../config/index.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { signAccessToken, verifyAccessToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

export function createAuthService({ userRepository }) {
  async function register({ email, password, firstName, lastName }) {
    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ email, passwordHash, firstName, lastName });
    if (!user) throw new ConflictError('EMAIL_TAKEN', 'Email is already registered');
    return user;
  }

  async function login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    // Same error for unknown email and wrong password, so registered emails can't be discovered here.
    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (!user.is_active) throw new ForbiddenError('ACCOUNT_DISABLED', 'Account is disabled');

    return {
      accessToken: signAccessToken({ userId: user.id, role: user.role }),
      tokenType: 'Bearer',
      expiresIn: config.accessTokenTtlSeconds,
    };
  }

  // Resolves a bearer token to its user, rejecting invalid and expired tokens and blocked users.
  async function authenticate(token) {
    let claims;
    try {
      claims = verifyAccessToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('TOKEN_EXPIRED', 'Token has expired');
      }
      throw new UnauthorizedError('INVALID_TOKEN', 'Invalid token');
    }

    const user = await userRepository.findById(Number(claims.sub));
    if (!user) throw new UnauthorizedError('INVALID_TOKEN', 'Invalid token');
    if (!user.is_active) throw new ForbiddenError('ACCOUNT_DISABLED', 'Account is disabled');

    return user;
  }

  return { register, login, authenticate };
}

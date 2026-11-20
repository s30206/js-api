import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

export function hashPassword(password) {
  return bcrypt.hash(password, config.bcryptCost);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long');

export const config = Object.freeze({
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  accessTokenTtlSeconds: 3600,
  bcryptCost: 12,
  currency: 'PLN',
  maxAddressesPerUser: 3,
  maxCartItemQuantity: 99,
  defaultPageSize: 5,
  maxPageSize: 20,
});

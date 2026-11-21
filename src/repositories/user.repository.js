// Shared by list() and count(). Prisma ignores undefined values, so filters left undefined match every user.
function listWhere({ role, isActive }) {
  return { role, is_active: isActive };
}

export function createUserRepository({ prisma }) {
  // Returns null instead of throwing when the email is already taken.
  // skipDuplicates makes this INSERT ... ON CONFLICT DO NOTHING RETURNING, so a duplicate returns no row.
  async function create({ email, passwordHash, firstName, lastName }, db = prisma) {
    const [user] = await db.users.createManyAndReturn({
      data: [{ email, password_hash: passwordHash, first_name: firstName, last_name: lastName }],
      skipDuplicates: true,
    });
    return user ?? null;
  }

  async function findById(id, db = prisma) {
    return db.users.findUnique({ where: { id } });
  }

  async function findByEmail(email, db = prisma) {
    return db.users.findUnique({ where: { email } });
  }

  // Fields left undefined keep their current value. Returns null when the user doesn't exist.
  // updateManyAndReturn returns no row for a missing id, where update() would throw.
  async function updateProfile(id, { firstName, lastName }, db = prisma) {
    const [user] = await db.users.updateManyAndReturn({
      where: { id },
      data: { first_name: firstName, last_name: lastName },
    });
    return user ?? null;
  }

  async function updatePasswordHash(id, passwordHash, db = prisma) {
    await db.users.updateMany({ where: { id }, data: { password_hash: passwordHash } });
  }

  // Row lock held until the surrounding transaction ends; serializes per-user writes.
  // Raw SQL because Prisma has no FOR UPDATE; tx must be the client from prisma.$transaction().
  async function lockById(id, tx) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
  }

  async function list(filters, { limit, offset }, db = prisma) {
    return db.users.findMany({ where: listWhere(filters), orderBy: { id: 'asc' }, skip: offset, take: limit });
  }

  async function count(filters, db = prisma) {
    return db.users.count({ where: listWhere(filters) });
  }

  // Returns null when the user doesn't exist.
  async function updateStatus(id, isActive, db = prisma) {
    const [user] = await db.users.updateManyAndReturn({ where: { id }, data: { is_active: isActive } });
    return user ?? null;
  }

  return { create, findById, findByEmail, updateProfile, updatePasswordHash, lockById, list, count, updateStatus };
}

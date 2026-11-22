export function createAddressRepository({ prisma }) {
  async function listByUser(userId, db = prisma) {
    return db.addresses.findMany({ where: { user_id: userId }, orderBy: { id: 'asc' } });
  }

  async function countByUser(userId, db = prisma) {
    return db.addresses.count({ where: { user_id: userId } });
  }

  // Prisma omits undefined values, so an undefined country falls back to 'PL', the column default.
  async function create(userId, { label, recipientName, phone, street, city, postalCode, country }, db = prisma) {
    return db.addresses.create({
      data: {
        user_id: userId,
        label,
        recipient_name: recipientName,
        phone,
        street,
        city,
        postal_code: postalCode,
        country,
      },
    });
  }

  // Fields left undefined keep their current value; label may also be set to null to clear it.
  // Returns null when the address doesn't exist or belongs to another user.
  // updateManyAndReturn can filter on user_id and returns no row on a miss, where update() would throw.
  async function update(id, userId, { label, recipientName, phone, street, city, postalCode, country }, db = prisma) {
    const [address] = await db.addresses.updateManyAndReturn({
      where: { id, user_id: userId },
      data: {
        label,
        recipient_name: recipientName,
        phone,
        street,
        city,
        postal_code: postalCode,
        country,
      },
    });
    return address ?? null;
  }

  // Returns false when the address doesn't exist or belongs to another user.
  async function remove(id, userId, db = prisma) {
    const { count } = await db.addresses.deleteMany({ where: { id, user_id: userId } });
    return count > 0;
  }

  return { listByUser, countByUser, create, update, remove };
}

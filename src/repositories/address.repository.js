export function createAddressRepository({ pool }) {
  async function listByUser(userId, db = pool) {
    const { rows } = await db.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY id', [userId]);
    return rows;
  }

  async function countByUser(userId, db = pool) {
    const { rows } = await db.query('SELECT count(*)::int AS count FROM addresses WHERE user_id = $1', [userId]);
    return rows[0].count;
  }

  // An undefined country falls back to 'PL', the column default.
  async function create(userId, { label, recipientName, phone, street, city, postalCode, country }, db = pool) {
    const { rows } = await db.query(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, street, city, postal_code, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'PL'))
       RETURNING *`,
      [userId, label ?? null, recipientName, phone, street, city, postalCode, country ?? null],
    );
    return rows[0];
  }

  // Fields left undefined keep their current value; label may also be set to null to clear it.
  // Returns null when the address doesn't exist or belongs to another user.
  async function update(id, userId, { label, recipientName, phone, street, city, postalCode, country }, db = pool) {
    const { rows } = await db.query(
      `UPDATE addresses
       SET label          = CASE WHEN $3 THEN $4 ELSE label END,
           recipient_name = COALESCE($5, recipient_name),
           phone          = COALESCE($6, phone),
           street         = COALESCE($7, street),
           city           = COALESCE($8, city),
           postal_code    = COALESCE($9, postal_code),
           country        = COALESCE($10, country),
           updated_at     = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        label !== undefined,
        label ?? null,
        recipientName ?? null,
        phone ?? null,
        street ?? null,
        city ?? null,
        postalCode ?? null,
        country ?? null,
      ],
    );
    return rows[0] ?? null;
  }

  // Returns false when the address doesn't exist or belongs to another user.
  async function remove(id, userId, db = pool) {
    const { rowCount } = await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount > 0;
  }

  return { listByUser, countByUser, create, update, remove };
}

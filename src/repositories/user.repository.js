// Shared by list() and count(): $1 is the role, $2 is isActive; null skips that filter.
const LIST_FILTERS = `WHERE ($1::user_role IS NULL OR role = $1)
         AND ($2::boolean IS NULL OR is_active = $2)`;

export function createUserRepository({ pool }) {
  // Returns null instead of throwing when the email is already taken.
  async function create({ email, passwordHash, firstName, lastName }, db = pool) {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING *`,
      [email, passwordHash, firstName, lastName],
    );
    return rows[0] ?? null;
  }

  async function findById(id, db = pool) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async function findByEmail(email, db = pool) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ?? null;
  }

  // Fields left undefined keep their current value. Returns null when the user doesn't exist.
  async function updateProfile(id, { firstName, lastName }, db = pool) {
    const { rows } = await db.query(
      `UPDATE users
       SET first_name = COALESCE($2, first_name),
           last_name  = COALESCE($3, last_name),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, firstName ?? null, lastName ?? null],
    );
    return rows[0] ?? null;
  }

  async function updatePasswordHash(id, passwordHash, db = pool) {
    await db.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [id, passwordHash]);
  }

  // Row lock held until the surrounding transaction ends; serializes per-user writes.
  async function lockById(id, db = pool) {
    await db.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [id]);
  }

  // Filters left undefined match every user.
  async function list({ role, isActive }, { limit, offset }, db = pool) {
    const { rows } = await db.query(
      `SELECT * FROM users
       ${LIST_FILTERS}
       ORDER BY id
       LIMIT $3 OFFSET $4`,
      [role ?? null, isActive ?? null, limit, offset],
    );
    return rows;
  }

  async function count({ role, isActive }, db = pool) {
    const { rows } = await db.query(`SELECT count(*)::int AS count FROM users ${LIST_FILTERS}`, [
      role ?? null,
      isActive ?? null,
    ]);
    return rows[0].count;
  }

  // Returns null when the user doesn't exist.
  async function updateStatus(id, isActive, db = pool) {
    const { rows } = await db.query(
      'UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [id, isActive],
    );
    return rows[0] ?? null;
  }

  return { create, findById, findByEmail, updateProfile, updatePasswordHash, lockById, list, count, updateStatus };
}

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

  return { create, findById, findByEmail };
}

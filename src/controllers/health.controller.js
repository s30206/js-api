export function createHealthController({ pool }) {
  async function check(req, res) {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch (err) {
      console.warn('Health check failed: database unreachable', err);
      res.status(503).json({ status: 'error', db: 'down' });
    }
  }

  return { check };
}

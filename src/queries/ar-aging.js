const { sql } = require('../db');

async function getArAging(pool, asAt) {
  const result = await pool.request()
    .input('asAt', sql.Date, asAt)
    .query(`
      SELECT
        SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, @asAt) <= 30 THEN p.Outstanding ELSE 0 END) AS current_bucket,
        SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, @asAt) BETWEEN 31 AND 60 THEN p.Outstanding ELSE 0 END) AS days_31_60,
        SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, @asAt) BETWEEN 61 AND 90 THEN p.Outstanding ELSE 0 END) AS days_61_90,
        SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, @asAt) BETWEEN 91 AND 120 THEN p.Outstanding ELSE 0 END) AS days_91_120,
        SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, @asAt) > 120 THEN p.Outstanding ELSE 0 END) AS days_120_plus,
        SUM(p.Outstanding) AS total
      FROM PostAR p
      WHERE p.Outstanding <> 0
    `);

  const row = result.recordset[0];
  return {
    current: row.current_bucket || 0,
    days31_60: row.days_31_60 || 0,
    days61_90: row.days_61_90 || 0,
    days91_120: row.days_91_120 || 0,
    days120plus: row.days_120_plus || 0,
    total: row.total || 0,
  };
}

module.exports = { getArAging };

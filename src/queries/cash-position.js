const { sql } = require('../db');

async function getCashPosition(pool, to) {
  const result = await pool.request()
    .input('to', sql.Date, to)
    .query(`
      SELECT a.Description AS name, SUM(p.Debit - p.Credit) AS balance
      FROM PostGL p
      JOIN Accounts a ON a.AccountLink = p.AccountLink
      WHERE a.iAccountType = 1 AND p.TxDate <= @to
      GROUP BY a.Description, a.AccountLink
      HAVING SUM(p.Debit - p.Credit) <> 0
      ORDER BY SUM(p.Debit - p.Credit) DESC
    `);

  const accounts = result.recordset.map(r => ({
    name: r.name,
    balance: r.balance || 0,
  }));

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return { accounts, total };
}

module.exports = { getCashPosition };

const { sql } = require('../db');

async function getTopExpenses(pool, from, to) {
  const result = await pool.request()
    .input('from', sql.Date, from)
    .input('to', sql.Date, to)
    .query(`
      SELECT TOP 10 a.Description AS name, SUM(p.Debit - p.Credit) AS amount
      FROM PostGL p
      JOIN Accounts a ON a.AccountLink = p.AccountLink
      WHERE a.iAccountType IN (2, 36)
        AND p.TxDate BETWEEN @from AND @to
      GROUP BY a.Description
      HAVING SUM(p.Debit - p.Credit) > 0
      ORDER BY SUM(p.Debit - p.Credit) DESC
    `);

  return result.recordset.map(r => ({
    name: r.name,
    amount: r.amount || 0,
  }));
}

module.exports = { getTopExpenses };

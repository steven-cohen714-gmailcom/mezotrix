const { sql } = require('../db');

async function getTopCustomers(pool, from, to) {
  const result = await pool.request()
    .input('from', sql.Date, from)
    .input('to', sql.Date, to)
    .query(`
      SELECT TOP 10 c.Account AS code, c.Name AS name, SUM(p.Debit) AS invoiced
      FROM PostAR p
      JOIN Client c ON c.DCLink = p.AccountLink
      WHERE p.TxDate BETWEEN @from AND @to AND p.Debit > 0
      GROUP BY c.Account, c.Name
      ORDER BY SUM(p.Debit) DESC
    `);

  return result.recordset.map(r => ({
    code: r.code,
    name: r.name,
    invoiced: r.invoiced || 0,
  }));
}

module.exports = { getTopCustomers };

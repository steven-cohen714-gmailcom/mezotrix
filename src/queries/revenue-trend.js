const { sql } = require('../db');

async function getRevenueTrend(pool, from, to) {
  const result = await pool.request()
    .input('from', sql.Date, from)
    .input('to', sql.Date, to)
    .query(`
      SELECT
        YEAR(p.TxDate) AS yr,
        MONTH(p.TxDate) AS mo,
        SUM(CASE WHEN a.iAccountType = 9 THEN p.Credit - p.Debit ELSE 0 END) AS revenue,
        SUM(CASE WHEN a.iAccountType = 10 THEN p.Debit - p.Credit ELSE 0 END) AS costOfSales
      FROM PostGL p
      JOIN Accounts a ON a.AccountLink = p.AccountLink
      WHERE a.iAccountType IN (9, 10)
        AND p.TxDate BETWEEN @from AND @to
      GROUP BY YEAR(p.TxDate), MONTH(p.TxDate)
      ORDER BY yr, mo
    `);

  return result.recordset.map(r => ({
    year: r.yr,
    month: r.mo,
    revenue: r.revenue || 0,
    costOfSales: r.costOfSales || 0,
    grossProfit: (r.revenue || 0) - (r.costOfSales || 0),
  }));
}

module.exports = { getRevenueTrend };

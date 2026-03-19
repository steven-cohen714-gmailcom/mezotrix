const { sql } = require('../db');

async function getPnl(pool, from, to) {
  const result = await pool.request()
    .input('from', sql.Date, from)
    .input('to', sql.Date, to)
    .query(`
      SELECT
        SUM(CASE WHEN a.iAccountType = 9 THEN p.Credit - p.Debit ELSE 0 END) AS revenue,
        SUM(CASE WHEN a.iAccountType = 10 THEN p.Debit - p.Credit ELSE 0 END) AS costOfSales,
        SUM(CASE WHEN a.iAccountType IN (2, 36) THEN p.Debit - p.Credit ELSE 0 END) AS opex,
        SUM(CASE WHEN a.iAccountType = 4 THEN p.Credit - p.Debit ELSE 0 END) AS otherIncome
      FROM PostGL p
      JOIN Accounts a ON a.AccountLink = p.AccountLink
      WHERE a.iAccountType IN (9, 10, 2, 4, 36)
        AND p.TxDate BETWEEN @from AND @to
    `);

  const row = result.recordset[0];
  const revenue = row.revenue || 0;
  const costOfSales = row.costOfSales || 0;
  const opex = row.opex || 0;
  const otherIncome = row.otherIncome || 0;
  const grossProfit = revenue - costOfSales;
  const netProfit = grossProfit - opex + otherIncome;

  return {
    revenue,
    costOfSales,
    grossProfit,
    grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
    opex,
    otherIncome,
    netProfit,
    netMargin: revenue ? (netProfit / revenue) * 100 : 0,
    cosPercent: revenue ? (costOfSales / revenue) * 100 : 0,
    opexPercent: revenue ? (opex / revenue) * 100 : 0,
  };
}

module.exports = { getPnl };

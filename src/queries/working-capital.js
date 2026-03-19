const { sql } = require('../db');

async function getWorkingCapital(pool) {
  const result = await pool.request()
    .query(`
      SELECT
        (SELECT ISNULL(SUM(Outstanding), 0) FROM PostAR WHERE Outstanding > 0) AS receivables,
        (SELECT ISNULL(ABS(SUM(Outstanding)), 0) FROM PostAP WHERE Outstanding < 0) AS payables,
        (SELECT ISNULL(SUM(sq.QtyOnHand * sc.AverageCost), 0)
         FROM _etblStockQtys sq
         JOIN _etblStockCosts sc ON sc.StockID = sq.StockID AND sc.WhseID = sq.WhseID
         WHERE sq.QtyOnHand > 0) AS stockValue
    `);

  const row = result.recordset[0];
  const receivables = row.receivables || 0;
  const payables = row.payables || 0;
  const stockValue = row.stockValue || 0;
  const netWorkingCapital = receivables + stockValue - payables;

  return { receivables, payables, stockValue, netWorkingCapital };
}

module.exports = { getWorkingCapital };

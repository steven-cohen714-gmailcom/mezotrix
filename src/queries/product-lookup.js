const { sql } = require('../db');

async function getProductLookup(pool, productCode, from, to) {
  // Invoice count
  const countRes = await pool.request()
    .input('code', sql.VarChar, productCode)
    .input('from', sql.VarChar, from)
    .input('to', sql.VarChar, to)
    .query(`
      SELECT COUNT(DISTINCT i.AutoIndex) AS invoiceCount
      FROM InvNum i
      JOIN _btblInvoiceLines il ON il.iInvoiceID = i.AutoIndex
      JOIN StkItem s ON s.StockLink = il.iStockCodeID
      WHERE s.Code = @code
        AND i.DocType = 0
        AND i.InvDate >= @from AND i.InvDate <= @to
    `);

  // Total value
  const valueRes = await pool.request()
    .input('code', sql.VarChar, productCode)
    .input('from', sql.VarChar, from)
    .input('to', sql.VarChar, to)
    .query(`
      SELECT
        ISNULL(SUM(il.fQuantityLineTotExcl), 0) AS totalExcl,
        ISNULL(SUM(il.fQuantityLineTotIncl), 0) AS totalIncl,
        ISNULL(SUM(il.fQuantity), 0) AS totalQty
      FROM InvNum i
      JOIN _btblInvoiceLines il ON il.iInvoiceID = i.AutoIndex
      JOIN StkItem s ON s.StockLink = il.iStockCodeID
      WHERE s.Code = @code
        AND i.DocType = 0
        AND i.InvDate >= @from AND i.InvDate <= @to
    `);

  // Profit margin
  const marginRes = await pool.request()
    .input('code', sql.VarChar, productCode)
    .input('from', sql.VarChar, from)
    .input('to', sql.VarChar, to)
    .query(`
      SELECT
        ISNULL(SUM(il.fQuantityLineTotExcl), 0) AS revenue,
        ISNULL(SUM(il.fUnitCost * il.fQuantity), 0) AS cost
      FROM InvNum i
      JOIN _btblInvoiceLines il ON il.iInvoiceID = i.AutoIndex
      JOIN StkItem s ON s.StockLink = il.iStockCodeID
      WHERE s.Code = @code
        AND i.DocType = 0
        AND i.InvDate >= @from AND i.InvDate <= @to
    `);

  // Invoices per customer
  const custRes = await pool.request()
    .input('code', sql.VarChar, productCode)
    .input('from', sql.VarChar, from)
    .input('to', sql.VarChar, to)
    .query(`
      SELECT c.Account AS customerCode, c.Name AS customerName,
             COUNT(DISTINCT i.AutoIndex) AS invoiceCount,
             ISNULL(SUM(il.fQuantityLineTotExcl), 0) AS totalExcl
      FROM InvNum i
      JOIN _btblInvoiceLines il ON il.iInvoiceID = i.AutoIndex
      JOIN StkItem s ON s.StockLink = il.iStockCodeID
      JOIN Client c ON c.DCLink = i.AccountID
      WHERE s.Code = @code
        AND i.DocType = 0
        AND i.InvDate >= @from AND i.InvDate <= @to
      GROUP BY c.Account, c.Name
      ORDER BY invoiceCount DESC
    `);

  const m = marginRes.recordset[0];
  const revenue = m.revenue;
  const cost = m.cost;
  const profit = revenue - cost;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    productCode,
    invoiceCount: countRes.recordset[0].invoiceCount,
    totalExcl: valueRes.recordset[0].totalExcl,
    totalIncl: valueRes.recordset[0].totalIncl,
    totalQty: valueRes.recordset[0].totalQty,
    revenue,
    cost,
    profit,
    marginPct,
    customers: custRes.recordset,
  };
}

module.exports = { getProductLookup };

async function searchProducts(pool) {
  const result = await pool.request().query(`
    SELECT Code, Description_1 AS description
    FROM StkItem
    WHERE ItemActive = 1
    ORDER BY Code
  `);
  return result.recordset;
}

async function searchDebtors(pool) {
  const result = await pool.request().query(`
    SELECT Account AS code, Name AS description
    FROM Client
    ORDER BY Account
  `);
  return result.recordset;
}

async function searchCreditors(pool) {
  const result = await pool.request().query(`
    SELECT Account AS code, Name AS description
    FROM Vendor
    ORDER BY Account
  `);
  return result.recordset;
}

module.exports = { searchProducts, searchDebtors, searchCreditors };

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { requireAuth, login, logout, me } = require('./src/auth');
const { getPool } = require('./src/db');
const { getPnl } = require('./src/queries/pnl');
const { getRevenueTrend } = require('./src/queries/revenue-trend');
const { getCashPosition } = require('./src/queries/cash-position');
const { getWorkingCapital } = require('./src/queries/working-capital');
const { getTopCustomers } = require('./src/queries/top-customers');
const { getArAging } = require('./src/queries/ar-aging');
const { getTopExpenses } = require('./src/queries/top-expenses');
const { getProductLookup } = require('./src/queries/product-lookup');
const { searchProducts, searchDebtors, searchCreditors } = require('./src/queries/search');
const { handleChat } = require('./src/chat');
const fs = require('fs');

const SAVED_REPORTS_FILE = path.join(__dirname, 'data', 'saved-reports.json');
function loadSavedReports() {
  try { return JSON.parse(fs.readFileSync(SAVED_REPORTS_FILE, 'utf8')); } catch { return []; }
}
function saveSavedReports(reports) {
  fs.writeFileSync(SAVED_REPORTS_FILE, JSON.stringify(reports, null, 2));
}

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes
app.post('/api/login', login);
app.post('/api/logout', logout);
app.get('/api/me', me);

// Helper to shift dates back by 12 months
function priorYearDate(dateStr) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

// All reports in one call
app.get('/api/report/all', requireAuth, async (req, res) => {
  try {
    const { from, to, compare } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to date parameters required' });
    }

    const pool = await getPool();

    // Current period — run all in parallel
    const [pnl, revenueTrend, cashPosition, workingCapital, topCustomers, arAging, topExpenses] =
      await Promise.all([
        getPnl(pool, from, to),
        getRevenueTrend(pool, from, to),
        getCashPosition(pool, to),
        getWorkingCapital(pool),
        getTopCustomers(pool, from, to),
        getArAging(pool, to),
        getTopExpenses(pool, from, to),
      ]);

    const data = { pnl, revenueTrend, cashPosition, workingCapital, topCustomers, arAging, topExpenses };

    // Comparative period
    if (compare === 'true') {
      const pFrom = priorYearDate(from);
      const pTo = priorYearDate(to);
      const [pPnl, pRevenueTrend, pCashPosition, pTopCustomers, pTopExpenses] =
        await Promise.all([
          getPnl(pool, pFrom, pTo),
          getRevenueTrend(pool, pFrom, pTo),
          getCashPosition(pool, pTo),
          getTopCustomers(pool, pFrom, pTo),
          getTopExpenses(pool, pFrom, pTo),
        ]);
      data.prior = {
        pnl: pPnl,
        revenueTrend: pRevenueTrend,
        cashPosition: pCashPosition,
        topCustomers: pTopCustomers,
        topExpenses: pTopExpenses,
      };
    }

    res.json(data);
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Search endpoints — return all items (filtered client-side)
app.get('/api/search/products', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    res.json(await searchProducts(pool));
  } catch (err) {
    console.error('Product search error:', err);
    res.status(500).json([]);
  }
});

app.get('/api/search/debtors', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    res.json(await searchDebtors(pool));
  } catch (err) {
    console.error('Debtor search error:', err);
    res.status(500).json([]);
  }
});

app.get('/api/search/creditors', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    res.json(await searchCreditors(pool));
  } catch (err) {
    console.error('Creditor search error:', err);
    res.status(500).json([]);
  }
});

// Product lookup
app.get('/api/report/product-lookup', requireAuth, async (req, res) => {
  try {
    const { from, to, productCode } = req.query;
    if (!from || !to || !productCode) {
      return res.status(400).json({ error: 'from, to, and productCode parameters required' });
    }
    const pool = await getPool();
    const data = await getProductLookup(pool, productCode, from, to);
    res.json(data);
  } catch (err) {
    console.error('Product lookup error:', err);
    res.status(500).json({ error: 'Failed to run product lookup' });
  }
});

// Saved reports CRUD
app.get('/api/saved-reports', requireAuth, (req, res) => {
  res.json(loadSavedReports());
});

app.post('/api/saved-reports', requireAuth, (req, res) => {
  const { title, description, question, categoryId, categoryTitle, categoryIcon } = req.body;
  if (!title || !question) {
    return res.status(400).json({ error: 'title and question required' });
  }
  const reports = loadSavedReports();
  const report = {
    id: 'saved-' + Date.now(),
    title,
    description: description || question,
    question,
    categoryId: categoryId || 'ai-reports',
    categoryTitle: categoryTitle || 'AI Reports',
    categoryIcon: categoryIcon || '\u{1F916}',
    createdAt: new Date().toISOString(),
  };
  reports.push(report);
  saveSavedReports(reports);
  res.json(report);
});

app.delete('/api/saved-reports/:id', requireAuth, (req, res) => {
  let reports = loadSavedReports();
  reports = reports.filter(r => r.id !== req.params.id);
  saveSavedReports(reports);
  res.json({ ok: true });
});

// Chat endpoint
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }
    const reply = await handleChat(messages);
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message, err.status, err);
    res.status(500).json({ error: err.message || 'Failed to process chat message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mezotrix reporting portal running on http://localhost:${PORT}`);
});

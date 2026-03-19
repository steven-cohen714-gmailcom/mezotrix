// Category definitions — shown as grid blocks on the home screen
const CATEGORY_DEFS = [
  {
    id: 'overview',
    title: 'KPI Dashboard',
    description: 'Complete business overview with all key metrics in one report.',
    icon: '\u{1F4CA}',
    reports: ['kpi-dashboard'],
  },
  {
    id: 'profitability',
    title: 'Profitability',
    description: 'Income statements, revenue trends, expense analysis and customer revenue.',
    icon: '\u{1F4C8}',
    reports: ['pnl-summary', 'revenue-trend', 'top-customers', 'top-expenses'],
  },
  {
    id: 'working-capital',
    title: 'Working Capital',
    description: 'Cash position, receivables, payables, stock and debtor aging analysis.',
    icon: '\u{1F4B0}',
    reports: ['cash-position', 'working-capital', 'ar-aging'],
  },
  {
    id: 'sales-inventory',
    title: 'Sales & Inventory',
    description: 'Product lookups, invoice analysis and stock queries by product code.',
    icon: '\u{1F4E6}',
    reports: ['product-lookup'],
  },
];

// Report definitions — each one becomes a card on the menu
const REPORT_DEFS = [
  {
    id: 'kpi-dashboard',
    title: 'KPI Dashboard',
    description: 'Complete business overview. Revenue, profitability, cash position, working capital, top customers, aging and expenses — all in one report.',
    icon: '\u{1F4CA}',
    iconColor: 'teal',
    endpoint: '/api/report/all',
    showCompare: true,
    render: renderKpiDashboard,
  },
  {
    id: 'pnl-summary',
    title: 'Profit and Loss',
    description: 'Accountants refer to this as an income statement. Shows revenue, cost of sales, gross profit, operating expenses and net profit with margin percentages.',
    icon: '\u{1F4C8}',
    iconColor: 'green',
    endpoint: '/api/report/all',
    showCompare: true,
    render: renderPnlReport,
  },
  {
    id: 'revenue-trend',
    title: 'Monthly Revenue Trend',
    description: 'Month-by-month revenue bar chart for the selected period. Useful for identifying seasonal patterns and growth trends.',
    icon: '\u{1F4C9}',
    iconColor: 'blue',
    endpoint: '/api/report/all',
    showCompare: true,
    render: renderRevenueTrendReport,
  },
  {
    id: 'cash-position',
    title: 'Cash Position',
    description: 'Bank account balances as at the end date. Shows each account individually and total cash on hand across all accounts.',
    icon: '\u{1F3E6}',
    iconColor: 'purple',
    endpoint: '/api/report/all',
    showCompare: true,
    render: renderCashReport,
  },
  {
    id: 'working-capital',
    title: 'Working Capital',
    description: 'Trade receivables, trade payables, stock on hand and net working capital. Shows whether the business can meet its short-term obligations.',
    icon: '\u{1F4B0}',
    iconColor: 'orange',
    endpoint: '/api/report/all',
    showCompare: false,
    render: renderWorkingCapitalReport,
  },
  {
    id: 'top-customers',
    title: 'Top 10 Customers',
    description: 'Ranked list of the top 10 customers by invoiced revenue for the selected period. Highlights customer concentration risk.',
    icon: '\u{1F465}',
    iconColor: 'teal',
    endpoint: '/api/report/all',
    showCompare: true,
    render: renderTopCustomersReport,
  },
  {
    id: 'ar-aging',
    title: 'Accounts Receivable Aging',
    description: 'Outstanding debtor balances broken into current, 30, 60, 90 and 120+ day buckets. Identifies overdue accounts needing attention.',
    icon: '\u{23F0}',
    iconColor: 'red',
    endpoint: '/api/report/all',
    showCompare: false,
    render: renderArAgingReport,
  },
  {
    id: 'product-lookup',
    title: 'Product Lookup',
    description: 'Enter a product code to see invoice count, total value, profit margin and customer breakdown for the period.',
    icon: '\u{1F50D}',
    iconColor: 'purple',
    endpoint: '/api/report/product-lookup',
    showCompare: false,
    hasProductCode: true,
    searchUrl: '/api/search/products',
    searchPlaceholder: 'Start typing product code or name...',
    render: renderProductLookup,
  },
  {
    id: 'top-expenses',
    title: 'Top 10 Expenses',
    description: 'The ten largest expense categories for the period, ranked by amount. Helps identify where money is being spent.',
    icon: '\u{1F4CB}',
    iconColor: 'orange',
    endpoint: '/api/report/all',
    showCompare: true,
    render: renderTopExpensesReport,
  },
];

// ── RENDER FUNCTIONS ──

function renderKpiDashboard(data, showCompare) {
  const p = showCompare ? data.prior : null;
  return [
    renderPnlSection(data.pnl, p?.pnl),
    renderRevenueTrendSection(data.revenueTrend, p?.revenueTrend),
    renderCashSection(data.cashPosition, p?.cashPosition),
    renderWorkingCapitalSection(data.workingCapital),
    renderTopCustomersSection(data.topCustomers, p?.topCustomers),
    renderArAgingSection(data.arAging),
    renderTopExpensesSection(data.topExpenses, p?.topExpenses),
  ].join('');
}

function renderPnlReport(data, showCompare) {
  const p = showCompare ? data.prior : null;
  return renderPnlSection(data.pnl, p?.pnl);
}

function renderRevenueTrendReport(data, showCompare) {
  const p = showCompare ? data.prior : null;
  return renderRevenueTrendSection(data.revenueTrend, p?.revenueTrend);
}

function renderCashReport(data, showCompare) {
  const p = showCompare ? data.prior : null;
  return renderCashSection(data.cashPosition, p?.cashPosition);
}

function renderWorkingCapitalReport(data) {
  return renderWorkingCapitalSection(data.workingCapital);
}

function renderTopCustomersReport(data, showCompare) {
  const p = showCompare ? data.prior : null;
  return renderTopCustomersSection(data.topCustomers, p?.topCustomers);
}

function renderArAgingReport(data) {
  return renderArAgingSection(data.arAging);
}

function renderTopExpensesReport(data, showCompare) {
  const p = showCompare ? data.prior : null;
  return renderTopExpensesSection(data.topExpenses, p?.topExpenses);
}

// ── SECTION RENDERERS ──

function renderPnlSection(pnl, prior) {
  function cmp(label, val, pct, priorVal, isGood) {
    const cls = val >= 0 ? (isGood !== false ? 'positive' : '') : 'negative';
    let compareHtml = '';
    if (prior && priorVal !== undefined) {
      compareHtml = `<div class="card-compare">Prior: ${fmtR(priorVal)} ${yoyHtml(val, priorVal)}</div>`;
    }
    return `<div class="card">
      <div class="card-label">${label}</div>
      <div class="card-value ${cls}">${fmtR(val)}</div>
      ${pct !== null ? `<div class="card-sub">${fmtPct(pct)} of revenue</div>` : ''}
      ${compareHtml}
    </div>`;
  }

  return `<div class="section-title">Profit & Loss</div>
  <div class="card-grid">
    ${cmp('Revenue', pnl.revenue, null, prior?.revenue)}
    ${cmp('Cost of Sales', pnl.costOfSales, pnl.cosPercent, prior?.costOfSales, false)}
    ${cmp('Gross Profit', pnl.grossProfit, pnl.grossMargin, prior?.grossProfit)}
    ${cmp('Operating Expenses', pnl.opex, pnl.opexPercent, prior?.opex, false)}
    ${cmp('Net Profit', pnl.netProfit, pnl.netMargin, prior?.netProfit)}
    ${cmp('Other Income', pnl.otherIncome, null, prior?.otherIncome)}
  </div>`;
}

function renderRevenueTrendSection(trend, priorTrend) {
  const maxRev = Math.max(...trend.map(t => t.revenue), 1);
  const priorMap = {};
  if (priorTrend) {
    priorTrend.forEach(t => { priorMap[t.month] = t.revenue; });
  }

  const bars = trend.map(t => {
    const pct = (t.revenue / maxRev * 100).toFixed(1);
    const priorPct = priorMap[t.month] ? (priorMap[t.month] / maxRev * 100).toFixed(1) : 0;
    const priorBar = priorMap[t.month]
      ? `<div class="bar-track-prior" style="width:${priorPct}%"></div>`
      : '';
    return `<div class="bar-row">
      <div class="bar-label">${monthLabel(t.month)}</div>
      <div class="bar-track">
        ${priorBar}
        <div class="bar-fill" style="width:${pct}%">
          <span class="bar-val">${fmtR(t.revenue)}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="section-title">Monthly Revenue</div>
  <div class="card full">
    <div class="bar-chart">${bars}</div>
    ${priorTrend ? '<div style="font-size:0.65rem;color:var(--muted);margin-top:8px;">Grey = prior year</div>' : ''}
  </div>`;
}

function renderCashSection(cash, priorCash) {
  const cards = cash.accounts.map(a => {
    let cmpHtml = '';
    if (priorCash) {
      const pa = priorCash.accounts.find(x => x.name === a.name);
      if (pa) cmpHtml = `<div class="card-compare">Prior: ${fmtR(pa.balance)}</div>`;
    }
    return `<div class="card">
      <div class="card-label">${a.name}</div>
      <div class="card-value">${fmtR(a.balance)}</div>
      ${cmpHtml}
    </div>`;
  }).join('');

  let totalCmp = '';
  if (priorCash) {
    totalCmp = `<div class="card-compare" style="color:rgba(255,255,255,0.6);">Prior: ${fmtR(priorCash.total)} ${yoyHtml(cash.total, priorCash.total)}</div>`;
  }

  return `<div class="section-title">Cash Position</div>
  <div class="card-grid">
    ${cards}
    <div class="card full dark">
      <div class="card-label">Total Cash</div>
      <div class="card-value">${fmtR(cash.total)}</div>
      ${totalCmp}
    </div>
  </div>`;
}

function renderWorkingCapitalSection(wc) {
  return `<div class="section-title">Working Capital</div>
  <div class="card-grid">
    <div class="card">
      <div class="card-label">Trade Receivables</div>
      <div class="card-value neutral">${fmtR(wc.receivables)}</div>
    </div>
    <div class="card">
      <div class="card-label">Trade Payables</div>
      <div class="card-value negative">${fmtR(wc.payables)}</div>
    </div>
    <div class="card">
      <div class="card-label">Stock on Hand</div>
      <div class="card-value">${fmtR(wc.stockValue)}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Working Capital</div>
      <div class="card-value ${wc.netWorkingCapital >= 0 ? 'positive' : 'negative'}">${fmtR(wc.netWorkingCapital)}</div>
    </div>
  </div>`;
}

function renderTopCustomersSection(customers, priorCustomers) {
  const max = customers.length > 0 ? customers[0].invoiced : 1;
  const priorMap = {};
  if (priorCustomers) {
    priorCustomers.forEach(c => { priorMap[c.name] = c.invoiced; });
  }

  const bars = customers.map(c => {
    const pct = Math.max((c.invoiced / max * 100), 2).toFixed(1);
    const label = c.name.length > 25 ? c.name.substring(0, 25) + '...' : c.name;
    const priorHtml = priorMap[c.name] ? `<span class="bar-val-outside">${fmtR(priorMap[c.name])} prior</span>` : '';

    if (pct > 15) {
      return `<div class="bar-row">
        <div class="bar-track"><div class="bar-fill green" style="width:${pct}%"><span class="bar-val">${label} — ${fmtR(c.invoiced)}</span></div></div>
        ${priorHtml}
      </div>`;
    }
    return `<div class="bar-row">
      <div class="bar-track"><div class="bar-fill green" style="width:${pct}%"></div></div>
      <span class="bar-val-outside">${label} — ${fmtR(c.invoiced)}</span>
      ${priorHtml}
    </div>`;
  }).join('');

  return `<div class="section-title">Top 10 Customers</div>
  <div class="card full"><div class="bar-chart">${bars}</div></div>`;
}

function renderArAgingSection(aging) {
  const buckets = [
    { label: 'Current', val: aging.current, cls: 'positive' },
    { label: '31-60', val: aging.days31_60, cls: '' },
    { label: '61-90', val: aging.days61_90, cls: '' },
    { label: '91-120', val: aging.days91_120, cls: 'negative' },
    { label: '120+', val: aging.days120plus, cls: 'negative' },
  ];

  const grid = buckets.map(b =>
    `<div><div class="aging-label">${b.label}</div><div class="aging-value ${b.cls}">${fmtR(b.val)}</div></div>`
  ).join('');

  return `<div class="section-title">AR Aging</div>
  <div class="card full">
    <div class="aging-grid">${grid}</div>
    <div style="margin-top:10px;">
      <div class="card-label">Total Outstanding</div>
      <div class="card-value">${fmtR(aging.total)}</div>
    </div>
  </div>`;
}

function renderTopExpensesSection(expenses, priorExpenses) {
  const priorMap = {};
  if (priorExpenses) {
    priorExpenses.forEach(e => { priorMap[e.name] = e.amount; });
  }

  const items = expenses.map((e, i) => {
    let priorHtml = '';
    if (priorMap[e.name]) {
      priorHtml = `<span class="h-item-prior">(${fmtR(priorMap[e.name])})</span>`;
    }
    return `<div class="h-item">
      <span class="h-item-rank">${i + 1}</span>
      <span class="h-item-name">${e.name}</span>
      <span class="h-item-val">${fmtR(e.amount)}</span>
      ${priorHtml}
    </div>`;
  }).join('');

  return `<div class="section-title">Top 10 Expenses</div>
  <div class="card full"><div class="h-list">${items}</div></div>`;
}

function renderProductLookup(data) {
  const marginCls = data.marginPct >= 0 ? 'positive' : 'negative';

  // Customer breakdown table
  const custRows = data.customers.map(c =>
    `<tr>
      <td style="padding:6px 8px;font-size:0.8rem;">${c.customerCode}</td>
      <td style="padding:6px 8px;font-size:0.8rem;">${c.customerName}</td>
      <td style="padding:6px 8px;font-size:0.8rem;text-align:right;font-weight:600;">${c.invoiceCount}</td>
      <td style="padding:6px 8px;font-size:0.8rem;text-align:right;">${fmtR(c.totalExcl)}</td>
    </tr>`
  ).join('');

  return `
    <div class="section-title">Product: ${data.productCode}</div>
    <div class="card-grid">
      <div class="card">
        <div class="card-label">Invoices</div>
        <div class="card-value">${data.invoiceCount}</div>
        <div class="card-sub">${fmtNum(data.totalQty)} units sold</div>
      </div>
      <div class="card">
        <div class="card-label">Total Value (Excl)</div>
        <div class="card-value">${fmtR(data.totalExcl)}</div>
        <div class="card-sub">Incl: ${fmtR(data.totalIncl)}</div>
      </div>
      <div class="card">
        <div class="card-label">Profit</div>
        <div class="card-value ${marginCls}">${fmtR(data.profit)}</div>
        <div class="card-sub">Cost: ${fmtR(data.cost)}</div>
      </div>
      <div class="card">
        <div class="card-label">Margin</div>
        <div class="card-value ${marginCls}">${data.marginPct.toFixed(1)}%</div>
      </div>
    </div>
    <div class="section-title">Invoices by Customer</div>
    <div class="card full">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);">
            <th style="padding:6px 8px;text-align:left;font-size:0.7rem;color:var(--muted);text-transform:uppercase;">Code</th>
            <th style="padding:6px 8px;text-align:left;font-size:0.7rem;color:var(--muted);text-transform:uppercase;">Customer</th>
            <th style="padding:6px 8px;text-align:right;font-size:0.7rem;color:var(--muted);text-transform:uppercase;">Invoices</th>
            <th style="padding:6px 8px;text-align:right;font-size:0.7rem;color:var(--muted);text-transform:uppercase;">Value (Excl)</th>
          </tr>
        </thead>
        <tbody>${custRows}</tbody>
      </table>
    </div>`;
}

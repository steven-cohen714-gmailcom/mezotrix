---
name: kpi-report
description: Generate a mobile-friendly KPI dashboard for Mezotrix from the Sage 200 database
user_invocable: true
---

# KPI Report Generator

Generate a mobile-friendly HTML KPI report for Mezotrix (Pty) Ltd from the Sage Evolution / Sage 200 database running in the `mezotrix-restore` Docker container.

## Database Connection
- Container: `mezotrix-restore`
- SA Password: `Str0ngPassw0rd`
- Database: `Mezotrix`
- Tool: `/opt/mssql-tools18/bin/sqlcmd -S localhost -U SA -P 'Str0ngPassw0rd' -C -d Mezotrix -W`

## Report Period
- 12 months ended February 2026 (2025-03-01 to 2026-02-28)
- Compare to prior year where data exists (2024-03-01 to 2025-02-28)

## Key Schema Reference

### Account Types (Accounts.iAccountType → _etblGLAccountTypes)
- 9 = Revenue
- 10 = Cost of Sales
- 2 = Other Expense (operating expenses)
- 4 = Other Income
- 36 = Administration Expense
- 1 = Cash and Cash Equivalents
- 3 = Other Current Asset
- 5 = Other Current Liability
- 24 = Inventories
- 25 = Trade Receivables (control)
- 26 = Trade Payables (control)

### Key Tables
- `PostGL` — All GL transactions (TxDate, AccountLink, Debit, Credit)
- `PostAR` — AR transactions (Outstanding for aging)
- `PostAP` — AP transactions (Outstanding for aging)
- `Accounts` — Chart of accounts (iAccountType for classification)
- `Client` — Customer master (DCLink is PK, linked via AccountLink)
- `Vendor` — Supplier master
- `StkItem` — Stock items
- `_etblStockQtys` — Stock quantities (QtyOnHand, StockID, WhseID)
- `_etblStockCosts` — Stock costs (AverageCost, StockID, WhseID)
- `TrCodes` — Transaction codes (iModule: 5=AR, 6=AP, 11=Inventory, 4=GL/CB)

### Revenue & Cost Queries
- Revenue: `SELECT SUM(Credit - Debit) FROM PostGL g JOIN Accounts a ON a.AccountLink = g.AccountLink WHERE a.iAccountType = 9`
- Cost of Sales: `SELECT SUM(Debit - Credit) FROM PostGL g JOIN Accounts a ON ... WHERE a.iAccountType = 10`
- Operating Expenses: `SELECT SUM(Debit - Credit) FROM PostGL g JOIN Accounts a ON ... WHERE a.iAccountType IN (2, 36)`
- Other Income: `SELECT SUM(Credit - Debit) FROM PostGL g JOIN Accounts a ON ... WHERE a.iAccountType = 4`

### AR Aging
```sql
SELECT c.Account, c.Name,
  SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, GETDATE()) <= 30 THEN p.Outstanding ELSE 0 END) AS [Current],
  SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, GETDATE()) BETWEEN 31 AND 60 THEN p.Outstanding ELSE 0 END) AS [31-60],
  SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, GETDATE()) BETWEEN 61 AND 90 THEN p.Outstanding ELSE 0 END) AS [61-90],
  SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, GETDATE()) BETWEEN 91 AND 120 THEN p.Outstanding ELSE 0 END) AS [91-120],
  SUM(CASE WHEN DATEDIFF(DAY, p.TxDate, GETDATE()) > 120 THEN p.Outstanding ELSE 0 END) AS [120+],
  SUM(p.Outstanding) AS Total
FROM PostAR p JOIN Client c ON c.DCLink = p.AccountLink
WHERE p.Outstanding <> 0
GROUP BY c.Account, c.Name HAVING SUM(p.Outstanding) <> 0
```

### Cash Balances
```sql
SELECT a.Description, SUM(g.Debit - g.Credit) as Balance
FROM PostGL g JOIN Accounts a ON a.AccountLink = g.AccountLink
WHERE a.iAccountType = 1 AND g.TxDate <= '2026-02-28'
GROUP BY a.Description
```

### Stock Value
```sql
SELECT SUM(sq.QtyOnHand * sc.AverageCost) as StockValue
FROM _etblStockQtys sq
JOIN _etblStockCosts sc ON sc.StockID = sq.StockID AND sc.WhseID = sq.WhseID
WHERE sq.QtyOnHand > 0
```

## Instructions

1. Run all necessary SQL queries against the Docker container to gather current data
2. Generate a single self-contained HTML file saved to `/Users/stevencohen/Projects/jayce/reports/kpi-report.html`
3. The report must be **mobile-friendly** (responsive, works on phone screens)

## Report Sections (in order)

### 1. Header
- Company name: Mezotrix (Pty) Ltd
- Report period: "12 Months Ended February 2026"
- Generated timestamp

### 2. Financial Summary Cards (grid, 2 columns on mobile)
- **Revenue** (12-month total) with YoY % change
- **Cost of Sales** with gross margin %
- **Gross Profit** with margin %
- **Operating Expenses** total
- **Net Profit** (Revenue - COS - OpEx + Other Income)
- **Net Margin %**

### 3. Monthly Revenue Trend
- Simple bar chart using CSS (no JS libraries needed) showing 12 months of revenue
- Label each bar with month abbreviation and value

### 4. Cash Position
- Card per bank account with balance
- Total cash position

### 5. Working Capital
- Accounts Receivable total
- Accounts Payable total
- Stock on Hand value
- Net Working Capital

### 6. Top 10 Customers by Revenue
- Name and amount, horizontal bar chart

### 7. AR Aging Summary
- Total per aging bucket (Current, 30, 60, 90, 120+)
- Visual bar showing proportion

### 8. Top 10 Expense Categories
- Category name and amount

## HTML/CSS Requirements
- Single file, no external dependencies
- Mobile-first responsive design using CSS Grid/Flexbox
- Use `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Color scheme: dark navy headers (#1a1a2e), accent blue (#4361ee), green for positive (#2ec4b6), red for negative (#e71d36)
- Cards with subtle shadows and rounded corners
- Numbers formatted with thousand separators (R for Rand)
- Use system font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Font sizes: headings 1.2rem, body 0.9rem, small labels 0.75rem
- Max width 600px centered for readability on larger screens

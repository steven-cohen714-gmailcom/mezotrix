const Anthropic = require('@anthropic-ai/sdk');
const { getPool } = require('./db');

const client = new Anthropic();

const DB_SCHEMA = `
You have access to a Sage 200 Evolution ERP database (SQL Server) called "Mezotrix". Key tables:

GENERAL LEDGER:
- PostGL: GL transactions. Columns: AutoIdx, TxDate, AccountLink (FK→Accounts), Debit, Credit, Description, Reference, TrCodeID
- Accounts: Chart of accounts. Columns: AccountLink (PK), Account (code like "9100/000"), Description, iAccountType (1=BS, 2=IS, 3=BS, 4=IS...), ActiveAccount, Master_Sub_Account

ACCOUNTS RECEIVABLE (Debtors/Customers):
- PostAR: AR transactions. Columns: AutoIdx, TxDate, AccountLink (FK→Client), Debit, Credit, Description, Reference, Outstanding, InvNumKey
- Client: Customer master. Columns: DCLink (PK), Account (code), Name, Contact_Person, Telephone, EMail, DCBalance, Credit_Limit, On_Hold

ACCOUNTS PAYABLE (Creditors/Suppliers):
- PostAP: AP transactions. Columns: AutoIdx, TxDate, AccountLink (FK→Vendor), Debit, Credit, Description, Reference, Outstanding
- Vendor: Supplier master. Columns: DCLink (PK), Account (code), Name, Contact_Person, Telephone, EMail, DCBalance

INVENTORY:
- StkItem: Stock items. Columns: StockLink (PK), Code, Description_1, ItemActive, ServiceItem
- _etblStockQtys: Stock quantities. Columns: StockID (FK→StkItem), WhseID, QtyOnHand, QtyOnSO, QtyOnPO, QtyReserved
- _etblStockCosts: Stock costs. Columns: StockID (FK→StkItem), WhseID, AverageCost, LatestCost

INVOICING:
- InvNum: Invoice/order headers. Columns: AutoIndex, DocType (0=Quote,1=SO,2=Multi SO,3=PO,4=Invoice,5=Credit Note,7=GRV,8=AP Invoice,9=AP Credit), InvNumber, AccountID (FK→Client or Vendor), InvDate, InvTotExcl, InvTotIncl, InvTotTax, Description, DocState
- _btblInvoiceLines: Invoice line items. Columns: iInvoiceID (FK→InvNum), iStockCodeID (FK→StkItem), cDescription, fQuantity, fUnitPriceExcl, fUnitPriceIncl, fQuantityLineTotExcl, fQuantityLineTotIncl

IMPORTANT SAGE 200 CONVENTIONS:
- In PostGL: Revenue accounts have Credits (revenue is a credit). Expenses have Debits.
- Account types: iAccountType values — Sales/Revenue typically have specific type codes. Look at the Account code patterns.
- Account code patterns: codes starting with "9" are typically P&L. Bank accounts often start with "1".
- For revenue: SUM(Credit - Debit) from PostGL joined to Accounts
- For expenses: SUM(Debit - Credit) from PostGL joined to Accounts
- Dates are smalldatetime, use format 'YYYY-MM-DD'
- DocType in InvNum: 4 = Tax Invoice, 5 = Credit Note
- All monetary values are in South African Rand (ZAR)
`;

const SYSTEM_PROMPT = `You are a helpful financial assistant for Mezotrix (Pty) Ltd, a South African company using Sage 200 Evolution ERP.
You answer questions about the company's financial data by querying the database.

${DB_SCHEMA}

Guidelines:
- Always use SELECT queries only. Never modify data.
- Use TOP to limit large result sets (max 50 rows unless the user needs more).
- Format currency as Rand (R) with 2 decimal places in your answers.
- Be concise but thorough. Use bullet points or simple tables when showing multiple items.
- If you're unsure about the exact column or table, say so and offer your best guess.
- For multi-part questions, try to combine them into fewer queries using JOINs, subqueries, or multiple columns in one SELECT.
- You can run multiple tool calls in parallel — use this for independent queries.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- The financial year typically runs March to February.
- When asked about "this year" or "current year", use the period 2025-03-01 to 2026-02-28 unless otherwise specified.
`;

async function handleChat(messages) {
  const pool = await getPool();

  const anthropicMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const tools = [
    {
      name: 'run_sql',
      description: 'Execute a read-only SQL query against the Mezotrix database and return results. Only SELECT statements are allowed.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL SELECT query to execute',
          },
        },
        required: ['query'],
      },
    },
  ];

  // Loop to handle tool use (Claude may need multiple queries)
  let currentMessages = [...anthropicMessages];
  const maxIterations = 15;

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages: currentMessages,
    });

    // Check if Claude wants to use a tool
    if (response.stop_reason === 'tool_use') {
      const toolBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolBlock of toolBlocks) {
        if (toolBlock.name === 'run_sql') {
          const sql = toolBlock.input.query.trim();

          // Safety check — only allow SELECT
          if (!/^\s*SELECT/i.test(sql)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: 'Error: Only SELECT queries are allowed.',
            });
            continue;
          }

          try {
            const result = await pool.request().query(sql);
            const rows = result.recordset || [];
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(rows.slice(0, 100)),
            });
          } catch (err) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: `SQL Error: ${err.message}`,
            });
          }
        }
      }

      // Add assistant response and tool results to messages
      currentMessages.push({ role: 'assistant', content: response.content });
      currentMessages.push({ role: 'user', content: toolResults });
    } else {
      // Final text response
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock ? textBlock.text : 'No response generated.';
    }
  }

  return 'I needed too many queries to answer that. Could you try a simpler question?';
}

module.exports = { handleChat };

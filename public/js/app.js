// Auth check
fetch('/api/me').then(r => { if (!r.ok) window.location.href = '/'; });

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

// Default dates
const defaultFrom = '2025-03-01';
const defaultTo = '2026-02-28';

// ── SCREEN MANAGEMENT ──
function showScreen(screen) {
  document.getElementById('categoryGrid').style.display = screen === 'categories' ? 'block' : 'none';
  document.getElementById('reportMenu').style.display = screen === 'reports' ? 'block' : 'none';
  document.getElementById('reportView').style.display = screen === 'report' ? 'block' : 'none';
}

let currentCategoryId = null;

// ── BUILD CATEGORY GRID ──
function buildCategoryGrid() {
  const grid = document.getElementById('categoryGrid');
  const cards = CATEGORY_DEFS.map(cat => `
    <div class="cat-card" data-category="${cat.id}">
      <div class="cat-card-icon">${cat.icon}</div>
      <div class="cat-card-title">${cat.title}</div>
      <div class="cat-card-desc">${cat.description}</div>
    </div>
  `).join('');

  grid.innerHTML = `<div class="cat-grid-title">Welcome</div>
    <div class="cat-grid-sub">What would you like to review?</div>
    <div class="cat-grid">${cards}</div>`;

  grid.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => openCategory(card.dataset.category));
  });
}

// ── OPEN CATEGORY ──
function openCategory(categoryId) {
  const cat = CATEGORY_DEFS.find(c => c.id === categoryId);
  if (!cat) return;
  currentCategoryId = categoryId;

  const reports = cat.reports.map(rid => REPORT_DEFS.find(r => r.id === rid)).filter(Boolean);

  const menu = document.getElementById('reportMenu');
  document.getElementById('categoryTitle').textContent = cat.title;

  const cardsHtml = reports.map(r => {
    const compareHtml = r.showCompare
      ? `<label class="report-card-compare"><input type="checkbox" data-compare="${r.id}"> Compare to prior year</label>`
      : '';

    const productCodeHtml = r.hasProductCode
      ? `<div class="report-card-date-field" style="flex:2;position:relative;">
            <label>${r.searchPlaceholder ? 'Search' : 'Product Code'}</label>
            <input type="text" data-product-code="${r.id}" data-search-url="${r.searchUrl || ''}" placeholder="${r.searchPlaceholder || 'e.g. FX.SS.0010'}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:0.8rem;outline:none;background:#fff;" autocomplete="off">
          </div>`
      : '';

    const autoExpand = reports.length === 1 ? ' expanded' : '';
    return `<div class="report-card${autoExpand}" data-report="${r.id}">
      <div class="report-card-header">
        <div class="report-card-icon ${r.iconColor}">${r.icon}</div>
        <div class="report-card-info">
          <div class="report-card-title">${r.title}</div>
          <div class="report-card-desc">${r.description}</div>
        </div>
      </div>
      <div class="report-card-controls">
        ${productCodeHtml}
        <div class="report-card-dates">
          <div class="report-card-date-field">
            <label>From</label>
            <input type="date" data-from="${r.id}" value="${defaultFrom}">
          </div>
          <div class="report-card-date-field">
            <label>To</label>
            <input type="date" data-to="${r.id}" value="${defaultTo}">
          </div>
        </div>
        ${compareHtml}
        <button class="run-btn report-card-run" data-run="${r.id}">Run Report</button>
      </div>
    </div>`;
  }).join('');

  // Remove old report cards (keep back button and title)
  menu.querySelectorAll('.report-card').forEach(el => el.remove());
  document.getElementById('categoryTitle').insertAdjacentHTML('afterend', cardsHtml);

  // Click card to expand/collapse
  menu.querySelectorAll('.report-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.report-card-controls')) return;
      menu.querySelectorAll('.report-card.expanded').forEach(c => {
        if (c !== card) c.classList.remove('expanded');
      });
      card.classList.toggle('expanded');
    });
  });

  // Stop controls from bubbling
  menu.querySelectorAll('input, button').forEach(el => {
    el.addEventListener('click', e => e.stopPropagation());
  });

  // Run buttons
  menu.querySelectorAll('[data-run]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      runReport(btn.dataset.run);
    });
  });

  // Init autocomplete on search inputs
  menu.querySelectorAll('[data-search-url]').forEach(input => {
    const url = input.dataset.searchUrl;
    if (url) initAutocomplete(input, url);
  });

  showScreen('reports');
}

// ── RUN REPORT ──
async function runReport(reportId) {
  const def = REPORT_DEFS.find(r => r.id === reportId);
  if (!def) return;

  const from = document.querySelector(`[data-from="${reportId}"]`).value;
  const to = document.querySelector(`[data-to="${reportId}"]`).value;
  const compareEl = document.querySelector(`[data-compare="${reportId}"]`);
  const compare = compareEl ? compareEl.checked : false;

  // Product code for product lookup
  const productCodeEl = document.querySelector(`[data-product-code="${reportId}"]`);
  const productCode = productCodeEl ? productCodeEl.value.trim() : '';
  if (def.hasProductCode && !productCode) {
    alert('Please enter a product code.');
    return;
  }

  showScreen('report');
  document.getElementById('reportTitle').textContent = def.title;
  document.getElementById('reportContent').innerHTML = '';
  document.getElementById('loadingIndicator').style.display = 'block';

  try {
    let url = `${def.endpoint}?from=${from}&to=${to}&compare=${compare}`;
    if (productCode) url += `&productCode=${encodeURIComponent(productCode)}`;
    const res = await fetch(url);
    if (res.status === 401) { window.location.href = '/'; return; }
    if (!res.ok) throw new Error('Failed');

    const data = await res.json();
    document.getElementById('reportContent').innerHTML = def.render(data, compare);
  } catch (e) {
    document.getElementById('reportContent').innerHTML =
      `<div class="card full" style="text-align:center;color:var(--red);">Error loading report. Please try again.</div>`;
  } finally {
    document.getElementById('loadingIndicator').style.display = 'none';
  }
}

// ── BACK BUTTONS ──
document.getElementById('backToCategoriesBtn').addEventListener('click', () => {
  showScreen('categories');
});

document.getElementById('backBtn').addEventListener('click', () => {
  if (currentCategoryId) {
    openCategory(currentCategoryId);
  } else {
    showScreen('categories');
  }
});

// Init
buildCategoryGrid();

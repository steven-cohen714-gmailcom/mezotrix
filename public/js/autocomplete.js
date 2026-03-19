// Reusable autocomplete — loads all items on init, filters client-side
function initAutocomplete(input, searchUrl) {
  let allItems = [];
  let loaded = false;
  let loading = false;
  let dropdown = null;
  let activeIndex = -1;

  // Create dropdown
  dropdown = document.createElement('div');
  dropdown.className = 'ac-dropdown';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(dropdown);

  async function loadAll() {
    if (loaded || loading) return;
    loading = true;
    try {
      const res = await fetch(`${searchUrl}?q=`);
      if (res.ok) allItems = await res.json();
      loaded = true;
    } catch { /* ignore */ }
    loading = false;
  }

  function filterItems(term) {
    if (!term) return allItems;
    const lower = term.toLowerCase();
    return allItems.filter(item => {
      const code = (item.code || item.Code || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return code.includes(lower) || desc.includes(lower);
    });
  }

  function showResults(results) {
    activeIndex = -1;
    if (!results.length) {
      dropdown.innerHTML = '<div class="ac-empty">No matches found</div>';
      dropdown.style.display = 'block';
      return;
    }
    dropdown.innerHTML = results.map((r, i) =>
      `<div class="ac-item" data-index="${i}" data-code="${r.code || r.Code}">
        <span class="ac-item-code">${r.code || r.Code}</span>
        <span class="ac-item-desc">${r.description || ''}</span>
      </div>`
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.dataset.code;
        dropdown.style.display = 'none';
      });
    });
  }

  function refresh() {
    const filtered = filterItems(input.value.trim());
    showResults(filtered);
  }

  input.addEventListener('focus', async () => {
    await loadAll();
    refresh();
  });

  input.addEventListener('input', () => {
    if (loaded) refresh();
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.ac-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('ac-active', i === activeIndex));
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('ac-active', i === activeIndex));
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      input.value = items[activeIndex].dataset.code;
      dropdown.style.display = 'none';
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });
}

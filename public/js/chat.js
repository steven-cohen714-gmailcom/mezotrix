// ── CHAT WINDOW + SAVED REPORTS ──
(function () {
  const chatHistory = []; // { role, content }
  let lastQuestion = '';
  let lastAnswer = '';

  // Build chat DOM
  const chatBtn = document.createElement('button');
  chatBtn.id = 'chatToggleBtn';
  chatBtn.innerHTML = '<span class="chat-btn-icon">&#128172;</span>';
  document.body.appendChild(chatBtn);

  const chatPanel = document.createElement('div');
  chatPanel.id = 'chatPanel';
  chatPanel.innerHTML = `
    <div class="chat-header">
      <span class="chat-header-title">Ask Mezotrix</span>
      <button class="chat-close-btn" id="chatCloseBtn">&times;</button>
    </div>
    <div class="chat-messages" id="chatMessages">
      <div class="chat-msg assistant">
        <div class="chat-bubble">Hi! Ask me anything about Mezotrix's financials. You can also say <strong>"save this as a report"</strong> after any answer to add it to your dashboard.</div>
      </div>
    </div>
    <form class="chat-input-row" id="chatForm">
      <textarea id="chatInput" rows="1" placeholder="e.g. What is our total revenue this year?&#10;Shift+Enter for new line"></textarea>
      <button type="submit" id="chatSendBtn">&#10148;</button>
    </form>
  `;
  document.body.appendChild(chatPanel);

  // Answer modal
  const modal = document.createElement('div');
  modal.id = 'answerModal';
  modal.innerHTML = `
    <div class="answer-modal-backdrop"></div>
    <div class="answer-modal-content">
      <div class="answer-modal-header">
        <span class="answer-modal-question" id="answerModalQuestion"></span>
        <div class="answer-modal-actions">
          <button class="answer-modal-save-btn" id="answerModalSaveBtn">Save as Report</button>
          <button class="answer-modal-close" id="answerModalClose">&times;</button>
        </div>
      </div>
      <div class="answer-modal-body" id="answerModalBody"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Save report modal
  const saveModal = document.createElement('div');
  saveModal.id = 'saveReportModal';
  saveModal.innerHTML = `
    <div class="answer-modal-backdrop"></div>
    <div class="answer-modal-content" style="max-width:480px;">
      <div class="answer-modal-header">
        <span class="answer-modal-question">Save as Report</span>
        <button class="answer-modal-close" id="saveReportClose">&times;</button>
      </div>
      <div class="answer-modal-body">
        <div class="save-report-form">
          <label class="save-report-label">Report Title</label>
          <input type="text" id="saveReportTitle" class="save-report-input" placeholder="e.g. Top Debtors">
          <label class="save-report-label">Description</label>
          <input type="text" id="saveReportDesc" class="save-report-input" placeholder="Short description of what this report shows">
          <label class="save-report-label">Category</label>
          <select id="saveReportCategory" class="save-report-input">
            <option value="ai-reports">AI Reports (new)</option>
          </select>
          <div id="newCategoryFields" style="display:none;margin-top:8px;">
            <label class="save-report-label">New Category Name</label>
            <input type="text" id="saveReportNewCat" class="save-report-input" placeholder="e.g. Custom Analysis">
          </div>
          <button class="run-btn" id="saveReportBtn" style="margin-top:16px;">Save Report</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(saveModal);

  const messagesEl = document.getElementById('chatMessages');
  const inputEl = document.getElementById('chatInput');
  const formEl = document.getElementById('chatForm');
  let isOpen = false;

  chatBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    chatPanel.classList.toggle('open', isOpen);
    chatBtn.classList.toggle('open', isOpen);
    if (isOpen) inputEl.focus();
  });

  document.getElementById('chatCloseBtn').addEventListener('click', () => {
    isOpen = false;
    chatPanel.classList.remove('open');
    chatBtn.classList.remove('open');
  });

  // Answer modal controls
  document.getElementById('answerModalClose').addEventListener('click', closeModal);
  modal.querySelector('.answer-modal-backdrop').addEventListener('click', closeModal);
  document.getElementById('answerModalSaveBtn').addEventListener('click', () => {
    closeModal();
    openSaveModal();
  });

  // Save modal controls
  document.getElementById('saveReportClose').addEventListener('click', () => saveModal.classList.remove('open'));
  saveModal.querySelector('.answer-modal-backdrop').addEventListener('click', () => saveModal.classList.remove('open'));

  function openModal(question, answer) {
    document.getElementById('answerModalQuestion').textContent = question;
    document.getElementById('answerModalBody').innerHTML = formatMessage(answer);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  function openSaveModal() {
    // Populate category dropdown with existing categories
    const select = document.getElementById('saveReportCategory');
    select.innerHTML = '';
    CATEGORY_DEFS.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.title;
      select.appendChild(opt);
    });
    // Add "new category" option
    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ Create new category';
    select.appendChild(newOpt);

    // Default title from last question
    document.getElementById('saveReportTitle').value = '';
    document.getElementById('saveReportDesc').value = lastQuestion;
    document.getElementById('saveReportNewCat').value = '';
    document.getElementById('newCategoryFields').style.display = 'none';

    select.onchange = () => {
      document.getElementById('newCategoryFields').style.display =
        select.value === '__new__' ? 'block' : 'none';
    };

    saveModal.classList.add('open');
  }

  document.getElementById('saveReportBtn').addEventListener('click', async () => {
    const title = document.getElementById('saveReportTitle').value.trim();
    const desc = document.getElementById('saveReportDesc').value.trim();
    const catSelect = document.getElementById('saveReportCategory');
    const catValue = catSelect.value;
    const newCatName = document.getElementById('saveReportNewCat').value.trim();

    if (!title) { alert('Please enter a report title.'); return; }

    const body = {
      title,
      description: desc || lastQuestion,
      question: lastQuestion,
    };

    if (catValue === '__new__') {
      if (!newCatName) { alert('Please enter a category name.'); return; }
      body.categoryId = 'custom-' + Date.now();
      body.categoryTitle = newCatName;
    } else {
      const cat = CATEGORY_DEFS.find(c => c.id === catValue);
      body.categoryId = catValue;
      body.categoryTitle = cat ? cat.title : catValue;
    }

    try {
      const res = await fetch('/api/saved-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();

      saveModal.classList.remove('open');
      appendMessage('assistant', `Saved! "${title}" has been added to your ${body.categoryTitle} category. Refresh the page to see it on the dashboard.`);

      // Dynamically add to dashboard
      addSavedReportToGrid(saved);
    } catch (err) {
      alert('Failed to save report. Please try again.');
    }
  });

  function appendMessage(role, text, question) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    if (role === 'assistant' && question) {
      const preview = text.length > 120 ? text.slice(0, 120) + '...' : text;
      div.innerHTML = `<div class="chat-bubble chat-bubble-expandable">
        <div class="chat-preview">${formatMessage(preview)}</div>
        <div class="chat-expand-hint">Tap to expand</div>
      </div>`;
      div.querySelector('.chat-bubble').addEventListener('click', () => {
        openModal(question, text);
      });
    } else {
      div.innerHTML = `<div class="chat-bubble">${formatMessage(text)}</div>`;
    }

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-•]\s+(.+)$/gm, '<div class="chat-bullet">$1</div>')
      .replace(/^\d+\.\s+(.+)$/gm, '<div class="chat-bullet">$&</div>')
      .replace(/\n/g, '<br>');
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant chat-typing';
    div.innerHTML = `<div class="chat-bubble"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  // Auto-resize textarea and handle Enter to submit
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formEl.requestSubmit();
    }
  });

  // Detect "save as report" type messages
  function isSaveRequest(text) {
    const lower = text.toLowerCase();
    return lower.includes('save') && (lower.includes('report') || lower.includes('dashboard'));
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';

    // Check if user wants to save the last answer as a report
    if (isSaveRequest(text) && lastAnswer) {
      appendMessage('user', text);
      openSaveModal();
      return;
    }

    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    const typingEl = showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (res.status === 401) { window.location.href = '/'; return; }
      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      typingEl.remove();

      lastQuestion = text;
      lastAnswer = data.reply;

      chatHistory.push({ role: 'assistant', content: data.reply });
      appendMessage('assistant', data.reply, text);

      // Auto-open modal with the answer
      openModal(text, data.reply);
    } catch (err) {
      typingEl.remove();
      appendMessage('assistant', 'Sorry, something went wrong. Please try again.');
    }
  });

  // ── SAVED REPORTS ON DASHBOARD ──

  function addSavedReportToGrid(report) {
    // Check if category already exists
    let cat = CATEGORY_DEFS.find(c => c.id === report.categoryId);
    if (!cat) {
      cat = {
        id: report.categoryId,
        title: report.categoryTitle,
        description: 'AI-generated saved reports.',
        icon: report.categoryIcon || '\u{1F916}',
        reports: [],
      };
      CATEGORY_DEFS.push(cat);
    }

    // Add report definition
    const reportDef = {
      id: report.id,
      title: report.title,
      description: report.description,
      icon: '\u{1F916}',
      iconColor: 'teal',
      isSavedChat: true,
      chatQuestion: report.question,
      showCompare: false,
      render: null, // handled specially
    };
    REPORT_DEFS.push(reportDef);
    if (!cat.reports.includes(report.id)) {
      cat.reports.push(report.id);
    }

    // Rebuild the category grid
    buildCategoryGrid();
  }

  // Load saved reports on startup
  async function loadSavedReports() {
    try {
      const res = await fetch('/api/saved-reports');
      if (!res.ok) return;
      const reports = await res.json();
      reports.forEach(r => addSavedReportToGrid(r));
    } catch (err) {
      // ignore
    }
  }

  loadSavedReports();

  // Expose runSavedReport globally so app.js can call it
  window.runSavedChatReport = async function (reportId) {
    const def = REPORT_DEFS.find(r => r.id === reportId);
    if (!def || !def.isSavedChat) return;

    // Show loading in answer modal
    openModal(def.title, 'Running query...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: def.chatQuestion }] }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      openModal(def.title, data.reply);
    } catch (err) {
      openModal(def.title, 'Sorry, something went wrong running this report.');
    }
  };
})();

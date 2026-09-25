const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const WORKSPACE_KEY = 'lai.workspace.v1';
const LEGACY_MESSAGES_KEY = 'lai.messages';
const SETTINGS_KEY = 'lai.settings';
const DARK_KEY = 'lai.dark';

let controller = null;
let installed = new Set();
let searchRows = [];
let requestInFlight = false;
let sidebarFilter = '';
let nameDialogResolver = null;

const markdown = window.markdownit({ html: false, linkify: false, typographer: false });

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function makeId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoNow() {
  return new Date().toISOString();
}

function deriveTitle(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}…` : clean;
}

function normalizeWorkspace(input) {
  const workspace = input && typeof input === 'object' ? input : {};
  workspace.version = 1;
  workspace.activeConversationId = typeof workspace.activeConversationId === 'string' ? workspace.activeConversationId : null;
  workspace.conversations = Array.isArray(workspace.conversations) ? workspace.conversations : [];
  workspace.projects = Array.isArray(workspace.projects) ? workspace.projects : [];

  workspace.projects = workspace.projects.map((project) => ({
    id: String(project.id || makeId('project')),
    name: String(project.name || 'Untitled project'),
    createdAt: project.createdAt || isoNow(),
    updatedAt: project.updatedAt || project.createdAt || isoNow(),
    collapsed: Boolean(project.collapsed),
  }));

  const validProjectIds = new Set(workspace.projects.map((project) => project.id));
  workspace.conversations = workspace.conversations.map((conversation) => ({
    id: String(conversation.id || makeId('chat')),
    title: String(conversation.title || 'New chat'),
    createdAt: conversation.createdAt || isoNow(),
    updatedAt: conversation.updatedAt || conversation.createdAt || isoNow(),
    pinned: Boolean(conversation.pinned),
    projectId: validProjectIds.has(conversation.projectId) ? conversation.projectId : null,
    model: typeof conversation.model === 'string' ? conversation.model : '',
    messages: Array.isArray(conversation.messages) ? conversation.messages : [],
  }));

  if (!workspace.conversations.some((conversation) => conversation.id === workspace.activeConversationId)) {
    workspace.activeConversationId = null;
  }

  return workspace;
}

function loadWorkspace() {
  const stored = safeJsonParse(localStorage.getItem(WORKSPACE_KEY), null);
  if (stored) return normalizeWorkspace(stored);

  const workspace = normalizeWorkspace(null);
  const legacyMessages = safeJsonParse(localStorage.getItem(LEGACY_MESSAGES_KEY), []);
  if (Array.isArray(legacyMessages) && legacyMessages.length) {
    const firstUser = legacyMessages.find((message) => message?.role === 'user' && message?.content);
    const now = isoNow();
    const migrated = {
      id: makeId('chat'),
      title: deriveTitle(firstUser?.content || 'Previous conversation'),
      createdAt: now,
      updatedAt: now,
      pinned: false,
      projectId: null,
      model: '',
      messages: legacyMessages,
    };
    workspace.conversations.push(migrated);
    workspace.activeConversationId = migrated.id;
  }

  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  localStorage.removeItem(LEGACY_MESSAGES_KEY);
  return workspace;
}

const state = {
  workspace: loadWorkspace(),
  messages: [],
  settings: safeJsonParse(
    localStorage.getItem(SETTINGS_KEY),
    { system: 'You are a helpful local AI assistant.', temperature: 0.7 },
  ),
};

const activeAtLoad = state.workspace.conversations.find(
  (conversation) => conversation.id === state.workspace.activeConversationId,
);
state.messages = activeAtLoad ? activeAtLoad.messages : [];

const chatLifecycle = {
  active: false,
  label: '',
  kind: '',
  startedAt: 0,
  firstTokenAt: 0,
  timerId: null,
  cancelRequested: false,
};

async function j(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function health() {
  const x = await j('/api/health');
  $('#dot').classList.toggle('ok', x.ollama);
  $('#statusText').textContent = x.ollama ? 'Ollama connected' : 'Ollama offline';
  return x.ollama;
}

async function loadModels() {
  const x = await j('/api/models');
  const s = $('#modelSelect');
  installed = new Set((x.models || []).map((m) => m.name));
  const old = s.value;
  const activeModel = getActiveConversation()?.model || '';

  s.innerHTML = '';
  if (!x.models.length) {
    s.innerHTML = '<option>No models installed</option>';
    $('#send').disabled = true;
    return;
  }

  s.add(new Option('Select local model…', ''));
  x.models.forEach((m) => s.add(new Option(`${m.name} (${formatBytes(m.size)})`, m.name)));

  if (installed.has(activeModel)) s.value = activeModel;
  else if (installed.has(old)) s.value = old;

  $('#send').disabled = false;
}

function formatBytes(n) {
  if (!n) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), 4);
  return `${(n / 1024 ** i).toFixed(i > 2 ? 1 : 0)} ${u[i]}`;
}

function renderAssistantMarkdown(content) {
  return DOMPurify.sanitize(markdown.render(String(content ?? '')), {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: false,
  });
}

function addCodeCopyButtons(container) {
  container.querySelectorAll('pre>code').forEach((code) => {
    const pre = code.parentElement;
    if (pre.querySelector('.copy-code')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.title = 'Copy code';
    button.textContent = 'Copy';
    pre.appendChild(button);
  });
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function updateChatStatus() {
  if (!chatLifecycle.active) return;
  $('#chatStatusTime').textContent = formatElapsed(performance.now() - chatLifecycle.startedAt);
}

function startChatLifecycle() {
  chatLifecycle.active = true;
  chatLifecycle.label = 'Preparing model...';
  chatLifecycle.kind = 'active';
  chatLifecycle.startedAt = performance.now();
  chatLifecycle.firstTokenAt = 0;
  chatLifecycle.cancelRequested = false;
  $('#chatStatus').hidden = false;
  $('#chatStatus').className = 'chat-status active';
  $('#chatStatusLabel').textContent = chatLifecycle.label;
  updateChatStatus();
  chatLifecycle.timerId = window.setInterval(updateChatStatus, 250);
}

function setChatLifecycleLabel(label) {
  chatLifecycle.label = label;
  $('#chatStatusLabel').textContent = label;
  updateChatStatus();
}

function finishChatLifecycle(kind, label, summary) {
  if (chatLifecycle.timerId) {
    window.clearInterval(chatLifecycle.timerId);
    chatLifecycle.timerId = null;
  }
  chatLifecycle.active = false;
  chatLifecycle.kind = kind;
  $('#chatStatus').hidden = false;
  $('#chatStatus').className = `chat-status ${kind}`;
  $('#chatStatusLabel').textContent = label;
  $('#chatStatusTime').textContent = summary || '';
}

function resetChatLifecycleUi() {
  if (chatLifecycle.timerId) {
    window.clearInterval(chatLifecycle.timerId);
    chatLifecycle.timerId = null;
  }
  chatLifecycle.active = false;
  chatLifecycle.label = '';
  chatLifecycle.kind = '';
  chatLifecycle.startedAt = 0;
  chatLifecycle.firstTokenAt = 0;
  chatLifecycle.cancelRequested = false;
  $('#chatStatus').hidden = true;
  $('#chatStatus').className = 'chat-status';
  $('#chatStatusLabel').textContent = '';
  $('#chatStatusTime').textContent = '';
}

function completeChatLifecycle() {
  const total = performance.now() - chatLifecycle.startedAt;
  const ttft = chatLifecycle.firstTokenAt ? chatLifecycle.firstTokenAt - chatLifecycle.startedAt : null;
  finishChatLifecycle(
    'complete',
    'Completed',
    `Completed in ${formatSeconds(total)}${ttft === null ? '' : ` · First token ${formatSeconds(ttft)}`}`,
  );
}

function stopChatLifecycle() {
  finishChatLifecycle('stopped', 'Stopped', '');
}

function failChatLifecycle(label) {
  finishChatLifecycle('error', label, '');
}

function setRequestControls(active) {
  $('#stop').hidden = !active;
  $('#send').hidden = active;
  $('#newChat').disabled = active;
}

function stopChat() {
  if (!requestInFlight) return;
  chatLifecycle.cancelRequested = true;
  stopChatLifecycle();
  controller?.abort();
}

function saveWorkspace() {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state.workspace));
}

function getActiveConversation() {
  return state.workspace.conversations.find(
    (conversation) => conversation.id === state.workspace.activeConversationId,
  ) || null;
}

function saveActiveConversation({ touch = true } = {}) {
  const conversation = getActiveConversation();
  if (!conversation) return;
  conversation.messages = state.messages;
  if (touch) conversation.updatedAt = isoNow();
  const model = $('#modelSelect')?.value || '';
  if (model && model !== 'No models installed') conversation.model = model;
  saveWorkspace();
  renderSidebar();
}

function ensureConversationForSend(model, firstPrompt) {
  let conversation = getActiveConversation();
  if (conversation) return conversation;

  const now = isoNow();
  conversation = {
    id: makeId('chat'),
    title: deriveTitle(firstPrompt),
    createdAt: now,
    updatedAt: now,
    pinned: false,
    projectId: null,
    model,
    messages: [],
  };
  state.workspace.conversations.push(conversation);
  state.workspace.activeConversationId = conversation.id;
  state.messages = conversation.messages;
  saveWorkspace();
  renderSidebar();
  return conversation;
}

function switchTab(tabName) {
  $$('.nav,.tab').forEach((element) => element.classList.remove('active'));
  const nav = $(`.nav[data-tab="${tabName}"]`);
  const tab = $(`#${tabName}`);
  nav?.classList.add('active');
  tab?.classList.add('active');
  if (tabName === 'models' && !searchRows.length) searchCatalog();
}

function startNewChat() {
  if (requestInFlight) return;
  closeContextMenu();
  state.workspace.activeConversationId = null;
  state.messages = [];
  saveWorkspace();
  resetChatLifecycleUi();
  render();
  renderSidebar();
  switchTab('chat');
  $('#prompt').focus();
}

function openConversation(id) {
  if (requestInFlight) return;
  const conversation = state.workspace.conversations.find((item) => item.id === id);
  if (!conversation) return;

  state.workspace.activeConversationId = conversation.id;
  state.messages = conversation.messages;
  saveWorkspace();
  resetChatLifecycleUi();
  render();
  renderSidebar();
  switchTab('chat');

  if (installed.has(conversation.model)) $('#modelSelect').value = conversation.model;
  else if (conversation.model) $('#modelSelect').value = '';
}

function sortByUpdatedDesc(items) {
  return [...items].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function conversationMatches(conversation, filter) {
  if (!filter) return true;
  return conversation.title.toLowerCase().includes(filter.toLowerCase());
}

function createConversationRow(conversation) {
  const row = document.createElement('div');
  row.className = `chat-row${conversation.id === state.workspace.activeConversationId ? ' active' : ''}`;
  row.dataset.chatId = conversation.id;

  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'chat-open';
  open.dataset.action = 'open-chat';
  open.dataset.chatId = conversation.id;
  open.title = conversation.title;

  const title = document.createElement('span');
  title.className = 'chat-title';
  title.textContent = conversation.title;
  open.appendChild(title);

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'chat-more';
  more.dataset.action = 'chat-menu';
  more.dataset.chatId = conversation.id;
  more.title = `Actions for ${conversation.title}`;
  more.setAttribute('aria-label', `Actions for ${conversation.title}`);
  more.textContent = '•••';

  row.append(open, more);
  return row;
}

function renderConversationList(container, conversations, emptyText = '') {
  container.innerHTML = '';
  if (!conversations.length) {
    if (emptyText) {
      const empty = document.createElement('div');
      empty.className = 'sidebar-empty';
      empty.textContent = emptyText;
      container.appendChild(empty);
    }
    return;
  }
  conversations.forEach((conversation) => container.appendChild(createConversationRow(conversation)));
}

function renderProjects(filter) {
  const box = $('#projectsList');
  box.innerHTML = '';

  if (!state.workspace.projects.length) {
    const empty = document.createElement('div');
    empty.className = 'sidebar-empty';
    empty.textContent = 'No projects yet';
    box.appendChild(empty);
    return;
  }

  const projects = [...state.workspace.projects].sort((a, b) => a.name.localeCompare(b.name));
  projects.forEach((project) => {
    const allProjectChats = sortByUpdatedDesc(
      state.workspace.conversations.filter(
        (conversation) => conversation.projectId === project.id && !conversation.pinned,
      ),
    );
    const projectNameMatches = filter && project.name.toLowerCase().includes(filter.toLowerCase());
    const chats = filter && !projectNameMatches
      ? allProjectChats.filter((conversation) => conversationMatches(conversation, filter))
      : allProjectChats;

    if (filter && !projectNameMatches && !chats.length) return;

    const projectEl = document.createElement('div');
    projectEl.className = 'project-group';

    const header = document.createElement('div');
    header.className = 'project-row';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'project-toggle';
    toggle.dataset.action = 'toggle-project';
    toggle.dataset.projectId = project.id;
    toggle.title = project.collapsed ? `Expand ${project.name}` : `Collapse ${project.name}`;

    const chevron = document.createElement('span');
    chevron.className = 'project-chevron';
    chevron.textContent = filter || !project.collapsed ? '⌄' : '›';

    const name = document.createElement('span');
    name.className = 'project-name';
    name.textContent = project.name;

    const count = document.createElement('span');
    count.className = 'project-count';
    count.textContent = String(allProjectChats.length);

    toggle.append(chevron, name, count);

    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'project-more';
    more.dataset.action = 'project-menu';
    more.dataset.projectId = project.id;
    more.title = `Actions for ${project.name}`;
    more.setAttribute('aria-label', `Actions for ${project.name}`);
    more.textContent = '•••';

    header.append(toggle, more);
    projectEl.appendChild(header);

    const list = document.createElement('div');
    list.className = 'chat-list project-chat-list';
    const expanded = Boolean(filter) || !project.collapsed;
    list.hidden = !expanded;
    if (expanded) renderConversationList(list, chats, filter ? '' : 'No chats yet');
    projectEl.appendChild(list);

    box.appendChild(projectEl);
  });

  if (!box.children.length) {
    const empty = document.createElement('div');
    empty.className = 'sidebar-empty';
    empty.textContent = 'No matching projects';
    box.appendChild(empty);
  }
}

function renderSidebar() {
  const filter = sidebarFilter.trim();
  const conversations = state.workspace.conversations;

  const pinned = sortByUpdatedDesc(
    conversations.filter((conversation) => conversation.pinned && conversationMatches(conversation, filter)),
  );
  $('#pinnedSection').hidden = pinned.length === 0;
  renderConversationList($('#pinnedChats'), pinned);

  renderProjects(filter);

  const recent = sortByUpdatedDesc(
    conversations.filter(
      (conversation) => !conversation.pinned
        && !conversation.projectId
        && conversationMatches(conversation, filter),
    ),
  );
  renderConversationList($('#recentChats'), recent, filter ? 'No matching chats' : 'No chats yet');
}

function render() {
  const box = $('#messages');
  box.innerHTML = state.messages.length
    ? ''
    : '<div class="hero"><h1>Your local AI workbench</h1><p>Find a local model in Model Library, install it with Ollama, then start chatting.</p></div>';

  state.messages.forEach((message) => {
    const d = document.createElement('div');
    d.className = `msg ${message.role}`;
    if (message.role === 'assistant') {
      d.innerHTML = renderAssistantMarkdown(message.content);
      addCodeCopyButtons(d);
    } else {
      d.textContent = message.content;
    }
    box.appendChild(d);
  });

  box.scrollTop = box.scrollHeight;
}

async function send() {
  const p = $('#prompt').value.trim();
  const model = $('#modelSelect').value;
  if (requestInFlight || !p || !model || model === 'No models installed') return;

  ensureConversationForSend(model, p);
  requestInFlight = true;
  startChatLifecycle();
  setRequestControls(true);

  state.messages.push({ role: 'user', content: p });
  $('#prompt').value = '';
  saveActiveConversation();
  render();

  const assistant = { role: 'assistant', content: '' };
  state.messages.push(assistant);
  render();

  controller = new AbortController();

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: state.messages.slice(0, -1),
        system: state.settings.system,
        temperature: state.settings.temperature,
      }),
    });

    if (!r.ok) {
      const error = new Error(await r.text());
      error.kind = 'backend';
      throw error;
    }

    setChatLifecycleLabel('Processing prompt...');
    const rd = r.body.getReader();
    const dec = new TextDecoder();

    while (true) {
      const { value, done } = await rd.read();
      if (done) break;
      const chunk = dec.decode(value, { stream: true });
      if (chunk.trim() && !chatLifecycle.firstTokenAt) {
        chatLifecycle.firstTokenAt = performance.now();
        setChatLifecycleLabel('Generating response...');
      }
      assistant.content += chunk;
      render();
    }

    completeChatLifecycle();
  } catch (e) {
    if (e.name === 'AbortError' || chatLifecycle.cancelRequested) {
      if (chatLifecycle.active) stopChatLifecycle();
    } else if (e.kind === 'backend') {
      failChatLifecycle('Backend error');
    } else {
      failChatLifecycle('Network error');
    }
  } finally {
    controller = null;
    requestInFlight = false;
    setRequestControls(false);
    saveActiveConversation();
    render();
  }
}

async function searchCatalog() {
  const box = $('#catalog');
  const q = $('#modelQuery').value.trim();
  box.innerHTML = '<div class="empty">Searching Ollama…</div>';
  try {
    const x = await j(`/api/catalog/search?q=${encodeURIComponent(q)}`);
    searchRows = x.models || [];
    renderFamilies();
  } catch (e) {
    box.innerHTML = `<div class="empty">Search failed: ${esc(e.message)}</div>`;
  }
}

function renderFamilies() {
  const box = $('#catalog');
  const rows = [...searchRows];
  if ($('#sortModels').value === 'name') rows.sort((a, b) => a.name.localeCompare(b.name));
  else rows.sort((a, b) => (b.downloads_value || 0) - (a.downloads_value || 0));

  if (!rows.length) {
    box.innerHTML = '<div class="empty">No matching Ollama models found. Try another model family name.</div>';
    return;
  }

  box.innerHTML = '';
  rows.forEach((m) => {
    const d = document.createElement('article');
    d.className = 'family';
    d.innerHTML = `<div class="family-summary"><div><h3>${esc(m.name)}</h3><div class="chips">${(m.capabilities || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div><p>${esc(m.description || 'Ollama model family')}</p><div class="meta">${m.downloads ? `Downloads: ${esc(m.downloads)}` : ''}${m.updated ? ` · Updated ${esc(m.updated)}` : ''}</div></div><button class="details">Show variants</button></div><div class="variants" hidden></div>`;
    d.querySelector('.details').onclick = () => toggleDetail(m, d);
    box.appendChild(d);
  });
}

async function toggleDetail(m, card) {
  const area = card.querySelector('.variants');
  const btn = card.querySelector('.details');
  if (!area.hidden) {
    area.hidden = true;
    btn.textContent = 'Show variants';
    return;
  }

  area.hidden = false;
  btn.textContent = 'Hide variants';
  if (area.dataset.loaded) return;
  area.innerHTML = '<div class="meta" style="padding:14px 0">Loading published Ollama variants…</div>';

  try {
    const x = await j(`/api/catalog/model/${encodeURIComponent(m.name)}`);
    const variants = $('#localOnly').checked ? x.local_variants : x.variants;
    area.innerHTML = '';
    if (!variants.length) {
      area.innerHTML = '<div class="meta" style="padding:14px 0">No locally downloadable variants with published size were found.</div>';
      return;
    }
    variants.forEach((v) => area.appendChild(variantRow(v)));
    area.dataset.loaded = '1';
  } catch (e) {
    area.innerHTML = `<div class="meta" style="padding:14px 0">Could not load variants: ${esc(e.message)}</div>`;
  }
}

function variantRow(v) {
  const row = document.createElement('div');
  row.className = 'variant';
  const isInstalled = installed.has(v.tag);
  row.innerHTML = `<div class="variant-name">${esc(v.tag)}</div><div>${esc(v.size)}</div><div>${esc(v.context)} context</div><div>${esc(v.input)}</div><div>${isInstalled ? '<span class="installed">✓ Installed</span>' : v.local ? '<button class="pull">Download</button>' : '<span class="meta">Cloud / unavailable locally</span>'}</div><div class="progress"><div class="bar"></div></div><div class="meta ptext">${esc(v.updated || '')}</div>`;
  const b = row.querySelector('.pull');
  if (b) b.onclick = () => pull(v.tag, row);
  return row;
}

async function pull(name, row) {
  const b = row.querySelector('.pull');
  const bar = row.querySelector('.bar');
  const txt = row.querySelector('.ptext');
  b.disabled = true;
  txt.textContent = 'Starting download…';

  try {
    const r = await fetch('/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) throw new Error(await r.text());

    const rd = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line) continue;
        const x = JSON.parse(line);
        txt.textContent = x.status || 'Downloading…';
        if (x.total && x.completed) bar.style.width = `${Math.round((x.completed / x.total) * 100)}%`;
      }
    }

    txt.textContent = 'Installed successfully.';
    bar.style.width = '100%';
    await loadModels();
    b.replaceWith(Object.assign(document.createElement('span'), {
      className: 'installed',
      textContent: '✓ Installed',
    }));
  } catch (e) {
    txt.textContent = `Download failed: ${e.message}`;
    b.disabled = false;
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function closeContextMenu() {
  const menu = $('#contextMenu');
  menu.hidden = true;
  menu.innerHTML = '';
}

function positionContextMenu(anchor) {
  const menu = $('#contextMenu');
  const rect = anchor.getBoundingClientRect();
  menu.hidden = false;
  const menuRect = menu.getBoundingClientRect();
  const gap = 6;
  let left = rect.right + gap;
  let top = rect.top;

  if (left + menuRect.width > window.innerWidth - 8) left = rect.left - menuRect.width - gap;
  if (top + menuRect.height > window.innerHeight - 8) top = window.innerHeight - menuRect.height - 8;
  if (top < 8) top = 8;

  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${top}px`;
}

function addMenuButton(menu, label, action, { danger = false, disabled = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `context-menu-item${danger ? ' danger' : ''}`;
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', async () => {
    closeContextMenu();
    await action();
  });
  menu.appendChild(button);
}

function addMenuLabel(menu, label) {
  const el = document.createElement('div');
  el.className = 'context-menu-label';
  el.textContent = label;
  menu.appendChild(el);
}

function addMenuDivider(menu) {
  const divider = document.createElement('div');
  divider.className = 'context-menu-divider';
  menu.appendChild(divider);
}

function openChatMenu(anchor, conversationId) {
  if (requestInFlight) return;
  const conversation = state.workspace.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;

  const menu = $('#contextMenu');
  menu.innerHTML = '';

  addMenuButton(menu, conversation.pinned ? 'Unpin chat' : 'Pin chat', () => {
    conversation.pinned = !conversation.pinned;
    saveWorkspace();
    renderSidebar();
  });

  addMenuButton(menu, 'Rename', async () => {
    const name = await askForName('Rename chat', 'Chat title', conversation.title);
    if (!name) return;
    conversation.title = name;
    saveWorkspace();
    renderSidebar();
  });

  addMenuDivider(menu);
  addMenuLabel(menu, 'Move to project');

  addMenuButton(menu, 'Recent (no project)', () => {
    conversation.projectId = null;
    saveWorkspace();
    renderSidebar();
  }, { disabled: !conversation.projectId });

  state.workspace.projects
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((project) => {
      addMenuButton(menu, project.name, () => {
        conversation.projectId = project.id;
        saveWorkspace();
        renderSidebar();
      }, { disabled: conversation.projectId === project.id });
    });

  addMenuButton(menu, 'Create project…', async () => {
    const name = await askForName('New project', 'Project name', '');
    if (!name) return;
    const project = createProject(name);
    conversation.projectId = project.id;
    saveWorkspace();
    renderSidebar();
  });

  addMenuDivider(menu);
  addMenuButton(menu, 'Delete chat', () => {
    if (!window.confirm(`Delete “${conversation.title}”? This cannot be undone.`)) return;
    state.workspace.conversations = state.workspace.conversations.filter((item) => item.id !== conversation.id);
    if (state.workspace.activeConversationId === conversation.id) {
      state.workspace.activeConversationId = null;
      state.messages = [];
      resetChatLifecycleUi();
      render();
    }
    saveWorkspace();
    renderSidebar();
  }, { danger: true });

  positionContextMenu(anchor);
}

function createProject(name) {
  const now = isoNow();
  const project = {
    id: makeId('project'),
    name,
    createdAt: now,
    updatedAt: now,
    collapsed: false,
  };
  state.workspace.projects.push(project);
  return project;
}

function openProjectMenu(anchor, projectId) {
  if (requestInFlight) return;
  const project = state.workspace.projects.find((item) => item.id === projectId);
  if (!project) return;

  const menu = $('#contextMenu');
  menu.innerHTML = '';

  addMenuButton(menu, 'Rename project', async () => {
    const name = await askForName('Rename project', 'Project name', project.name);
    if (!name) return;
    project.name = name;
    project.updatedAt = isoNow();
    saveWorkspace();
    renderSidebar();
  });

  addMenuButton(menu, 'Delete project', () => {
    if (!window.confirm(`Delete project “${project.name}”? Chats will be moved to Recent.`)) return;
    state.workspace.conversations.forEach((conversation) => {
      if (conversation.projectId === project.id) conversation.projectId = null;
    });
    state.workspace.projects = state.workspace.projects.filter((item) => item.id !== project.id);
    saveWorkspace();
    renderSidebar();
  }, { danger: true });

  positionContextMenu(anchor);
}

function askForName(title, label, initialValue = '') {
  return new Promise((resolve) => {
    nameDialogResolver = resolve;
    $('#nameDialogTitle').textContent = title;
    $('#nameDialogLabel').textContent = label;
    $('#nameDialogInput').value = initialValue;
    $('#nameDialog').showModal();
    window.setTimeout(() => {
      $('#nameDialogInput').focus();
      $('#nameDialogInput').select();
    }, 0);
  });
}

function finishNameDialog(value) {
  const resolver = nameDialogResolver;
  nameDialogResolver = null;
  $('#nameDialog').close();
  if (resolver) resolver(value || null);
}

$('#messages').addEventListener('click', async (e) => {
  const button = e.target.closest('.copy-code');
  if (!button) return;
  const code = button.parentElement.querySelector('code');
  try {
    await navigator.clipboard.writeText(code.textContent);
    button.textContent = 'Copied';
    window.setTimeout(() => { button.textContent = 'Copy'; }, 1400);
  } catch {
    button.textContent = 'Copy failed';
    window.setTimeout(() => { button.textContent = 'Copy'; }, 1400);
  }
});

$('#sidebarWorkspace').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]');
  if (!action) return;

  if (action.dataset.action === 'open-chat') {
    openConversation(action.dataset.chatId);
  } else if (action.dataset.action === 'chat-menu') {
    e.stopPropagation();
    openChatMenu(action, action.dataset.chatId);
  } else if (action.dataset.action === 'toggle-project') {
    const project = state.workspace.projects.find((item) => item.id === action.dataset.projectId);
    if (!project) return;
    project.collapsed = !project.collapsed;
    saveWorkspace();
    renderSidebar();
  } else if (action.dataset.action === 'project-menu') {
    e.stopPropagation();
    openProjectMenu(action, action.dataset.projectId);
  }
});

$$('.nav').forEach((button) => {
  button.onclick = () => switchTab(button.dataset.tab);
});

$('#send').onclick = send;
$('#stop').onclick = stopChat;
$('#prompt').onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
};

$('#newChat').onclick = startNewChat;

$('#newProject').onclick = async () => {
  if (requestInFlight) return;
  const name = await askForName('New project', 'Project name', '');
  if (!name) return;
  createProject(name);
  saveWorkspace();
  renderSidebar();
};

$('#chatSearch').oninput = (e) => {
  sidebarFilter = e.target.value;
  renderSidebar();
};

$('#theme').onclick = () => {
  document.body.classList.toggle('dark');
  localStorage.setItem(DARK_KEY, document.body.classList.contains('dark'));
};

$('#modelSelect').onchange = () => {
  const conversation = getActiveConversation();
  if (!conversation) return;
  const value = $('#modelSelect').value;
  if (value && value !== 'No models installed') {
    conversation.model = value;
    saveWorkspace();
  }
};

$('#temp').oninput = (e) => { $('#tempVal').textContent = e.target.value; };
$('#saveSettings').onclick = () => {
  state.settings = {
    system: $('#system').value,
    temperature: +$('#temp').value,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
};

$('#searchForm').onsubmit = (e) => {
  e.preventDefault();
  searchCatalog();
};
$('#refreshCatalog').onclick = searchCatalog;
$('#sortModels').onchange = renderFamilies;
$('#localOnly').onchange = () => {
  document.querySelectorAll('.variants').forEach((x) => {
    x.dataset.loaded = '';
    x.hidden = true;
  });
  document.querySelectorAll('.details').forEach((x) => { x.textContent = 'Show variants'; });
};

$('#nameDialogForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const value = $('#nameDialogInput').value.trim();
  if (!value) {
    $('#nameDialogInput').focus();
    return;
  }
  finishNameDialog(value);
});

$('#nameDialogCancel').onclick = () => finishNameDialog(null);
$('#nameDialog').addEventListener('cancel', (e) => {
  e.preventDefault();
  finishNameDialog(null);
});

document.addEventListener('click', (e) => {
  const menu = $('#contextMenu');
  if (!menu.hidden && !e.target.closest('#contextMenu') && !e.target.closest('.chat-more,.project-more')) {
    closeContextMenu();
  }
});

window.addEventListener('resize', closeContextMenu);
$('#sidebarWorkspace').addEventListener('scroll', closeContextMenu);

if (localStorage.getItem(DARK_KEY) === 'true') document.body.classList.add('dark');
$('#system').value = state.settings.system;
$('#temp').value = state.settings.temperature;
$('#tempVal').textContent = state.settings.temperature;

render();
renderSidebar();
health().then(loadModels).catch(() => {
  $('#statusText').textContent = 'Backend/Ollama unavailable';
});

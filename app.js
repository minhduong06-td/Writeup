if (window.mermaid) {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: 'dark'
  });
}

(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
})();

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-toggle').textContent = next === 'dark' ? '☀️' : '🌙';
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'dark'
    });
  }
});

const els = {
  homeView:          document.getElementById('home-view'),
  trainingView:      document.getElementById('training-view'),
  ctfView:           document.getElementById('ctf-view'),
  listView:          document.getElementById('list-view'),
  postView:          document.getElementById('post-view'),
  listBreadcrumb:    document.getElementById('list-breadcrumb'),
  listTitle:         document.getElementById('list-title'),
  postGrid:          document.getElementById('post-grid'),
  postBreadcrumb:    document.getElementById('post-breadcrumb'),
  postTitle:         document.getElementById('post-title'),
  postLevel:         document.getElementById('post-level'),
  markdown:          document.getElementById('markdown'),
  backHome:          document.getElementById('back-home'),
  backList:          document.getElementById('back-list'),
  searchInput:       document.getElementById('search-input'),
  searchBtn:         document.getElementById('search-btn'),
  searchResults:     document.getElementById('search-results'),
  postSearchInput:   document.getElementById('post-search-input'),
  postSearchBtn:     document.getElementById('post-search-btn'),
  postSearchResults: document.getElementById('post-search-results'),
  postPagination:    document.getElementById('post-pagination'),
  trainingCount:     document.getElementById('training-count'),
  ctfCount:          document.getElementById('ctf-count'),
  taskCount:              document.getElementById('task-count'),
  taskView:               document.getElementById('task-view'),
  pwModal:           document.getElementById('pw-modal'),
  pwInput:           document.getElementById('pw-input'),
  pwSubmit:          document.getElementById('pw-submit'),
  pwCancel:          document.getElementById('pw-cancel'),
  pwError:           document.getElementById('pw-error'),
};

const state = {
  posts: [],
  currentCategory: null,
  currentLevel: null,
  currentPost: null,
  unlockedSlugs: new Set(),
};

marked.setOptions({ gfm: true, breaks: false, langPrefix: 'language-' });

const managedLevels = {};

function managedLevelKey(category, level) {
  return `${String(category || '')}\u0000${String(level || '')}`;
}

function managedLevel(category, level) {
  if (category) return managedLevels[managedLevelKey(category, level)] || null;
  const suffix = `\u0000${String(level || '')}`;
  const matches = Object.entries(managedLevels)
    .filter(([key]) => key.endsWith(suffix))
    .map(([, value]) => value);
  return matches.length === 1 ? matches[0] : null;
}

function mergeManagedLevel(category, level, meta = {}) {
  if (!category || !level || !meta || typeof meta !== 'object' || Array.isArray(meta)) return;
  const key = managedLevelKey(category, level);
  const current = managedLevels[key] || { category, level };
  const next = { ...current, category, level };

  if (meta.name) next.name = String(meta.name).trim();
  if (meta.icon) next.icon = String(meta.icon).trim();
  if (meta.color && /^#[0-9a-f]{3,8}$/i.test(String(meta.color).trim())) {
    next.color = String(meta.color).trim();
  }
  if (meta.mode) {
    const mode = String(meta.mode).trim().toLowerCase();
    if (['list', 'direct', 'difficulty'].includes(mode)) next.mode = mode;
  }
  managedLevels[key] = next;
}

function hydrateManagedLevels(posts) {
  for (const post of posts || []) {
    if (!post?.category || !post?.level) continue;
    mergeManagedLevel(post.category, post.level, {
      name: post.level_name,
      icon: post.level_icon,
      color: post.level_color,
      mode: post.level_mode,
    });
  }
}

function levelMetadataUrl(category, level) {
  const safeLevel = encodeURIComponent(String(level || ''));
  if (category === 'training') return `/trainning/${safeLevel}/level.json`;
  if (category === 'ctf-competitions') return `/ctf-competitions/${safeLevel}/event.json`;
  if (category === 'task') return `/task/${safeLevel}/group.json`;
  return null;
}

async function loadManagedLevelMetadata(posts) {
  const pairs = new Map();
  for (const post of posts || []) {
    if (!post?.category || !post?.level) continue;
    pairs.set(managedLevelKey(post.category, post.level), { category: post.category, level: post.level });
  }

  await Promise.all([...pairs.values()].map(async ({ category, level }) => {
    const url = levelMetadataUrl(category, level);
    if (!url) return;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const meta = await res.json();
      mergeManagedLevel(category, level, meta);
    } catch (err) {
      console.warn(`[!] Cannot load UI metadata ${url}: ${err.message}`);
    }
  }));
}

const categoryUi = {
  training: { label: 'HTB', hash: '#training', back: '⬅ HTB' },
  'ctf-competitions': { label: 'CTF-COMPETITIONS', hash: '#ctf-competitions', back: '⬅ CTF' },
  task: { label: 'TASK', hash: '#task', back: '⬅ TASK' },
};

const difficultyColors = {
  'very-easy': '#8c05a1',
  'easy':      '#16a34a',
  'medium':    '#ca8a04',
  'hard':      '#dc2626',
  'insane':    '#6b7280',
};

function normalizePasswordRequired(value) {
  return value === true;
}

function normalizeDifficulty(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase().replace(/[ _]+/g, '-');
}

function difficultyColor(difficulty) {
  return difficultyColors[normalizeDifficulty(difficulty)] || null;
}

function autoLevelColor(level) {
  const palette = ['#2563eb', '#7c3aed', '#0891b2', '#0f766e', '#a16207', '#be123c', '#4f46e5', '#b45309'];
  let hash = 0;
  const text = String(level || 'default');
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function levelColor(level, category = null) {
  const meta = managedLevel(category, level);
  if (meta?.color) return meta.color;
  if (category === 'training') {
    const semantic = difficultyColor(level);
    if (semantic) return semantic;
  }
  return autoLevelColor(level);
}

function postColor(post) {
  const explicitDifficulty = difficultyColor(post?.difficulty);
  if (explicitDifficulty) return explicitDifficulty;
  return levelColor(post?.level, post?.category);
}

function formatLevel(level, category = null) {
  const meta = managedLevel(category, level);
  if (meta?.name) return meta.name;
  return String(level || 'UNKNOWN')
    .replace(/[-_]+/g, ' ')
    .replace(/\bctf\b/gi, 'CTF')
    .toUpperCase();
}

function levelMode(level, category = null) {
  return managedLevel(category, level)?.mode || 'list';
}

function levelButtonIcon(level, category = null) {
  const meta = managedLevel(category, level);
  if (meta?.icon) return meta.icon;

  if (category === 'training') {
    const icons = {
      'very-easy': '📗',
      'easy': '📘',
      'medium': '📙',
      'hard': '📕',
      'insane': '📓',
    };
    return icons[normalizeDifficulty(level)] || '📘';
  }
  if (category === 'ctf-competitions') return '🏆';
  if (category === 'task') return '🧩';
  return '📁';
}

function levelBackHash(level) {
  const category = resolveLevelCategory(level);
  if (levelMode(level, category) === 'direct') {
    return (categoryUi[category] || categoryUi.training).hash;
  }
  return `#level/${level}`;
}

function navigateToLevel(level) {
  const category = resolveLevelCategory(level);
  const items = state.posts.filter(p => p.category === category && p.level === level);
  if (levelMode(level, category) === 'direct' && items.length === 1) {
    navigate(`#post/${items[0].level}/${items[0].slug}`);
    return;
  }
  navigate(`#level/${level}`);
}

function postIcon(post) {
  if (post?.icon) return post.icon;
  if (post?.post_icon) return post.post_icon; // legacy compatibility
  return levelButtonIcon(post?.level, post?.category);
}

function slugFromPath(path) {
  const parts = path.split('/');
  return parts.length >= 2 ? parts[1] : path;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function navigate(hash) {
  if (hash === '#' || hash === '') {
    history.replaceState(null, '', location.pathname + location.search);
    router(); 
    return;
  }
  const encoded = hash.replace(/#/, '#').split('/').map((seg, i) =>
    i === 0 ? seg : encodeURIComponent(seg)
  ).join('/');
  if (location.hash === encoded) router();
  else location.hash = encoded;
}

function isExternal(url) {
  return /^(https?:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('#');
}

function absolutizeAsset(baseDir, relativePath) {
  return encodePath(baseDir + relativePath);
}

async function loadPosts() {
  const res = await fetch('/posts.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load posts.json');
  const posts = await res.json();
  return posts.map(post => ({
    ...post,
    slug: post.slug || slugFromPath(post.path),
    password_required: normalizePasswordRequired(post.password_required),
    difficulty: normalizeDifficulty(post.difficulty)
  }));
}

function formatPostBadge(post) {
  if (!post) return '';
  const diff = normalizeDifficulty(post.difficulty);
  if (diff) return `${formatLevel(post.level, post.category)} · ${formatLevel(diff)}`;
  return formatLevel(post.level, post.category);
}


function clearPostContent() {
  els.markdown.innerHTML = '';
  els.postTitle.textContent = '';
  els.postLevel.textContent = '';
  els.postBreadcrumb.innerHTML = '';
}

function showView(which) {
  if (which !== 'post') {
    clearPostContent();
  }

  els.homeView.classList.toggle('hidden',     which !== 'home');
  els.trainingView.classList.toggle('hidden', which !== 'training');
  els.ctfView.classList.toggle('hidden',      which !== 'ctf');
  els.taskView.classList.toggle('hidden',     which !== 'task');
  els.listView.classList.toggle('hidden',     which !== 'list');
  els.postView.classList.toggle('hidden',     which !== 'post');
}

function showHome() {
  state.currentCategory = null;
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('home');

  const trainingPosts = state.posts.filter(p => p.category === 'training');
  const ctfPosts      = state.posts.filter(p => p.category === 'ctf-competitions');

  if (els.trainingCount) els.trainingCount.textContent = `[ ${trainingPosts.length} FILES ]`;
  if (els.ctfCount)      els.ctfCount.textContent      = `[ ${ctfPosts.length} FILES ]`;
  const taskPosts = state.posts.filter(p => p.category === 'task');
  if (els.taskCount) els.taskCount.textContent = `[ ${taskPosts.length} FILES ]`;
}

function updateLevelCounts(viewId, category) {
  document.querySelectorAll(`#${viewId} .level-btn[data-level]`).forEach(btn => {
    const level = btn.dataset.level;
    const count = state.posts.filter(p => p.category === category && p.level === level).length;
    const countEl = btn.querySelector('.btn-sub');
    if (countEl) countEl.textContent = `[ ${count} FILES ]`;
  });
}

function ensureLevelButtons(viewId, category) {
  const switchEl = document.querySelector(`#${viewId} .level-switch`);
  if (!switchEl) return;

  const levelOrder = ['very-easy', 'easy', 'medium', 'hard', 'insane'];
  const rank = level => {
    const idx = levelOrder.indexOf(normalizeDifficulty(level));
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const levels = [...new Set(
    state.posts.filter(p => p.category === category).map(p => p.level).filter(Boolean)
  )].sort((a, b) =>
    (category === 'training' ? rank(a) - rank(b) : 0) ||
    formatLevel(a, category).localeCompare(formatLevel(b, category))
  );

  switchEl.innerHTML = '';
  for (const level of levels) {
    const firstPost = state.posts.find(p => p.category === category && p.level === level);
    const btn = document.createElement('button');
    btn.className = 'level-btn dynamic-level-btn';
    btn.dataset.level = level;
    btn.style.setProperty('--dynamic-level-color', levelColor(level, category));
    btn.innerHTML = `
      <span class="btn-icon">${levelButtonIcon(level, category)}</span>
      <span class="btn-label">${formatLevel(level, category)}</span>
      <span class="btn-sub">[ — FILES ]</span>
    `;
    switchEl.appendChild(btn);
  }

  updateLevelCounts(viewId, category);
}

function ensureAllLevelButtons() {
  ensureLevelButtons('training-view', 'training');
  ensureLevelButtons('ctf-view', 'ctf-competitions');
  ensureLevelButtons('task-view', 'task');
}

function resolveLevelCategory(level) {
  const categories = [...new Set(
    state.posts.filter(p => p.level === level).map(p => p.category)
  )];
  if (categories.length === 1) return categories[0];
  if (state.currentCategory && categories.includes(state.currentCategory)) return state.currentCategory;
  return 'training';
}

function levelCssToken(level) {
  return String(level).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function showTrainingView() {
  state.currentCategory = 'training';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('training');
  updateLevelCounts('training-view', 'training');
}

function showCtfView() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('ctf');
  updateLevelCounts('ctf-view', 'ctf-competitions');
}

function showTaskView() {
  state.currentCategory = 'task';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('task');
  updateLevelCounts('task-view', 'task');
}


function promptPassword(postTitle, errorMsg = null) {
  return new Promise((resolve, reject) => {
    const modal = els.pwModal;
    const titleEl = document.getElementById('pw-post-title');

    if (titleEl) titleEl.textContent = postTitle;
    els.pwInput.value = '';

    if (errorMsg) {
      els.pwError.textContent = errorMsg;
      els.pwError.classList.remove('hidden');

      const icon = document.querySelector('.pw-modal-icon');
      if (icon) {
        icon.classList.remove('shake');
        icon.offsetHeight;
        icon.classList.add('shake');
      }
    } else {
      els.pwError.classList.add('hidden');
      els.pwError.textContent = '';
    }

    modal.classList.remove('hidden');
    els.pwInput.focus();

    function cleanup() {
      modal.classList.add('hidden');
      els.pwSubmit.removeEventListener('click', onSubmit);
      els.pwCancel.removeEventListener('click', onCancel);
      els.pwInput.removeEventListener('keydown', onKeydown);
      modal.removeEventListener('click', onBackdropClick);
    }

    function onSubmit() {
      const val = els.pwInput.value.trim();
      if (!val) {
        els.pwError.textContent = '⚠ Please enter the password!';
        els.pwError.classList.remove('hidden');
        els.pwInput.focus();
        return;
      }
      cleanup();
      resolve(val);
    }

    function onCancel() {
      cleanup();
      reject(new Error('cancelled'));
    }

    function onKeydown(e) {
      if (e.key === 'Enter') onSubmit();
      if (e.key === 'Escape') onCancel();
    }

    function onBackdropClick(e) {
      if (e.target === modal) {
        onCancel();
      }
    }

    els.pwSubmit.addEventListener('click', onSubmit);
    els.pwCancel.addEventListener('click', onCancel);
    els.pwInput.addEventListener('keydown', onKeydown);
    modal.addEventListener('click', onBackdropClick);
  });
}

function showPasswordError(msg) {
  els.pwError.textContent = msg;
  els.pwError.classList.remove('hidden');
  els.pwInput.value = '';
  els.pwInput.focus();
}

function renderLevel(level) {
  const category = resolveLevelCategory(level);
  const ui = categoryUi[category] || categoryUi.training;

  state.currentCategory = category;
  state.currentLevel    = level;
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === category && p.level === level);
  const token = levelCssToken(level);

  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-list-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-list-category">${ui.label}</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">${formatLevel(level, category)}</span>
  `;
  document.getElementById('bc-list-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-list-category').addEventListener('click', () => navigate(ui.hash));

  els.listTitle.textContent = `${formatLevel(level, category)} — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-${token} ${post.password_required ? 'post-card-locked' : ''}"
      data-slug="${post.slug}" data-level="${post.level}"
      style="--card-color: ${postColor(post)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
      ${post.password_required ? '<div class="lock-badge">🔒</div>' : ''}
    </article>
  `).join('');

  els.backHome.textContent = ui.back;
  showView('list');

  els.postGrid.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function doPostSearch() {
  const query = els.postSearchInput.value.trim().toLowerCase();
  els.postSearchResults.classList.remove('hidden');

  if (!query) {
    els.postSearchResults.innerHTML = '';
    els.postSearchResults.classList.add('hidden');
    return;
  }

  const matches = state.posts.filter(post =>
    post.title.toLowerCase().includes(query) ||
    post.slug.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    els.postSearchResults.innerHTML = `<div class="search-no-result">[ NO MATCH ] — "${query}"</div>`;
    return;
  }

  els.postSearchResults.innerHTML = matches.map(post => `
    <div class="search-result-item" data-slug="${post.slug}" data-level="${post.level}">
      <span class="sri-icon">${postIcon(post)}</span>
      <span class="sri-title">${post.title}</span>
      <span class="sri-level">${formatPostBadge(post)}</span>
    </div>
  `).join('');

  els.postSearchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      els.postSearchResults.classList.add('hidden');
      els.postSearchInput.value = '';
      navigate(`#post/${item.dataset.level}/${item.dataset.slug}`);
    });
  });
}

function renderPagination(level, currentSlug) {
  const levelPosts = state.posts.filter(p => p.category === state.currentCategory && p.level === level);
  const currentIdx = levelPosts.findIndex(p => p.slug === currentSlug);

  if (levelPosts.length <= 1) {
    els.postPagination.classList.add('hidden');
    return;
  }

  els.postPagination.classList.remove('hidden');

  const prevPost = currentIdx > 0 ? levelPosts[currentIdx - 1] : null;
  const nextPost = currentIdx < levelPosts.length - 1 ? levelPosts[currentIdx + 1] : null;

  const total = levelPosts.length;
  let pageNums = [];
  if (total <= 9) {
    pageNums = levelPosts.map((_, i) => i);
  } else {
    const set = new Set([0, total - 1, currentIdx,
      Math.max(0, currentIdx - 1), Math.min(total - 1, currentIdx + 1)]);
    pageNums = [...set].sort((a, b) => a - b);
  }

  const pages = [];
  for (let i = 0; i < pageNums.length; i++) {
    if (i > 0 && pageNums[i] - pageNums[i - 1] > 1) pages.push({ type: 'ellipsis' });
    pages.push({ type: 'page', idx: pageNums[i] });
  }

  const levelLabel = formatLevel(level, levelPosts[currentIdx]?.category || resolveLevelCategory(level));

  els.postPagination.innerHTML = `
    <div class="pagination-label">📄 ${levelLabel} — ${currentIdx + 1} / ${total}</div>
    <div class="pagination-controls">
      <button class="page-btn page-prev ${!prevPost ? 'disabled' : ''}"
        ${prevPost ? `data-slug="${prevPost.slug}" data-level="${prevPost.level}"` : ''}
        ${!prevPost ? 'disabled' : ''}>⬅ PREV</button>

      <div class="page-numbers">
        ${pages.map(p => {
          if (p.type === 'ellipsis') return `<span class="page-ellipsis">…</span>`;
          const post = levelPosts[p.idx];
          const isActive = p.idx === currentIdx;
          return `<button class="page-num ${isActive ? 'active' : ''}"
            data-slug="${post.slug}" data-level="${post.level}"
            title="${post.title}">${p.idx + 1}</button>`;
        }).join('')}
      </div>

      <button class="page-btn page-next ${!nextPost ? 'disabled' : ''}"
        ${nextPost ? `data-slug="${nextPost.slug}" data-level="${nextPost.level}"` : ''}
        ${!nextPost ? 'disabled' : ''}>NEXT ➡</button>
    </div>
  `;

  els.postPagination.querySelectorAll('[data-slug]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(`#post/${btn.dataset.level}/${btn.dataset.slug}`);
    });
  });
}

async function renderPost(level, slug) {
  const post = state.posts.find(p => p.level === level && p.slug === slug);
  if (!post) { showHome(); return; }

  state.currentCategory = post.category;
  state.currentLevel    = level;
  state.currentPost     = post;

  if (post.category === 'task') {
    els.postBreadcrumb.innerHTML = `
      <span class="bc-root" id="bc-post-root">[ ROOT ]</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-task">TASK</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-level">${formatLevel(level, post.category)}</span>
      <span class="bc-sep">▶</span>
      <span class="bc-current">${post.title}</span>
    `;
    document.getElementById('bc-post-root').addEventListener('click', () => navigate('#'));
    document.getElementById('bc-post-task').addEventListener('click', () => navigate('#task'));
    document.getElementById('bc-post-level').addEventListener('click', () => navigate(levelBackHash(level)));
  } else if (post.category === 'ctf-competitions') {
    els.postBreadcrumb.innerHTML = `
      <span class="bc-root" id="bc-post-root">[ ROOT ]</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-ctf">CTF-COMPETITIONS</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-level">${formatLevel(level, post.category)}</span>
      <span class="bc-sep">▶</span>
      <span class="bc-current" id="post-title-bc">${post.title}</span>
    `;
    document.getElementById('bc-post-root').addEventListener('click', () => navigate('#'));
    document.getElementById('bc-post-ctf').addEventListener('click', () => navigate('#ctf-competitions'));
    document.getElementById('bc-post-level').addEventListener('click', () => navigate(`#level/${level}`));
  } else {
    els.postBreadcrumb.innerHTML = `
      <span class="bc-root" id="bc-post-root">[ ROOT ]</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-cat">HTB</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-level">${formatLevel(level, post.category)}</span>
      <span class="bc-sep">▶</span>
      <span class="bc-current" id="post-title-bc">${post.title}</span>
    `;
    document.getElementById('bc-post-root').addEventListener('click', () => navigate('#'));
    document.getElementById('bc-post-cat').addEventListener('click', () => navigate('#training'));
    document.getElementById('bc-post-level').addEventListener('click', () => navigate(`#level/${level}`));
  }

  els.postTitle.textContent = post.title;
  els.postLevel.textContent = formatPostBadge(post);
  els.markdown.innerHTML    = '<p style="font-family:var(--mono-font);font-size:18px;color:var(--muted)">▮ Loading...</p>';
  els.postSearchInput.value = '';
  els.postSearchResults.classList.add('hidden');
  els.postSearchResults.innerHTML = '';

  renderPagination(level, slug);
  showView('post');

 let password = null;
  if (post.password_required) {
    if (state.unlockedSlugs.has(slug)) {
      password = sessionStorage.getItem(`pw_${slug}`);
    }

    let errorMsg = null;
    while (true) {
      if (!password) {
        try {
          password = await promptPassword(post.title, errorMsg);
        } catch {
          navigate(levelBackHash(level));
          return;
        }
      }

      const testRes = await fetch(`/api/post/${encodeURIComponent(post.slug)}`, {
        cache: 'no-store',
        headers: { 'x-post-password': password }
      });

      if (testRes.status === 401) {
        password = null;
        errorMsg = 'Wrong';
        continue;
      }

      let testData;
      try {
        testData = await testRes.json();
      } catch {
        els.markdown.innerHTML = `
          <div style="text-align:center;padding:56px 24px;font-family:var(--mono-font)">
            <div style="font-size:72px;margin-bottom:20px">⚠️</div>
            <div style="font-size:20px;color:#dc2626">[ ERROR ${testRes.status} ]</div>
            <div style="font-size:15px;color:var(--muted);margin-top:8px">Invalid response from server.</div>
          </div>`;
        return;
      }

      if (testRes.status === 404 && testData.error === 'markdown file not found') {
        els.markdown.innerHTML = `
          <div style="text-align:center;padding:56px 24px;font-family:var(--mono-font)">
            <div style="font-size:72px;margin-bottom:20px">📭</div>
            <div style="font-size:24px;color:var(--muted);margin-bottom:10px">[ NO CONTENT YET ]</div>
            <div style="font-size:17px;color:var(--border-lite)">
              Writeup for <strong style="color:var(--accent)">${post.title}</strong> hasn't been uploaded yet.
            </div>
          </div>`;
        return;
      }

      if (!testRes.ok) {
        els.markdown.innerHTML = `
          <div style="text-align:center;padding:56px 24px;font-family:var(--mono-font)">
            <div style="font-size:72px;margin-bottom:20px">⚠️</div>
            <div style="font-size:20px;color:#dc2626">[ ERROR ${testRes.status} ]</div>
            <div style="font-size:15px;color:var(--muted);margin-top:8px">${testData.error || 'Unknown error'}</div>
          </div>`;
        return;
      }

      state.unlockedSlugs.add(slug);
      sessionStorage.setItem(`pw_${slug}`, password);
      renderMarkdown(testData);
      return;
    }
  }
  
   const res = await fetch(`/api/post/${encodeURIComponent(post.slug)}`, { cache: 'no-store' });
   let resData;
   try {
     resData = await res.json();
   } catch {
     els.markdown.innerHTML = `
       <div style="text-align:center;padding:56px 24px;font-family:var(--mono-font)">
         <div style="font-size:72px;margin-bottom:20px">⚠️</div>
         <div style="font-size:20px;color:#dc2626">[ ERROR ${res.status} ]</div>
         <div style="font-size:15px;color:var(--muted);margin-top:8px">Invalid response from server.</div>
       </div>`;
     return;
   }

   if (res.status === 404 && resData.error === 'markdown file not found') {
     els.markdown.innerHTML = `
       <div style="text-align:center;padding:56px 24px;font-family:var(--mono-font)">
         <div style="font-size:72px;margin-bottom:20px">📭</div>
         <div style="font-size:24px;color:var(--muted);margin-bottom:10px">[ NO CONTENT YET ]</div>
         <div style="font-size:17px;color:var(--border-lite)">
           Writeup for <strong style="color:var(--accent)">${post.title}</strong> hasn't been uploaded yet.
         </div>
       </div>`;
     return;
   }

   if (!res.ok) {
     els.markdown.innerHTML = `
       <div style="text-align:center;padding:56px 24px;font-family:var(--mono-font)">
         <div style="font-size:72px;margin-bottom:20px">⚠️</div>
         <div style="font-size:20px;color:#dc2626">[ ERROR ${res.status} ]</div>
         <div style="font-size:15px;color:var(--muted);margin-top:8px">${resData.error || 'Unknown error'}</div>
       </div>`;
     return;
   }

   renderMarkdown(resData);
}

function renderMarkdown(postData) {
  const markdownText = postData.content;
  els.markdown.innerHTML = marked.parse(markdownText);

  if (window.hljs) {
    els.markdown.querySelectorAll('pre code').forEach(block => {
      if (block.classList.contains('language-mermaid')) return;
      const className = block.className || '';
      if (/\blanguage-(ps1|ps|pwsh)\b/i.test(className)) {
        block.classList.remove('language-ps1', 'language-ps', 'language-pwsh');
        block.classList.add('language-powershell');
      }
      if (/\blanguage-(sh|shellscript|zsh)\b/i.test(className)) {
        block.classList.remove('language-sh', 'language-shellscript', 'language-zsh');
        block.classList.add('language-bash');
      }
      if (!/\blanguage-/.test(block.className)) block.classList.add('language-plaintext');
      window.hljs.highlightElement(block);
    });
  }

  if (window.mermaid) {
    els.markdown.querySelectorAll('pre code.language-mermaid').forEach((block, i) => {
      const source = block.textContent;
      const container = document.createElement('div');
      container.className = 'mermaid';
      container.id = `mermaid-${Date.now()}-${i}`;
      container.textContent = source;
      block.parentElement.replaceWith(container);
    });
    window.mermaid.run({ nodes: els.markdown.querySelectorAll('.mermaid') });
  }

  const baseDir = postData.path.slice(0, postData.path.lastIndexOf('/') + 1);
  els.markdown.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!src || isExternal(src)) return;
    img.src = absolutizeAsset(baseDir, src);
    img.loading = 'lazy';
  });
  els.markdown.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href || isExternal(href)) return;
    link.href = absolutizeAsset(baseDir, href);
    link.target = '_blank';
    link.rel = 'noreferrer';
  });
}

function doSearch() {
  const query = els.searchInput.value.trim().toLowerCase();
  els.searchResults.classList.remove('hidden');

  if (!query) {
    els.searchResults.innerHTML = '';
    els.searchResults.classList.add('hidden');
    return;
  }

  const matches = state.posts.filter(post =>
    post.title.toLowerCase().includes(query) ||
    post.slug.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    els.searchResults.innerHTML = `<div class="search-no-result">[ NO MATCH ] — "${query}"</div>`;
    return;
  }

  els.searchResults.innerHTML = matches.map(post => `
    <div class="search-result-item" data-slug="${post.slug}" data-level="${post.level}">
      <span class="sri-icon">${postIcon(post)}</span>
      <span class="sri-title">${post.title}</span>
      <span class="sri-level">${formatPostBadge(post)}</span>
    </div>
  `).join('');

  els.searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      els.searchResults.classList.add('hidden');
      els.searchInput.value = '';
      navigate(`#post/${item.dataset.level}/${item.dataset.slug}`);
    });
  });
}

async function router() {
  const hash  = location.hash || '#';
  const parts = hash.slice(1).split('/').filter(Boolean).map(p => {
    try { return decodeURIComponent(p); } catch { return p; }
  });

  if (parts.length === 0)                          { showHome(); return; }
  if (parts[0] === 'training')                     { showTrainingView(); return; }
  if (parts[0] === 'ctf-competitions')             { showCtfView(); return; }
  if (parts[0] === 'task')                         { showTaskView(); return; }
  if (parts[0] === 'level' && parts[1]) {
    renderLevel(parts[1]);
    return;
  }
  if (parts[0] === 'post' && parts[1] && parts[2]) { await renderPost(parts[1], parts[2]); return; }
  showHome();
}

async function init() {
  try {
    state.posts = await loadPosts();
    hydrateManagedLevels(state.posts);
    await loadManagedLevelMetadata(state.posts);
    ensureAllLevelButtons();

    history.replaceState(null, '', window.location.pathname);
    location.hash = '';
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarToggle  = document.getElementById('sidebar-toggle');
    const sidebarReopen  = document.getElementById('sidebar-reopen');

    let sidebarOpen = localStorage.getItem('sidebar') !== 'closed';

    function applySidebar() {
      if (sidebarOpen) {
        sidebarContent.classList.remove('collapsed');
        sidebarToggle.textContent = '◀ HIDE';
        sidebarReopen.classList.add('hidden');
      } else {
        sidebarContent.classList.add('collapsed');
        sidebarToggle.textContent = '▶ SHOW';
        sidebarReopen.classList.remove('hidden');
      }
      localStorage.setItem('sidebar', sidebarOpen ? 'open' : 'closed');
    }

    sidebarToggle.addEventListener('click', () => {
      sidebarOpen = !sidebarOpen;
      applySidebar();
    });

    sidebarReopen.addEventListener('click', () => {
      sidebarOpen = true;
      applySidebar();
    });

    applySidebar();

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        if (cat === 'ctf-competitions') navigate('#ctf-competitions');
        else if (cat === 'task') navigate('#task');
        else navigate('#training');
      });
    });

    for (const viewId of ['training-view', 'ctf-view', 'task-view']) {
      document.querySelectorAll(`#${viewId} .level-btn`).forEach(btn => {
        btn.addEventListener('click', () => navigateToLevel(btn.dataset.level));
      });
    }

    document.getElementById('back-home-from-training').addEventListener('click', () => {
      navigate('#');
    });
    document.getElementById('back-home-bc-tr').addEventListener('click', () => {
      navigate('#');
    });

    document.getElementById('back-home-from-ctf').addEventListener('click', () => {
      navigate('#');
    });
    document.getElementById('back-home-bc-ctf').addEventListener('click', () => {
      navigate('#');
    });
    document.getElementById('back-home-from-task').addEventListener('click', () => {
      navigate('#');
    });
    document.getElementById('back-home-bc-task').addEventListener('click', () => {
      navigate('#');
    });

    els.backHome.addEventListener('click', () => {
      if (state.currentCategory === 'ctf-competitions') navigate('#ctf-competitions');
      else if (state.currentCategory === 'task') navigate('#task');
      else navigate('#training');
    });

    els.backList.addEventListener('click', () => {
      if (state.currentLevel) {
        navigate(levelBackHash(state.currentLevel));
      } else {
        navigate('#training');
      }
    });

    els.searchBtn.addEventListener('click', doSearch);
    els.searchInput.addEventListener('input', doSearch);
    els.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        els.searchResults.classList.add('hidden');
        els.searchInput.value = '';
      }
    });

    els.postSearchBtn.addEventListener('click', doPostSearch);
    els.postSearchInput.addEventListener('input', doPostSearch);
    els.postSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        els.postSearchResults.classList.add('hidden');
        els.postSearchInput.value = '';
      }
    });

    document.addEventListener('click', e => {
      if (!els.searchResults.contains(e.target) && e.target !== els.searchInput && e.target !== els.searchBtn) {
        els.searchResults.classList.add('hidden');
      }
      if (!els.postSearchResults.contains(e.target) && e.target !== els.postSearchInput && e.target !== els.postSearchBtn) {
        els.postSearchResults.classList.add('hidden');
      }
    });

    els.pwModal.addEventListener('click', e => {
      if (e.target === els.pwModal) {
        els.pwCancel.click();
      }
    });

    window.addEventListener('hashchange', router);
    history.replaceState(null, '', location.pathname + location.search);
    await router();
  } catch (err) {
    console.error(err);
    state.posts = [];
    showView('home');
    if (els.searchResults) els.searchResults.classList.add('hidden');
  }
}

init();

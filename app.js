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
  easyCount:         document.getElementById('easy-count'),
  veryEasyCount:     document.getElementById('veryeasy-count'),
  mediumCount:       document.getElementById('medium-count'),
  texsaw2026Count:   document.getElementById('texsaw2026-count'),
  dawgctf2026Count:  document.getElementById('dawgctf2026-count'),
  umassctf2026Count: document.getElementById('umassctf2026-count'),
  taskCount:              document.getElementById('task-count'),
  taskView:               document.getElementById('task-view'),
  persistenceUbuntuCount: document.getElementById('persistence-ubuntu-count'),
  cit2026Count:      document.getElementById('cit2026-count'),
  bluehensctf2026Count: document.getElementById('bluehensctf2026-count'),
  // Password modal
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
  // password cache: slug → password string (only after successful auth)
  unlockedSlugs: new Set(),
};

marked.setOptions({ gfm: true, breaks: false, langPrefix: 'language-' });

const levelColors = {
  'easy':         '#1d4ed8',
  'very-easy':    '#16a34a',
  'medium':       '#ca8a04',
  'texsaw-2026':  '#92400e',
  'dawgctf-2026': '#4338ca',
  'umassctf-2026': '#7f1d1d',
  'persistence-ubuntu': '#0369a1',
  'cit-2026': '#0284c7',
  'bluehensctf-2026': '#00509d',
};

function levelColor(level) {
  return levelColors[level] || '#2d6a2d';
}

function formatLevel(level) {
  if (level === 'very-easy')   return 'VERY EASY';
  if (level === 'texsaw-2026') return 'TEXSAW 2026';
  if (level === 'dawgctf-2026') return 'DAWGCTF 2026';
  if (level === 'umassctf-2026') return 'UMASSCTF 2026';
  if (level === 'cit-2026') return 'CIT 2026';
  if (level === 'persistence-ubuntu') return 'PERSISTENCE UBUNTU';
  if (level === 'medium')      return 'MEDIUM';
  if (level === 'bluehensctf-2026') return 'BLUEHENSCTF 2026';
  return 'EASY';
}

function postIcon(post) {
  const levelIcons = {
    'dawgctf-2026': '🐾',
    'texsaw-2026':  '🏆',
    'very-easy':    '📗',
    'medium':       '📙',
    'easy':         '📘',
    'umassctf-2026': '🎓',
    'cit-2026': '💻',
    'persistence-ubuntu': '🐧',
    'bluehensctf-2026': '🐔',
  };

  if (levelIcons[post.level]) return levelIcons[post.level];
  if (post.category === 'ctf-competitions') return '🏆';
  return '📘';
}

function slugFromPath(path) {
  const parts = path.split('/');
  return parts.length >= 2 ? parts[1] : path;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function navigate(hash) {
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
  const res = await fetch('posts.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load posts.json');
  const posts = await res.json();
  return posts.map(post => ({
    ...post,
    slug: post.slug || slugFromPath(post.path)
  }));
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

function showTrainingView() {
  state.currentCategory = 'training';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('training');

  const easy     = state.posts.filter(p => p.category === 'training' && p.level === 'easy').length;
  const veryEasy = state.posts.filter(p => p.category === 'training' && p.level === 'very-easy').length;
  const medium   = state.posts.filter(p => p.category === 'training' && p.level === 'medium').length;

  if (els.easyCount)     els.easyCount.textContent     = `[ ${easy} FILES ]`;
  if (els.veryEasyCount) els.veryEasyCount.textContent = `[ ${veryEasy} FILES ]`;
  if (els.mediumCount)   els.mediumCount.textContent   = `[ ${medium} FILES ]`;
}

function showCtfView() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('ctf');

  const texsaw2026 = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'texsaw-2026').length;
  if (els.texsaw2026Count) els.texsaw2026Count.textContent = `[ ${texsaw2026} FILES ]`;
  const dawgctf2026 = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'dawgctf-2026').length;
  if (els.dawgctf2026Count) els.dawgctf2026Count.textContent = `[ ${dawgctf2026} FILES ]`;
  const umassctf2026 = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'umassctf-2026').length;
  if (els.umassctf2026Count) els.umassctf2026Count.textContent = `[ ${umassctf2026} FILES ]`;
  const cit2026 = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'cit-2026').length;
  if (els.cit2026Count) els.cit2026Count.textContent = `[ ${cit2026} FILES ]`;
  const bluehensctf2026 = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'bluehensctf-2026').length;
  if (els.bluehensctf2026Count) els.bluehensctf2026Count.textContent = `[ ${bluehensctf2026} FILES ]`;
}

function showTaskView() {
  state.currentCategory = 'task';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('task');

  const persistenceUbuntu = state.posts.filter(
    p => p.category === 'task' && p.level === 'persistence-ubuntu'
  ).length;
  if (els.persistenceUbuntuCount)
    els.persistenceUbuntuCount.textContent = `[ ${persistenceUbuntu} FILES ]`;
}


function promptPassword(postTitle, errorMsg = null) {
  return new Promise((resolve, reject) => {
    const modal = els.pwModal;
    const titleEl = document.getElementById('pw-post-title');
    if (titleEl) titleEl.textContent = postTitle;
    els.pwInput.value = '';

    // Hiển thị lỗi nếu được truyền vào (retry case)
    if (errorMsg) {
      els.pwError.textContent = errorMsg;
      els.pwError.classList.remove('hidden');
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
    }

    function onSubmit() {
      const val = els.pwInput.value.trim();
      if (!val) {
        els.pwError.textContent = '⚠ Vui lòng nhập mật khẩu!';
        els.pwError.classList.remove('hidden');
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

    els.pwSubmit.addEventListener('click', onSubmit);
    els.pwCancel.addEventListener('click', onCancel);
    els.pwInput.addEventListener('keydown', onKeydown);
  });
}

function showPasswordError(msg) {
  els.pwError.textContent = msg;
  els.pwError.classList.remove('hidden');
  els.pwInput.value = '';
  els.pwInput.focus();
}

// ─────────────────────────────────────────────

function renderPersistenceUbuntu() {
  state.currentCategory = 'task';
  state.currentLevel    = 'persistence-ubuntu';
  state.currentPost     = null;

  const items = state.posts.filter(
    p => p.category === 'task' && p.level === 'persistence-ubuntu'
  );
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-pu-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-pu-task">TASK</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">PERSISTENCE UBUNTU</span>
  `;
  document.getElementById('bc-pu-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-pu-task').addEventListener('click', () => navigate('#task'));

  els.listTitle.textContent = `PERSISTENCE UBUNTU — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-persistence-ubuntu ${post.password_required ? 'post-card-locked' : ''}"
      data-slug="${post.slug}" data-level="${post.level}"
      style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
      ${post.password_required ? '<div class="lock-badge">🔒</div>' : ''}
    </article>
  `).join('');

  els.backHome.textContent = '⬅ TASK';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function renderLevel(level) {
  state.currentCategory = 'training';
  state.currentLevel    = level;
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'training' && p.level === level);
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-list-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-list-training">TRAINING</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">${formatLevel(level)}</span>
  `;
  document.getElementById('bc-list-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-list-training').addEventListener('click', () => navigate('#training'));

  els.listTitle.textContent = `${formatLevel(level)} — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card" data-slug="${post.slug}" data-level="${post.level}" style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  els.backHome.textContent = '⬅ TRAINING';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function renderTexsaw2026() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = 'texsaw-2026';
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'texsaw-2026');
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-tx-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-tx-ctf">CTF-COMPETITIONS</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">TEXSAW 2026</span>
  `;
  document.getElementById('bc-tx-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-tx-ctf').addEventListener('click', () => navigate('#ctf-competitions'));

  els.listTitle.textContent = `TEXSAW 2026 — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-texsaw" data-slug="${post.slug}" data-level="${post.level}" style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  els.backHome.textContent = '⬅ CTF';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function renderDawgctf2026() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = 'dawgctf-2026';
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'dawgctf-2026');
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-dg-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-dg-ctf">CTF-COMPETITIONS</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">DAWGCTF 2026</span>
  `;
  document.getElementById('bc-dg-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-dg-ctf').addEventListener('click', () => navigate('#ctf-competitions'));

  els.listTitle.textContent = `DAWGCTF 2026 — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-dawgctf" data-slug="${post.slug}" data-level="${post.level}" style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  els.backHome.textContent = '⬅ CTF';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function renderUmassctf2026() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = 'umassctf-2026';
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'umassctf-2026');
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-um-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-um-ctf">CTF-COMPETITIONS</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">UMASSCTF 2026</span>
  `;
  document.getElementById('bc-um-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-um-ctf').addEventListener('click', () => navigate('#ctf-competitions'));

  els.listTitle.textContent = `UMASSCTF 2026 — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-umassctf" data-slug="${post.slug}" data-level="${post.level}" style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  els.backHome.textContent = '⬅ CTF';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function renderCit2026() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = 'cit-2026';
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'cit-2026');
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-ci-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-ci-ctf">CTF-COMPETITIONS</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">CIT 2026</span>
  `;
  document.getElementById('bc-ci-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-ci-ctf').addEventListener('click', () => navigate('#ctf-competitions'));

  els.listTitle.textContent = `CIT 2026 — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-cit" data-slug="${post.slug}" data-level="${post.level}"
      style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  els.backHome.textContent = '⬅ CTF';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

function renderBluehensctf2026() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = 'bluehensctf-2026';
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'bluehensctf-2026');
  els.listBreadcrumb.innerHTML = `
    <span class="bc-root" id="bc-b2-root">[ ROOT ]</span>
    <span class="bc-sep">▶</span>
    <span class="bc-mid" id="bc-b2-ctf">CTF-COMPETITIONS</span>
    <span class="bc-sep">▶</span>
    <span class="bc-current">BLUEHENSCTF 2026</span>
  `;
  document.getElementById('bc-b2-root').addEventListener('click', () => navigate('#'));
  document.getElementById('bc-b2-ctf').addEventListener('click', () => navigate('#ctf-competitions'));

  els.listTitle.textContent = `BLUEHENSCTF 2026 — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card post-card-bluehensctf2026" data-slug="${post.slug}" data-level="${post.level}"
      style="--card-color: ${levelColor(post.level)}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  els.backHome.textContent = '⬅ CTF';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
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
      <span class="sri-level">${formatLevel(post.level)}</span>
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
  const levelPosts = state.posts.filter(p => p.level === level);
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

  const levelLabel = formatLevel(level);

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

  // ── Build breadcrumb ──
  if (post.category === 'task') {
    els.postBreadcrumb.innerHTML = `
      <span class="bc-root" id="bc-post-root">[ ROOT ]</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-task">TASK</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-level">${formatLevel(level)}</span>
      <span class="bc-sep">▶</span>
      <span class="bc-current">${post.title}</span>
    `;
    document.getElementById('bc-post-root').addEventListener('click', () => navigate('#'));
    document.getElementById('bc-post-task').addEventListener('click', () => navigate('#task'));
    document.getElementById('bc-post-level').addEventListener('click', () => navigate(`#level/${level}`));
  } else if (post.category === 'ctf-competitions') {
    els.postBreadcrumb.innerHTML = `
      <span class="bc-root" id="bc-post-root">[ ROOT ]</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-ctf">CTF-COMPETITIONS</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-level">${formatLevel(level)}</span>
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
      <span class="bc-mid" id="bc-post-cat">TRAINING</span>
      <span class="bc-sep">▶</span>
      <span class="bc-mid" id="bc-post-level">${formatLevel(level)}</span>
      <span class="bc-sep">▶</span>
      <span class="bc-current" id="post-title-bc">${post.title}</span>
    `;
    document.getElementById('bc-post-root').addEventListener('click', () => navigate('#'));
    document.getElementById('bc-post-cat').addEventListener('click', () => navigate('#training'));
    document.getElementById('bc-post-level').addEventListener('click', () => navigate(`#level/${level}`));
  }

  els.postTitle.textContent = post.title;
  els.postLevel.textContent = formatLevel(post.level);
  els.markdown.innerHTML    = '<p style="font-family:var(--mono-font);font-size:18px;color:var(--muted)">▮ Loading...</p>';
  els.postSearchInput.value = '';
  els.postSearchResults.classList.add('hidden');
  els.postSearchResults.innerHTML = '';

  renderPagination(level, slug);
  showView('post');

  // ── Password gate (client side) ──
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
          history.back();
          return;
        }
      }
  
      const testRes = await fetch(`/api/post/${encodeURIComponent(post.slug)}`, {
        cache: 'no-store',
        headers: { 'x-post-password': password }
      });
  
      if (testRes.status === 401) {
        password = null;
        errorMsg = '❌ Mật khẩu không đúng. Vui lòng thử lại!';
        continue;
      }
  
      if (!testRes.ok) {
        els.markdown.innerHTML = '<p style="color:#b00">ERROR: Cannot read post data.</p>';
        return;
      }
  
      // Password đúng → cache và render
      state.unlockedSlugs.add(slug);
      sessionStorage.setItem(`pw_${slug}`, password);
      const postData = await testRes.json();
      renderMarkdown(postData);
      return; // Xong, thoát hàm luôn
    }
  }
  
  // Bài không cần password → chạy xuống đây
  const res = await fetch(`/api/post/${encodeURIComponent(post.slug)}`, { cache: 'no-store' });
  if (!res.ok) {
    els.markdown.innerHTML = '<p style="color:#b00">ERROR: Cannot read post data.</p>';
    return;
  }
  const postData = await res.json();
  renderMarkdown(postData);

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
      <span class="sri-level">${formatLevel(post.level)}</span>
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
    if (parts[1] === 'texsaw-2026') { renderTexsaw2026(); return; }
    if (parts[1] === 'dawgctf-2026') { renderDawgctf2026(); return; }
    if (parts[1] === 'umassctf-2026') { renderUmassctf2026(); return; }
    if (parts[1] === 'cit-2026') { renderCit2026(); return; }
    if (parts[1] === 'bluehensctf-2026') { renderBluehensctf2026(); return; }
    if (parts[1] === 'persistence-ubuntu') { renderPersistenceUbuntu(); return; }
    renderLevel(parts[1]); return;
  }
  if (parts[0] === 'post' && parts[1] && parts[2]) { await renderPost(parts[1], parts[2]); return; }
  showHome();
}

async function init() {
  try {
    state.posts = await loadPosts();

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

    document.querySelectorAll('#training-view .level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(`#level/${btn.dataset.level}`);
      });
    });

    document.querySelectorAll('#ctf-view .level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(`#level/${btn.dataset.level}`);
      });
    });
    document.querySelectorAll('#task-view .level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(`#level/${btn.dataset.level}`);
      });
    });

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
      if (state.currentCategory === 'ctf-competitions') {
        navigate(`#level/${state.currentLevel}`);
      } else if (state.currentLevel) {
        navigate(`#level/${state.currentLevel}`);
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

    // Close modal on backdrop click
    els.pwModal.addEventListener('click', e => {
      if (e.target === els.pwModal) {
        els.pwCancel.click();
      }
    });

    window.addEventListener('hashchange', router);
    await router();
  } catch (err) {
    console.error(err);
    state.posts = [];
    showView('home');
    if (els.searchResults) els.searchResults.classList.add('hidden');
  }
}

init();

/* ── Dark / Light mode ── */
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
});

const els = {
  homeView:          document.getElementById('home-view'),
  trainingView:      document.getElementById('training-view'),
  ctfView:           document.getElementById('ctf-view'),
  listView:          document.getElementById('list-view'),
  postView:          document.getElementById('post-view'),
  // List view
  listBreadcrumb:    document.getElementById('list-breadcrumb'),
  listTitle:         document.getElementById('list-title'),
  postGrid:          document.getElementById('post-grid'),
  // Post view
  postBreadcrumb:    document.getElementById('post-breadcrumb'),
  postTitle:         document.getElementById('post-title'),
  postLevel:         document.getElementById('post-level'),
  markdown:          document.getElementById('markdown'),
  openRaw:           document.getElementById('open-raw'),
  backHome:          document.getElementById('back-home'),
  backList:          document.getElementById('back-list'),
  // Search (home)
  searchInput:       document.getElementById('search-input'),
  searchBtn:         document.getElementById('search-btn'),
  searchResults:     document.getElementById('search-results'),
  // Search (post view)
  postSearchInput:   document.getElementById('post-search-input'),
  postSearchBtn:     document.getElementById('post-search-btn'),
  postSearchResults: document.getElementById('post-search-results'),
  // Pagination
  postPagination:    document.getElementById('post-pagination'),
  // Home counts
  trainingCount:     document.getElementById('training-count'),
  ctfCount:          document.getElementById('ctf-count'),
  easyCount:         document.getElementById('easy-count'),
  veryEasyCount:     document.getElementById('veryeasy-count'),
  texsaw2026Count:   document.getElementById('texsaw2026-count'),
};

const state = {
  posts: [],
  currentCategory: null,   // 'training' | 'ctf-competitions'
  currentLevel: null,       // 'easy' | 'very-easy' | 'texsaw-2026'
  currentPost: null
};

marked.setOptions({ gfm: true, breaks: false, langPrefix: 'language-' });

function formatLevel(level) {
  if (level === 'very-easy')   return 'VERY EASY';
  if (level === 'texsaw-2026') return 'TEXSAW 2026';
  return 'EASY';
}

function postIcon(post) {
  if (post.category === 'ctf-competitions') return '🏆';
  return post.level === 'very-easy' ? '📗' : '📘';
}

function slugFromPath(path) {
  const parts = path.split('/');
  return parts.length >= 2 ? parts[1] : path;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function navigate(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
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

function showView(which) {
  els.homeView.classList.toggle('hidden',     which !== 'home');
  els.trainingView.classList.toggle('hidden', which !== 'training');
  els.ctfView.classList.toggle('hidden',      which !== 'ctf');
  els.listView.classList.toggle('hidden',     which !== 'list');
  els.postView.classList.toggle('hidden',     which !== 'post');
}

/* ── Home view ── */
function showHome() {
  state.currentCategory = null;
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('home');

  const trainingPosts = state.posts.filter(p => p.category === 'training');
  const ctfPosts      = state.posts.filter(p => p.category === 'ctf-competitions');

  if (els.trainingCount) els.trainingCount.textContent = `[ ${trainingPosts.length} FILES ]`;
  if (els.ctfCount)      els.ctfCount.textContent      = `[ ${ctfPosts.length} FILES ]`;
}

/* ── Training sub-level selection view ── */
function showTrainingView() {
  state.currentCategory = 'training';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('training');

  const easy     = state.posts.filter(p => p.category === 'training' && p.level === 'easy').length;
  const veryEasy = state.posts.filter(p => p.category === 'training' && p.level === 'very-easy').length;

  if (els.easyCount)     els.easyCount.textContent     = `[ ${easy} FILES ]`;
  if (els.veryEasyCount) els.veryEasyCount.textContent = `[ ${veryEasy} FILES ]`;
}

/* ── CTF-Competitions sub-competition selection view ── */
function showCtfView() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = null;
  state.currentPost     = null;
  showView('ctf');

  const texsaw2026 = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'texsaw-2026').length;

  if (els.texsaw2026Count) els.texsaw2026Count.textContent = `[ ${texsaw2026} FILES ]`;
}

/* ── Level list view (training: easy / very-easy) ── */
function renderLevel(level) {
  state.currentCategory = 'training';
  state.currentLevel    = level;
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'training' && p.level === level);

  // Breadcrumb: ROOT ▶ TRAINING ▶ EASY/VERY EASY — N FILES
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
    <article class="post-card" data-slug="${post.slug}" data-level="${post.level}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  // Back button → training view
  els.backHome.textContent = '⬅ TRAINING';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

/* ── Texsaw 2026 list view ── */
function renderTexsaw2026() {
  state.currentCategory = 'ctf-competitions';
  state.currentLevel    = 'texsaw-2026';
  state.currentPost     = null;

  const items = state.posts.filter(p => p.category === 'ctf-competitions' && p.level === 'texsaw-2026');

  // Breadcrumb: ROOT ▶ CTF-COMPETITIONS ▶ TEXSAW 2026 — N FILES
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
    <article class="post-card post-card-texsaw" data-slug="${post.slug}" data-level="${post.level}" title="${post.title}">
      <div class="folder-icon">${postIcon(post)}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

  // Back button → ctf-competitions view
  els.backHome.textContent = '⬅ CTF';
  showView('list');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate(`#post/${card.dataset.level}/${card.dataset.slug}`);
    });
  });
}

/* ── Post-view search ── */
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

/* ── Pagination ── */
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

  // Build breadcrumb based on category
  if (post.category === 'ctf-competitions') {
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
  els.openRaw.href          = encodePath(post.path);
  els.markdown.innerHTML    = '<p style="font-family:var(--mono-font);font-size:18px;color:var(--muted)">▮ Loading...</p>';
  els.postSearchInput.value = '';
  els.postSearchResults.classList.add('hidden');
  els.postSearchResults.innerHTML = '';

  renderPagination(level, slug);
  showView('post');

  const res = await fetch(encodePath(post.path));
  if (!res.ok) {
    els.markdown.innerHTML = '<p style="color:#b00">ERROR: Cannot read markdown file.</p>';
    return;
  }

  const markdownText = await res.text();
  els.markdown.innerHTML = marked.parse(markdownText);

  if (window.hljs) {
    els.markdown.querySelectorAll('pre code').forEach(block => {
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

  const baseDir = post.path.slice(0, post.path.lastIndexOf('/') + 1);

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

/* ── Home search ── */
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

/* ── Router ── */
async function router() {
  const hash  = location.hash || '#';
  const parts = hash.slice(1).split('/').filter(Boolean);

  if (parts.length === 0)                          { showHome(); return; }
  if (parts[0] === 'training')                     { showTrainingView(); return; }
  if (parts[0] === 'ctf-competitions')             { showCtfView(); return; }
  if (parts[0] === 'level' && parts[1])            {
    // Route to the correct list renderer based on level
    if (parts[1] === 'texsaw-2026') { renderTexsaw2026(); return; }
    renderLevel(parts[1]); return;
  }
  if (parts[0] === 'post' && parts[1] && parts[2]) { await renderPost(parts[1], parts[2]); return; }
  showHome();
}

/* ── Init ── */
async function init() {
  try {
    state.posts = await loadPosts();

    // Sidebar toggle (list view)
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

    // Home: category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        if (cat === 'ctf-competitions') navigate('#ctf-competitions');
        else navigate('#training');
      });
    });

    // Training view: level buttons
    document.querySelectorAll('#training-view .level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(`#level/${btn.dataset.level}`);
      });
    });

    // CTF view: competition buttons
    document.querySelectorAll('#ctf-view .level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(`#level/${btn.dataset.level}`);
      });
    });

    // Training view: back to home
    document.getElementById('back-home-from-training').addEventListener('click', () => {
      navigate('#');
    });
    document.getElementById('back-home-bc-tr').addEventListener('click', () => {
      navigate('#');
    });

    // CTF view: back to home
    document.getElementById('back-home-from-ctf').addEventListener('click', () => {
      navigate('#');
    });
    document.getElementById('back-home-bc-ctf').addEventListener('click', () => {
      navigate('#');
    });

    // List view: back button (dynamic target)
    els.backHome.addEventListener('click', () => {
      if (state.currentCategory === 'ctf-competitions') navigate('#ctf-competitions');
      else navigate('#training');
    });

    // Post view: back to list
    els.backList.addEventListener('click', () => {
      if (state.currentCategory === 'ctf-competitions') {
        navigate(`#level/${state.currentLevel}`);
      } else if (state.currentLevel) {
        navigate(`#level/${state.currentLevel}`);
      } else {
        navigate('#training');
      }
    });

    // Home search
    els.searchBtn.addEventListener('click', doSearch);
    els.searchInput.addEventListener('input', doSearch);
    els.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        els.searchResults.classList.add('hidden');
        els.searchInput.value = '';
      }
    });

    // Post-view search
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

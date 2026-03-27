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
  homeView:    document.getElementById('home-view'),
  homeStatus:  document.getElementById('home-status'),
  listView:    document.getElementById('list-view'),
  postView:    document.getElementById('post-view'),
  listTitle:   document.getElementById('list-title'),
  postGrid:    document.getElementById('post-grid'),
  postTitle:   document.getElementById('post-title'),
  postTitleBc: document.getElementById('post-title-bc'),
  postLevel:   document.getElementById('post-level'),
  postLevelBc: document.getElementById('post-level-bc'),
  markdown:    document.getElementById('markdown'),
  openRaw:     document.getElementById('open-raw'),
  backHome:    document.getElementById('back-home'),
  backList:    document.getElementById('back-list'),
  searchInput: document.getElementById('search-input'),
  searchBtn:   document.getElementById('search-btn'),
  searchResults: document.getElementById('search-results'),
  // Post-view search
  postSearchInput:   document.getElementById('post-search-input'),
  postSearchBtn:     document.getElementById('post-search-btn'),
  postSearchResults: document.getElementById('post-search-results'),
  // Pagination
  postPagination: document.getElementById('post-pagination'),
};

document.getElementById('back-home-bc').addEventListener('click', () => { location.hash = '#'; });
document.getElementById('back-home-bc2').addEventListener('click', () => { location.hash = '#'; });

const state = {
  posts: [],
  currentLevel: null,
  currentPost: null
};

marked.setOptions({ gfm: true, breaks: false, langPrefix: 'language-' });

function setStatus(text) {
  if (els.homeStatus) els.homeStatus.textContent = text ? '> ' + text : '';
}

function formatLevel(level) {
  return level === 'very-easy' ? 'VERY EASY' : 'EASY';
}

function slugFromPath(path) {
  const parts = path.split('/');
  return parts.length >= 2 ? parts[1] : path;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function navigate(hash) {
  if (location.hash === hash) {
    router();
  } else {
    location.hash = hash;
  }
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
  els.homeView.classList.toggle('hidden', which !== 'home');
  els.listView.classList.toggle('hidden', which !== 'list');
  els.postView.classList.toggle('hidden', which !== 'post');
}

function showHome() {
  state.currentLevel = null;
  state.currentPost = null;
  showView('home');
  const easy = state.posts.filter(p => p.level === 'easy').length;
  const veryEasy = state.posts.filter(p => p.level === 'very-easy').length;
  const easyBtn = document.querySelector('.easy-btn .btn-sub');
  const veBtn   = document.querySelector('.veryeasy-btn .btn-sub');
  if (easyBtn)  easyBtn.textContent  = `[ ${easy} FILES ]`;
  if (veBtn)    veBtn.textContent    = `[ ${veryEasy} FILES ]`;
}

function renderLevel(level) {
  state.currentLevel = level;
  state.currentPost = null;
  const items = state.posts.filter(post => post.level === level);

  els.listTitle.textContent = `${formatLevel(level)} — ${items.length} FILES`;
  els.postGrid.innerHTML = items.map(post => `
    <article class="post-card" data-slug="${post.slug}" data-level="${post.level}" title="${post.title}">
      <div class="folder-icon">${post.level === 'very-easy' ? '📗' : '📘'}</div>
      <div class="folder-name">${post.title}</div>
      <div class="folder-slug">${post.slug}</div>
    </article>
  `).join('');

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
      <span class="sri-icon">${post.level === 'very-easy' ? '📗' : '📘'}</span>
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

  // Build page numbers (show all if ≤ 9, else show windowed)
  const total = levelPosts.length;
  let pageNums = [];
  if (total <= 9) {
    pageNums = levelPosts.map((_, i) => i);
  } else {
    // Always show first, last, current, and 1 on each side of current
    const set = new Set([0, total - 1, currentIdx,
      Math.max(0, currentIdx - 1), Math.min(total - 1, currentIdx + 1)]);
    pageNums = [...set].sort((a, b) => a - b);
  }

  // Insert ellipsis markers
  const pages = [];
  for (let i = 0; i < pageNums.length; i++) {
    if (i > 0 && pageNums[i] - pageNums[i - 1] > 1) {
      pages.push({ type: 'ellipsis' });
    }
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
  if (!post) { setStatus('Post not found.'); showHome(); return; }

  state.currentLevel = level;
  state.currentPost = post;

  els.postTitle.textContent      = post.title;
  els.postTitleBc.textContent    = post.title;
  els.postLevel.textContent      = formatLevel(post.level);
  els.postLevelBc.textContent    = formatLevel(post.level);
  els.openRaw.href               = encodePath(post.path);
  els.markdown.innerHTML         = '<p style="font-family:var(--mono-font);font-size:18px;color:var(--muted)">▮ Loading...</p>';
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

      if (!/\blanguage-/.test(block.className)) {
        block.classList.add('language-plaintext');
      }

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
      <span class="sri-icon">${post.level === 'very-easy' ? '📗' : '📘'}</span>
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
  const parts = hash.slice(1).split('/').filter(Boolean);

  if (parts.length === 0)                           { showHome(); return; }
  if (parts[0] === 'level' && parts[1])             { renderLevel(parts[1]); return; }
  if (parts[0] === 'post' && parts[1] && parts[2])  { await renderPost(parts[1], parts[2]); return; }
  showHome();
}

async function init() {
  try {
    state.posts = await loadPosts();

    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(`#level/${btn.dataset.level}`);
      });
    });

    els.backHome.addEventListener('click', () => { location.hash = '#'; });
    els.backList.addEventListener('click', () => {
      navigate(state.currentLevel ? `#level/${state.currentLevel}` : '#');
    });

    document.getElementById('post-level-bc').addEventListener('click', () => {
      if (state.currentLevel) navigate(`#level/${state.currentLevel}`);
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
    if (els.homeStatus) els.homeStatus.textContent = '';
    if (els.searchResults) els.searchResults.classList.add('hidden');
    alert('Không tải được posts.json. Hãy chạy site qua local server hoặc kiểm tra file deploy.');
  }
}

init();

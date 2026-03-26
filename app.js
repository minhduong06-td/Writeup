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

    els.searchBtn.addEventListener('click', doSearch);
    els.searchInput.addEventListener('input', doSearch);
    els.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        els.searchResults.classList.add('hidden');
        els.searchInput.value = '';
      }
    });

    document.addEventListener('click', e => {
      if (!els.searchResults.contains(e.target) && e.target !== els.searchInput && e.target !== els.searchBtn) {
        els.searchResults.classList.add('hidden');
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
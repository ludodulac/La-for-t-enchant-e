// ============================================================
// blog.js — Blog public (liste + article)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('article.html')) {
    loadArticle();
  } else {
    loadBlog();
  }
});

// ── LISTE DES ARTICLES ───────────────────────────────────────
let allArticles = [];
let activeFilter = null;

async function loadBlog() {
  const { data, error } = await dbClient
    .from('articles')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error || !data) {
    document.getElementById('blog-grid').innerHTML = '<p class="empty-msg">Impossible de charger le blog.</p>';
    return;
  }

  allArticles = data;
  renderFilters();
  renderGrid(allArticles);
}

function renderFilters() {
  const wrap = document.getElementById('blog-filters');
  if (!wrap) return;

  // Extraire catégories uniques
  const cats = [...new Set(allArticles.map(a => a.category).filter(Boolean))];
  if (cats.length === 0) return;

  wrap.innerHTML = '';

  const all = document.createElement('button');
  all.className = 'filter-btn active';
  all.textContent = 'Tous';
  all.addEventListener('click', () => {
    setFilter(null, all);
  });
  wrap.appendChild(all);

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = cat;
    btn.addEventListener('click', () => setFilter(cat, btn));
    wrap.appendChild(btn);
  });
}

function setFilter(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = cat;
  const filtered = cat ? allArticles.filter(a => a.category === cat) : allArticles;
  renderGrid(filtered);
}

function renderGrid(articles) {
  const grid = document.getElementById('blog-grid');
  grid.innerHTML = '';

  if (articles.length === 0) {
    grid.innerHTML = '<p class="empty-msg">Aucun article pour le moment… 🌱</p>';
    return;
  }

  articles.forEach((article, i) => {
    const card = document.createElement('div');
    card.className = 'blog-card';
    card.style.animationDelay = `${i * 0.05}s`;

    const imgHtml = article.cover_path
      ? `<div class="blog-card-cover" style="background-image:url('${getPublicUrl('blog-images', article.cover_path)}')"></div>`
      : `<div class="blog-card-cover blog-card-cover--empty">📖</div>`;

    const date = article.published_at
      ? new Date(article.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    card.innerHTML = `
      ${imgHtml}
      <div class="blog-card-body">
        ${article.category ? `<span class="blog-tag">${article.category}</span>` : ''}
        <h2 class="blog-card-title">${article.title}</h2>
        ${article.excerpt ? `<p class="blog-card-excerpt">${article.excerpt}</p>` : ''}
        <div class="blog-card-meta">
          ${date ? `<span>📅 ${date}</span>` : ''}
          <span class="blog-read-more">Lire →</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.href = `article.html?id=${article.id}`;
    });
    grid.appendChild(card);
  });
}

// ── ARTICLE INDIVIDUEL ───────────────────────────────────────
async function loadArticle() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'blog.html'; return; }

  const { data: article, error } = await dbClient
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single();

  if (error || !article) {
    document.getElementById('article-content').innerHTML = '<p class="empty-msg">Article introuvable. 😢</p>';
    return;
  }

  // Titre dans le breadcrumb
  const bcTitle = document.getElementById('article-bc-title');
  if (bcTitle) bcTitle.textContent = article.title;
  document.title = article.title + ' — La Forêt Enchantée';

  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const coverHtml = article.cover_path
    ? `<div class="article-cover" style="background-image:url('${getPublicUrl('blog-images', article.cover_path)}')"></div>`
    : '';

  document.getElementById('article-content').innerHTML = `
    ${coverHtml}
    <div class="article-header">
      ${article.category ? `<span class="blog-tag">${article.category}</span>` : ''}
      <h1 class="article-title">${article.title}</h1>
      ${date ? `<p class="article-date">📅 ${date}</p>` : ''}
    </div>
    <div class="article-body">${article.content}</div>
  `;
}

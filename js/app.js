// ============================================================
// app.js — Logique principale (accueil, catégories, recherche)
// ============================================================

// ── État global de navigation ────────────────────────────────
const state = {
  view: 'home',          // 'home' | 'category' | 'subcategory' | 'search'
  currentCategory: null,
  currentSubcategory: null,
  searchQuery: '',
  categories: [],
  subcategories: [],
  audios: [],
};

// ── Point d'entrée ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderHome();
  setupSearch();
});

// ── Chargement des données depuis Supabase ───────────────────
async function loadData() {
  const [cats, subs, auds] = await Promise.all([
    dbClient.from('categories').select('*').order('name'),
    dbClient.from('subcategories').select('*').order('name'),
    dbClient.from('audios').select('*').order('created_at', { ascending: false }),
  ]);
  state.categories    = cats.data  ?? [];
  state.subcategories = subs.data  ?? [];
  state.audios        = auds.data  ?? [];
}

// ── Rendu de l'accueil ───────────────────────────────────────
function renderHome() {
  state.view = 'home';
  state.currentCategory    = null;
  state.currentSubcategory = null;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="breadcrumb"><span class="bc-item active">🏠 Accueil</span></div>
    <div class="hero-text">
      <p class="hero-sub">Choisis une histoire et laisse-toi emporter…</p>
    </div>
    <div class="categories-grid" id="categories-grid"></div>
  `;

  const grid = document.getElementById('categories-grid');

  // Icônes et couleurs thématiques par catégorie
  const catMeta = {
    'Contes traditionnels':     { icon: '📖', color: 'var(--cat-1)' },
    'Contes esséniens':         { icon: '✨', color: 'var(--cat-2)' },
    'Histoires inspirantes':    { icon: '🌟', color: 'var(--cat-3)' },
    'Relaxation et méditation': { icon: '🌙', color: 'var(--cat-4)' },
    'Comptines':                { icon: '🎵', color: 'var(--cat-5)' },
  };

  state.categories.forEach(cat => {
    const meta = catMeta[cat.name] ?? { icon: '🌿', color: 'var(--cat-1)' };
    const count = state.audios.filter(a => a.category_id === cat.id).length;
    const card  = document.createElement('div');
    card.className = 'cat-card';
    card.style.setProperty('--cat-color', meta.color);
    card.innerHTML = `
      <div class="cat-icon">${meta.icon}</div>
      <div class="cat-name">${cat.name}</div>
      <div class="cat-count">${count} histoire${count !== 1 ? 's' : ''}</div>
    `;
    card.addEventListener('click', () => openCategory(cat));
    grid.appendChild(card);
  });

  // Si aucune catégorie encore, message d'invitation
  if (state.categories.length === 0) {
    grid.innerHTML = '<p class="empty-msg">Les histoires arrivent bientôt… 🌱</p>';
  }
}

// ── Ouverture d'une catégorie ────────────────────────────────
function openCategory(cat) {
  state.view            = 'category';
  state.currentCategory = cat;

  const subs   = state.subcategories.filter(s => s.category_id === cat.id);
  const direct = state.audios.filter(a => a.category_id === cat.id && !a.subcategory_id);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="bc-item bc-link" onclick="renderHome()">🏠 Accueil</span>
      <span class="bc-sep">›</span>
      <span class="bc-item active">${cat.name}</span>
    </div>
    <h2 class="section-title">${cat.name}</h2>
    <div id="sub-list"></div>
    <div id="audio-list"></div>
  `;

  const subList = document.getElementById('sub-list');

  // Sous-catégories
  if (subs.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'subsection-title';
    heading.textContent = 'Sous-catégories';
    subList.appendChild(heading);

    const subGrid = document.createElement('div');
    subGrid.className = 'sub-grid';
    subs.forEach(sub => {
      const count = state.audios.filter(a => a.subcategory_id === sub.id).length;
      const card  = document.createElement('div');
      card.className = 'sub-card';
      card.innerHTML = `
        <div class="sub-name">${sub.name}</div>
        <div class="sub-count">${count} histoire${count !== 1 ? 's' : ''}</div>
      `;
      card.addEventListener('click', () => openSubcategory(sub));
      subGrid.appendChild(card);
    });
    subList.appendChild(subGrid);
  }

  // Audios directement dans la catégorie (sans sous-catégorie)
  if (direct.length > 0) {
    const audioList = document.getElementById('audio-list');
    const heading   = document.createElement('h3');
    heading.className = 'subsection-title';
    heading.textContent = subs.length > 0 ? 'Histoires sans sous-catégorie' : 'Histoires';
    audioList.appendChild(heading);
    renderAudioGrid(direct, audioList);
  }

  if (subs.length === 0 && direct.length === 0) {
    document.getElementById('audio-list').innerHTML = '<p class="empty-msg">Pas encore d\'histoires ici… 🌱</p>';
  }
}

// ── Ouverture d'une sous-catégorie ──────────────────────────
function openSubcategory(sub) {
  state.view               = 'subcategory';
  state.currentSubcategory = sub;

  const cat    = state.categories.find(c => c.id === sub.category_id);
  const audios = state.audios.filter(a => a.subcategory_id === sub.id);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="bc-item bc-link" onclick="renderHome()">🏠 Accueil</span>
      <span class="bc-sep">›</span>
      <span class="bc-item bc-link" onclick="openCategory(state.currentCategory)">${cat?.name ?? ''}</span>
      <span class="bc-sep">›</span>
      <span class="bc-item active">${sub.name}</span>
    </div>
    <h2 class="section-title">${sub.name}</h2>
    <div id="audio-list"></div>
  `;

  const list = document.getElementById('audio-list');
  if (audios.length === 0) {
    list.innerHTML = '<p class="empty-msg">Pas encore d\'histoires ici… 🌱</p>';
  } else {
    renderAudioGrid(audios, list);
  }
}

// ── Affichage d'une grille d'audios ─────────────────────────
function renderAudioGrid(audios, container) {
  const grid = document.createElement('div');
  grid.className = 'audio-grid';

  audios.forEach(audio => {
    const imgUrl = audio.image_path
      ? getPublicUrl('images', audio.image_path)
      : 'assets/default-cover.svg';

    const card = document.createElement('div');
    card.className = 'audio-card';
    card.innerHTML = `
      <div class="audio-cover" style="background-image:url('${imgUrl}')"></div>
      <div class="audio-info">
        <div class="audio-title">${audio.title}</div>
        ${audio.duration ? `<div class="audio-duration">🎧 ${formatDuration(audio.duration)}</div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openAudio(audio.id));
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ── Recherche ────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = input.value.trim();
      if (q.length === 0) {
        renderHome();
      } else {
        renderSearch(q);
      }
    }, 250);
  });
}

function renderSearch(query) {
  state.view        = 'search';
  state.searchQuery = query;

  const q      = query.toLowerCase();
  const found  = state.audios.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.description ?? '').toLowerCase().includes(q)
  );

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="breadcrumb">
      <span class="bc-item bc-link" onclick="renderHome()">🏠 Accueil</span>
      <span class="bc-sep">›</span>
      <span class="bc-item active">Recherche : "${query}"</span>
    </div>
    <h2 class="section-title">${found.length} résultat${found.length !== 1 ? 's' : ''}</h2>
    <div id="audio-list"></div>
  `;

  const list = document.getElementById('audio-list');
  if (found.length === 0) {
    list.innerHTML = '<p class="empty-msg">Aucune histoire trouvée pour « ' + query + ' » 🔍</p>';
  } else {
    renderAudioGrid(found, list);
  }
}

// ── Navigation vers la fiche audio ──────────────────────────
function openAudio(id) {
  // Sauvegarde du contexte de navigation pour le bouton "retour"
  const ctx = {
    view:     state.view,
    catId:    state.currentCategory?.id,
    subId:    state.currentSubcategory?.id,
    query:    state.searchQuery,
  };
  sessionStorage.setItem('navContext', JSON.stringify(ctx));
  window.location.href = `audio.html?id=${id}`;
}

// ── Utilitaires ──────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

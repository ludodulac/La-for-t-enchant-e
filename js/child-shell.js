// Phase 1 — coque enfant locale, sans compte en ligne
(() => {
  const PROFILE_KEY = 'forestActiveChildProfile';
  const DEFAULT_PROFILE = { id: 'child-local-1', name: 'Enfant', avatar: '🌿' };
  let currentChildView = 'library';

  const gate = document.getElementById('profile-gate');
  const chooseChild = document.getElementById('choose-child-profile');
  const switchProfile = document.getElementById('switch-profile');
  const greetingName = document.getElementById('child-greeting-name');
  const greetingAvatar = document.getElementById('child-avatar');
  const bottomNav = [...document.querySelectorAll('.child-nav-button')];

  function readProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch { return null; }
  }

  function saveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }

  function activeProfile() { return readProfile() || DEFAULT_PROFILE; }

  function applyProfile(profile) {
    const active = profile || DEFAULT_PROFILE;
    if (greetingName) greetingName.textContent = `Bonjour ${active.name}`;
    if (greetingAvatar) greetingAvatar.textContent = active.avatar || '🌿';
    if (gate) gate.hidden = true;
    scheduleChildHome();
  }

  function openGate() { if (gate) gate.hidden = false; }

  function clearSearchState() {
    state.categoryId = null;
    state.query = '';
    const search = document.getElementById('search-input');
    const clear = document.getElementById('clear-search');
    if (search) search.value = '';
    if (clear) clear.hidden = true;
  }

  function selectView(view) {
    if (typeof state === 'undefined' || typeof render !== 'function') return;
    currentChildView = view;
    clearSearchState();

    if (view === 'search') {
      state.view = 'all';
      render();
      scheduleChildSearch();
      requestAnimationFrame(() => document.getElementById('search-input')?.focus());
    } else {
      state.view = view;
      render();
      if (view === 'library') scheduleChildHome();
      if (view === 'categories') scheduleChildCategories();
    }
    syncBottomNav(view);
  }

  function syncBottomNav(view) {
    bottomNav.forEach(button => {
      const isActive = button.dataset.childView === view;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function afterPaint(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }
  function scheduleChildHome() { afterPaint(renderChildHome); }
  function scheduleChildCategories() { afterPaint(renderChildCategories); }
  function scheduleChildSearch() { afterPaint(renderChildSearch); }

  function childCard(audio) {
    const cover = imageUrl(audio);
    const category = categoryFor(audio)?.name || 'Histoire';
    return `<article class="child-story-card" data-child-id="${escapeHtml(audio.id)}" tabindex="0" aria-label="${escapeHtml(audio.title)}">
      <div class="child-story-cover">
        ${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy">` : '<div class="child-story-placeholder" aria-hidden="true">🌿</div>'}
        <button class="child-story-play" type="button" data-child-play="${escapeHtml(audio.id)}" aria-label="Écouter ${escapeHtml(audio.title)}">▶</button>
      </div>
      <div class="child-story-category">${escapeHtml(category)}</div>
      <div class="child-story-title">${escapeHtml(audio.title)}</div>
    </article>`;
  }

  function rail(title, audios, actionView = '') {
    if (!audios.length) return '';
    const action = actionView ? `<button class="child-rail-action" type="button" data-go-view="${actionView}">Tout voir</button>` : '';
    return `<section class="child-rail-section">
      <div class="child-rail-head"><h2>${escapeHtml(title)}</h2>${action}</div>
      <div class="child-rail">${audios.map(childCard).join('')}</div>
    </section>`;
  }

  function renderChildHome() {
    if (typeof state === 'undefined' || state.view !== 'library' || state.query || !state.audios?.length) return;
    const main = document.getElementById('main-content');
    if (!main || main.dataset.childHome === 'ready') return;

    const profile = activeProfile();
    const featured = state.audios[0];
    const featuredCover = imageUrl(featured);
    const featuredCategory = categoryFor(featured)?.name || 'Une histoire de la forêt';
    const latest = state.audios.slice(0, 10);
    const recent = typeof recentIds === 'function'
      ? recentIds().map(id => state.audios.find(item => sameId(item.id, id))).filter(Boolean).slice(0, 10)
      : [];
    const categoryRails = state.categories.slice(0, 4).map(category => ({
      title: category.name,
      audios: state.audios.filter(audio => sameId(audio.category_id, category.id)).slice(0, 10)
    })).filter(group => group.audios.length);

    setPageCopy('La Forêt Enchantée', `Que veux-tu écouter, ${profile.name} ?`, 'Choisis une histoire et laisse la forêt raconter.');
    hideToolbar();
    main.dataset.childHome = 'ready';
    main.innerHTML = `<div class="child-home">
      <section class="child-featured" data-child-id="${escapeHtml(featured.id)}" tabindex="0">
        <div class="child-featured-copy">
          <span class="child-featured-kicker">À découvrir</span>
          <h2>${escapeHtml(featured.title)}</h2>
          <p>${escapeHtml(featured.description || featuredCategory)}</p>
          <button class="child-featured-play" type="button" data-child-play="${escapeHtml(featured.id)}"><span>▶</span> Écouter</button>
        </div>
        <div class="child-featured-art">${featuredCover ? `<img src="${escapeHtml(featuredCover)}" alt="">` : '<div class="child-featured-placeholder" aria-hidden="true">✦</div>'}</div>
      </section>
      ${rail('Nouveautés', latest, 'all')}
      ${recent.length ? rail('À reprendre', recent, 'recent') : ''}
      ${categoryRails.map(group => rail(group.title, group.audios, 'categories')).join('')}
    </div>`;
    bindChildContent(main);
  }

  function categoryVisual(name = '') {
    const value = name.toLocaleLowerCase('fr');
    if (/douce|calme|dormir|nuit/.test(value)) return ['☾', 'Douces histoires'];
    if (/rire|drôle|humour/.test(value)) return ['☀', 'Pour rire'];
    if (/aventure|explor/.test(value)) return ['➜', 'Aventures'];
    if (/musique|chanson/.test(value)) return ['♫', 'Musique'];
    if (/curieu|découv|science/.test(value)) return ['✦', 'Pour les curieux'];
    return ['✿', name];
  }

  function renderChildCategories() {
    if (typeof state === 'undefined' || state.view !== 'categories' || state.query) return;
    const main = document.getElementById('main-content');
    if (!main) return;
    setPageCopy('Explorer', 'Choisis ton univers', 'De grandes portes pour trouver rapidement une histoire.');
    hideToolbar();

    const categories = state.categories.map((category, index) => {
      const count = state.audios.filter(audio => sameId(audio.category_id, category.id)).length;
      const [icon, friendly] = categoryVisual(category.name);
      return `<button class="child-category-tile tone-${(index % 6) + 1}" type="button" data-child-category="${escapeHtml(category.id)}">
        <span class="child-category-icon" aria-hidden="true">${icon}</span>
        <span class="child-category-copy"><strong>${escapeHtml(friendly || category.name)}</strong><small>${count} histoire${count > 1 ? 's' : ''}</small></span>
      </button>`;
    }).join('');

    main.innerHTML = `<div class="child-category-grid">${categories}
      <button class="child-category-tile child-category-all tone-all" type="button" data-go-view="all">
        <span class="child-category-icon" aria-hidden="true">≡</span>
        <span class="child-category-copy"><strong>Toutes les histoires</strong><small>${state.audios.length} au total</small></span>
      </button>
    </div>`;

    main.querySelectorAll('[data-child-category]').forEach(button => button.addEventListener('click', () => {
      currentChildView = 'all';
      state.view = 'all';
      state.categoryId = button.dataset.childCategory;
      render();
      syncBottomNav('categories');
    }));
    bindChildContent(main);
  }

  function renderChildSearch() {
    if (currentChildView !== 'search' || typeof state === 'undefined' || state.query) return;
    const main = document.getElementById('main-content');
    if (!main || !state.audios?.length) return;
    setPageCopy('Rechercher', 'Que cherches-tu ?', 'Écris un titre ou parcours les univers ci-dessous.');
    hideToolbar();

    const newest = state.audios.slice(0, 10);
    const categoryRails = state.categories.slice(0, 5).map(category => ({
      title: categoryVisual(category.name)[1] || category.name,
      audios: state.audios.filter(audio => sameId(audio.category_id, category.id)).slice(0, 10)
    })).filter(group => group.audios.length);

    main.innerHTML = `<div class="child-search-discovery">
      ${rail('Nouveautés', newest)}
      ${categoryRails.map(group => rail(group.title, group.audios)).join('')}
    </div>`;
    bindChildContent(main);
  }

  function setPageCopy(eyebrow, title, subtitle) {
    const eyebrowEl = document.getElementById('page-eyebrow');
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  function hideToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (toolbar) toolbar.style.display = 'none';
  }

  function bindChildContent(container) {
    container.querySelectorAll('[data-child-play]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      playById(button.dataset.childPlay);
    }));
    container.querySelectorAll('[data-child-id]').forEach(card => {
      const open = () => { location.href = `audio.html?id=${encodeURIComponent(card.dataset.childId)}`; };
      card.addEventListener('click', event => { if (!event.target.closest('[data-child-play]')) open(); });
      card.addEventListener('keydown', event => { if (event.key === 'Enter') open(); });
    });
    container.querySelectorAll('[data-go-view]').forEach(button => button.addEventListener('click', () => selectView(button.dataset.goView || 'all')));
  }

  chooseChild?.addEventListener('click', () => {
    saveProfile(DEFAULT_PROFILE);
    applyProfile(DEFAULT_PROFILE);
  });
  switchProfile?.addEventListener('click', openGate);

  bottomNav.forEach(button => button.addEventListener('click', () => selectView(button.dataset.childView || 'library')));

  document.querySelector('.nav-button[data-view="library"]')?.addEventListener('click', () => {
    currentChildView = 'library';
    scheduleChildHome();
  });
  document.querySelector('.nav-button[data-view="categories"]')?.addEventListener('click', () => {
    currentChildView = 'categories';
    scheduleChildCategories();
  });

  document.getElementById('search-input')?.addEventListener('input', () => {
    if (currentChildView !== 'search') return;
    if (!state.query) scheduleChildSearch();
  });
  document.getElementById('clear-search')?.addEventListener('click', () => {
    if (currentChildView === 'search') scheduleChildSearch();
  });

  const active = readProfile();
  if (active) applyProfile(active); else openGate();
  syncBottomNav('library');

  let attempts = 0;
  const waitForLibrary = setInterval(() => {
    attempts += 1;
    if (typeof state !== 'undefined' && state.audios?.length) {
      clearInterval(waitForLibrary);
      renderChildHome();
    } else if (attempts > 80) clearInterval(waitForLibrary);
  }, 100);
})();

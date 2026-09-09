// Phase 1 — coque enfant locale, sans compte en ligne
(() => {
  const PROFILE_KEY = 'forestActiveChildProfile';
  const DEFAULT_PROFILE = { id: 'child-local-1', name: 'Enfant', avatar: '🌿' };

  const gate = document.getElementById('profile-gate');
  const chooseChild = document.getElementById('choose-child-profile');
  const switchProfile = document.getElementById('switch-profile');
  const greetingName = document.getElementById('child-greeting-name');
  const greetingAvatar = document.getElementById('child-avatar');
  const bottomNav = [...document.querySelectorAll('.child-nav-button')];

  function readProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
    } catch {
      return null;
    }
  }

  function saveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }

  function activeProfile() {
    return readProfile() || DEFAULT_PROFILE;
  }

  function applyProfile(profile) {
    const active = profile || DEFAULT_PROFILE;
    if (greetingName) greetingName.textContent = `Bonjour ${active.name}`;
    if (greetingAvatar) greetingAvatar.textContent = active.avatar || '🌿';
    if (gate) gate.hidden = true;
    scheduleChildHome();
  }

  function openGate() {
    if (gate) gate.hidden = false;
  }

  function selectView(view) {
    if (typeof state === 'undefined' || typeof render !== 'function') return;
    state.categoryId = null;
    state.query = '';
    const search = document.getElementById('search-input');
    const clear = document.getElementById('clear-search');
    if (search) search.value = '';
    if (clear) clear.hidden = true;

    if (view === 'search') {
      state.view = 'all';
      render();
      requestAnimationFrame(() => {
        search?.focus();
        search?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else {
      state.view = view;
      render();
      if (view === 'library') scheduleChildHome();
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

  function scheduleChildHome() {
    requestAnimationFrame(() => requestAnimationFrame(renderChildHome));
  }

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

    const eyebrow = document.getElementById('page-eyebrow');
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    const toolbar = document.getElementById('toolbar');
    if (eyebrow) eyebrow.textContent = 'La Forêt Enchantée';
    if (title) title.textContent = `Que veux-tu écouter, ${profile.name} ?`;
    if (subtitle) subtitle.textContent = 'Choisis une histoire et laisse la forêt raconter.';
    if (toolbar) toolbar.style.display = 'none';

    main.dataset.childHome = 'ready';
    main.innerHTML = `<div class="child-home">
      <section class="child-featured" data-child-id="${escapeHtml(featured.id)}" tabindex="0">
        <div class="child-featured-copy">
          <span class="child-featured-kicker">À découvrir</span>
          <h2>${escapeHtml(featured.title)}</h2>
          <p>${escapeHtml(featured.description || featuredCategory)}</p>
          <button class="child-featured-play" type="button" data-child-play="${escapeHtml(featured.id)}"><span>▶</span> Écouter</button>
        </div>
        <div class="child-featured-art">
          ${featuredCover ? `<img src="${escapeHtml(featuredCover)}" alt="">` : '<div class="child-featured-placeholder" aria-hidden="true">✦</div>'}
        </div>
      </section>
      ${rail('Nouveautés', latest, 'all')}
      ${recent.length ? rail('À reprendre', recent, 'recent') : ''}
      ${categoryRails.map(group => rail(group.title, group.audios, 'categories')).join('')}
    </div>`;

    bindChildHome(main);
  }

  function bindChildHome(container) {
    container.querySelectorAll('[data-child-play]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      playById(button.dataset.childPlay);
    }));
    container.querySelectorAll('[data-child-id]').forEach(card => {
      const open = () => { location.href = `audio.html?id=${encodeURIComponent(card.dataset.childId)}`; };
      card.addEventListener('click', event => { if (!event.target.closest('[data-child-play]')) open(); });
      card.addEventListener('keydown', event => { if (event.key === 'Enter') open(); });
    });
    container.querySelectorAll('[data-go-view]').forEach(button => button.addEventListener('click', () => {
      selectView(button.dataset.goView || 'all');
    }));
  }

  chooseChild?.addEventListener('click', () => {
    saveProfile(DEFAULT_PROFILE);
    applyProfile(DEFAULT_PROFILE);
  });
  switchProfile?.addEventListener('click', openGate);

  bottomNav.forEach(button => button.addEventListener('click', () => {
    selectView(button.dataset.childView || 'library');
  }));

  document.querySelector('.nav-button[data-view="library"]')?.addEventListener('click', scheduleChildHome);

  const active = readProfile();
  if (active) applyProfile(active);
  else openGate();

  syncBottomNav('library');

  let attempts = 0;
  const waitForLibrary = setInterval(() => {
    attempts += 1;
    if (typeof state !== 'undefined' && state.audios?.length) {
      clearInterval(waitForLibrary);
      renderChildHome();
    } else if (attempts > 80) {
      clearInterval(waitForLibrary);
    }
  }, 100);
})();

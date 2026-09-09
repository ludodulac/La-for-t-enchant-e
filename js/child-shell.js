// Phase 1 — expérience enfant locale, profils et espace parent sans compte en ligne
(() => {
  const PROFILE_KEY = 'forestActiveChildProfile';
  const PROFILES_KEY = 'forestChildProfiles';
  const GUIDED_KEY = 'forestGuidedMode';
  const DEFAULT_PROFILES = [
    { id: 'child-local-1', name: 'Enfant', avatar: '🌿', language: 'fr', antiZap: 0, timer: 0, progressBar: true, nightMode: false, likes: false },
    { id: 'child-local-2', name: 'Petit hibou', avatar: '🦉', language: 'fr', antiZap: 0, timer: 0, progressBar: true, nightMode: false, likes: false }
  ];

  const gate = document.getElementById('profile-gate');
  const profileGrid = document.getElementById('profile-choice-grid');
  const switchProfile = document.getElementById('switch-profile');
  const greetingName = document.getElementById('child-greeting-name');
  const greetingAvatar = document.getElementById('child-avatar');
  const bottomNav = [...document.querySelectorAll('.child-nav-button')];
  const parentLock = document.getElementById('parent-lock');
  const parentSpace = document.getElementById('parent-space');
  const parentAnswer = document.getElementById('parent-answer');
  const parentQuestion = document.getElementById('parent-question');
  const parentError = document.getElementById('parent-error');
  const parentProfileList = document.getElementById('parent-profile-list');
  const guidedMode = document.getElementById('guided-mode');
  let parentExpected = null;
  let editedProfileId = null;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function writeJsonLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function profiles() {
    const saved = readJson(PROFILES_KEY, null);
    if (Array.isArray(saved) && saved.length) return saved;
    writeJsonLocal(PROFILES_KEY, DEFAULT_PROFILES);
    return [...DEFAULT_PROFILES];
  }
  function saveProfiles(list) { writeJsonLocal(PROFILES_KEY, list); }
  function readProfile() { return readJson(PROFILE_KEY, null); }
  function saveActiveProfile(profile) { writeJsonLocal(PROFILE_KEY, profile); }
  function activeProfile() {
    const current = readProfile();
    const list = profiles();
    return list.find(item => current && String(item.id) === String(current.id)) || list[0] || DEFAULT_PROFILES[0];
  }

  function applyProfile(profile) {
    const active = profile || activeProfile();
    saveActiveProfile(active);
    if (greetingName) greetingName.textContent = `Bonjour ${active.name}`;
    if (greetingAvatar) greetingAvatar.textContent = active.avatar || '🌿';
    document.body.dataset.childProfile = active.id;
    if (gate) gate.hidden = true;
    applyProfilePreferences(active);
    scheduleChildHome();
  }

  function applyProfilePreferences(profile) {
    document.body.classList.toggle('child-no-progress', profile.progressBar === false);
    document.body.classList.toggle('child-night-mode', !!profile.nightMode);
    document.documentElement.lang = profile.language === 'en' ? 'en' : 'fr';
  }

  function renderProfileGate() {
    if (!profileGrid) return;
    profileGrid.innerHTML = profiles().map(profile => `<button class="profile-choice child" type="button" data-profile-id="${escapeHtml(profile.id)}"><span class="profile-choice-icon" aria-hidden="true">${escapeHtml(profile.avatar || '🌿')}</span><strong>${escapeHtml(profile.name)}</strong><span>Entrer dans les histoires</span></button>`).join('');
    profileGrid.querySelectorAll('[data-profile-id]').forEach(button => button.addEventListener('click', () => {
      const profile = profiles().find(item => String(item.id) === button.dataset.profileId);
      if (profile) applyProfile(profile);
    }));
  }

  function openGate() {
    renderProfileGate();
    if (guidedMode) guidedMode.checked = localStorage.getItem(GUIDED_KEY) === 'true';
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

  function scheduleChildHome() { requestAnimationFrame(() => requestAnimationFrame(renderChildHome)); }

  function childCard(audio) {
    const cover = imageUrl(audio);
    const category = categoryFor(audio)?.name || 'Histoire';
    return `<article class="child-story-card" data-child-id="${escapeHtml(audio.id)}" tabindex="0" aria-label="${escapeHtml(audio.title)}"><div class="child-story-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy">` : '<div class="child-story-placeholder" aria-hidden="true">🌿</div>'}<button class="child-story-play" type="button" data-child-play="${escapeHtml(audio.id)}" aria-label="Écouter ${escapeHtml(audio.title)}">▶</button></div><div class="child-story-category">${escapeHtml(category)}</div><div class="child-story-title">${escapeHtml(audio.title)}</div></article>`;
  }

  function rail(title, audios, actionView = '') {
    if (!audios.length) return '';
    const action = actionView ? `<button class="child-rail-action" type="button" data-go-view="${actionView}">Tout voir</button>` : '';
    return `<section class="child-rail-section"><div class="child-rail-head"><h2>${escapeHtml(title)}</h2>${action}</div><div class="child-rail">${audios.map(childCard).join('')}</div></section>`;
  }

  function renderChildHome() {
    if (typeof state === 'undefined' || state.view !== 'library' || state.query || !state.audios?.length) return;
    const main = document.getElementById('main-content');
    if (!main) return;
    const profile = activeProfile();
    const featured = state.audios[0];
    const featuredCover = imageUrl(featured);
    const featuredCategory = categoryFor(featured)?.name || 'Une histoire de la forêt';
    const latest = state.audios.slice(0, 10);
    const recent = typeof recentIds === 'function' ? recentIds().map(id => state.audios.find(item => sameId(item.id, id))).filter(Boolean).slice(0, 10) : [];
    const categoryRails = state.categories.slice(0, 4).map(category => ({ title: category.name, audios: state.audios.filter(audio => sameId(audio.category_id, category.id)).slice(0, 10) })).filter(group => group.audios.length);

    const eyebrow = document.getElementById('page-eyebrow');
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    const toolbar = document.getElementById('toolbar');
    if (eyebrow) eyebrow.textContent = 'La Forêt Enchantée';
    if (title) title.textContent = `Que veux-tu écouter, ${profile.name} ?`;
    if (subtitle) subtitle.textContent = 'Choisis une histoire et laisse la forêt raconter.';
    if (toolbar) toolbar.style.display = 'none';

    main.dataset.childHome = 'ready';
    main.innerHTML = `<div class="child-home"><section class="child-featured" data-child-id="${escapeHtml(featured.id)}" tabindex="0"><div class="child-featured-copy"><span class="child-featured-kicker">À découvrir</span><h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(featured.description || featuredCategory)}</p><button class="child-featured-play" type="button" data-child-play="${escapeHtml(featured.id)}"><span>▶</span> Écouter</button></div><div class="child-featured-art">${featuredCover ? `<img src="${escapeHtml(featuredCover)}" alt="">` : '<div class="child-featured-placeholder" aria-hidden="true">✦</div>'}</div></section>${rail('Nouveautés', latest, 'all')}${recent.length ? rail('À reprendre', recent, 'recent') : ''}${categoryRails.map(group => rail(group.title, group.audios, 'categories')).join('')}</div>`;
    bindChildHome(main);
  }

  function bindChildHome(container) {
    container.querySelectorAll('[data-child-play]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); playById(button.dataset.childPlay); }));
    container.querySelectorAll('[data-child-id]').forEach(card => {
      const open = () => { location.href = `audio.html?id=${encodeURIComponent(card.dataset.childId)}`; };
      card.addEventListener('click', event => { if (!event.target.closest('[data-child-play]')) open(); });
      card.addEventListener('keydown', event => { if (event.key === 'Enter') open(); });
    });
    container.querySelectorAll('[data-go-view]').forEach(button => button.addEventListener('click', () => selectView(button.dataset.goView || 'all')));
  }

  function newParentChallenge() {
    const a = 2 + Math.floor(Math.random() * 7);
    const b = 1 + Math.floor(Math.random() * 6);
    parentExpected = a + b;
    if (parentQuestion) parentQuestion.textContent = `${a} + ${b} = ?`;
    if (parentAnswer) { parentAnswer.value = ''; setTimeout(() => parentAnswer.focus(), 50); }
    if (parentError) parentError.textContent = '';
  }

  function openParentLock() {
    if (gate) gate.hidden = true;
    newParentChallenge();
    if (parentLock) parentLock.hidden = false;
  }
  function closeParentLock() {
    if (parentLock) parentLock.hidden = true;
    openGate();
  }
  function openParentSpace() {
    if (parentLock) parentLock.hidden = true;
    if (parentSpace) parentSpace.hidden = false;
    renderParentProfiles();
    const first = profiles()[0];
    if (first) selectParentProfile(first.id);
  }
  function closeParentSpace() {
    if (parentSpace) parentSpace.hidden = true;
    applyProfile(activeProfile());
  }

  function renderParentProfiles() {
    if (!parentProfileList) return;
    parentProfileList.innerHTML = profiles().map(profile => `<button type="button" class="parent-profile-chip ${String(profile.id) === String(editedProfileId) ? 'active' : ''}" data-edit-profile="${escapeHtml(profile.id)}"><span>${escapeHtml(profile.avatar || '🌿')}</span><strong>${escapeHtml(profile.name)}</strong></button>`).join('');
    parentProfileList.querySelectorAll('[data-edit-profile]').forEach(button => button.addEventListener('click', () => selectParentProfile(button.dataset.editProfile)));
  }

  function selectParentProfile(id) {
    const profile = profiles().find(item => String(item.id) === String(id));
    if (!profile) return;
    editedProfileId = profile.id;
    document.getElementById('settings-profile-name').textContent = profile.name;
    document.getElementById('setting-name').value = profile.name || '';
    document.getElementById('setting-avatar').value = profile.avatar || '🌿';
    document.getElementById('setting-language').value = profile.language || 'fr';
    document.getElementById('setting-antizap').value = String(profile.antiZap || 0);
    document.getElementById('setting-timer').value = String(profile.timer || 0);
    document.getElementById('setting-progress').checked = profile.progressBar !== false;
    document.getElementById('setting-night').checked = !!profile.nightMode;
    document.getElementById('setting-likes').checked = !!profile.likes;
    renderParentProfiles();
  }

  function saveEditedProfile() {
    const list = profiles();
    const index = list.findIndex(item => String(item.id) === String(editedProfileId));
    if (index < 0) return;
    const current = list[index];
    const next = {
      ...current,
      name: document.getElementById('setting-name').value.trim() || current.name,
      avatar: document.getElementById('setting-avatar').value || '🌿',
      language: document.getElementById('setting-language').value || 'fr',
      antiZap: Number(document.getElementById('setting-antizap').value || 0),
      timer: Number(document.getElementById('setting-timer').value || 0),
      progressBar: document.getElementById('setting-progress').checked,
      nightMode: document.getElementById('setting-night').checked,
      likes: document.getElementById('setting-likes').checked
    };
    list[index] = next;
    saveProfiles(list);
    if (String(activeProfile().id) === String(next.id)) saveActiveProfile(next);
    selectParentProfile(next.id);
  }

  function addChildProfile() {
    const list = profiles();
    const nextNumber = list.length + 1;
    const profile = { id: `child-local-${Date.now()}`, name: `Enfant ${nextNumber}`, avatar: ['🌿','🦊','🐻','🦉','🐰'][list.length % 5], language: 'fr', antiZap: 0, timer: 0, progressBar: true, nightMode: false, likes: false };
    list.push(profile);
    saveProfiles(list);
    selectParentProfile(profile.id);
  }

  function deleteEditedProfile() {
    const list = profiles();
    if (list.length <= 1) return;
    const next = list.filter(item => String(item.id) !== String(editedProfileId));
    saveProfiles(next);
    const active = activeProfile();
    if (!next.some(item => String(item.id) === String(active.id))) saveActiveProfile(next[0]);
    selectParentProfile(next[0].id);
  }

  switchProfile?.addEventListener('click', openGate);
  document.getElementById('choose-parent-space')?.addEventListener('click', openParentLock);
  document.getElementById('open-parent-space')?.addEventListener('click', openParentLock);
  document.getElementById('close-parent-lock')?.addEventListener('click', closeParentLock);
  document.getElementById('close-parent-space')?.addEventListener('click', closeParentSpace);
  document.getElementById('add-child-profile')?.addEventListener('click', addChildProfile);
  document.getElementById('save-profile-settings')?.addEventListener('click', saveEditedProfile);
  document.getElementById('delete-child-profile')?.addEventListener('click', deleteEditedProfile);
  guidedMode?.addEventListener('change', () => localStorage.setItem(GUIDED_KEY, String(guidedMode.checked)));

  document.getElementById('parent-lock-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const answer = Number(parentAnswer?.value);
    if (answer === parentExpected) openParentSpace();
    else { if (parentError) parentError.textContent = 'Essaie encore.'; newParentChallenge(); }
  });

  bottomNav.forEach(button => button.addEventListener('click', () => selectView(button.dataset.childView || 'library')));
  document.querySelector('.nav-button[data-view="library"]')?.addEventListener('click', scheduleChildHome);

  renderProfileGate();
  const active = readProfile();
  if (active) applyProfile(active);
  else openGate();
  syncBottomNav('library');

  let attempts = 0;
  const waitForLibrary = setInterval(() => {
    attempts += 1;
    if (typeof state !== 'undefined' && state.audios?.length) { clearInterval(waitForLibrary); renderChildHome(); }
    else if (attempts > 80) clearInterval(waitForLibrary);
  }, 100);
})();

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

  function applyProfile(profile) {
    const active = profile || DEFAULT_PROFILE;
    if (greetingName) greetingName.textContent = `Bonjour ${active.name}`;
    if (greetingAvatar) greetingAvatar.textContent = active.avatar || '🌿';
    if (gate) gate.hidden = true;
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

  chooseChild?.addEventListener('click', () => {
    saveProfile(DEFAULT_PROFILE);
    applyProfile(DEFAULT_PROFILE);
  });
  switchProfile?.addEventListener('click', openGate);

  bottomNav.forEach(button => button.addEventListener('click', () => {
    selectView(button.dataset.childView || 'library');
  }));

  const active = readProfile();
  if (active) applyProfile(active);
  else openGate();

  syncBottomNav('library');
})();

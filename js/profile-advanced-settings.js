// Réglages avancés de profil : âge, horaires de nuit et titres bloqués.
(() => {
  const PROFILE_KEY = 'forestActiveChildProfile';
  const PROFILES_KEY = 'forestChildProfiles';
  const DEFAULT_DAYS = [0,1,2,3,4,5,6];
  let currentProfileId = null;

  if (!document.querySelector('link[href="css/advanced-parent-polish.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/advanced-parent-polish.css';
    document.head.appendChild(link);
  }

  function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function profiles() { return readJson(PROFILES_KEY, []); }
  function activeProfile() {
    const active = readJson(PROFILE_KEY, null);
    return profiles().find(item => active && String(item.id) === String(active.id)) || active || profiles()[0] || null;
  }
  function byId(id) { return profiles().find(item => String(item.id) === String(id)); }
  function selectedDays() { return [...document.querySelectorAll('#setting-night-days [data-day].active')].map(button => Number(button.dataset.day)); }
  function setSelectedDays(days) {
    const selected = Array.isArray(days) && days.length ? days.map(Number) : DEFAULT_DAYS;
    document.querySelectorAll('#setting-night-days [data-day]').forEach(button => button.classList.toggle('active', selected.includes(Number(button.dataset.day))));
  }
  function audioLabel(audio) {
    const category = typeof categoryFor === 'function' ? categoryFor(audio)?.name : '';
    return [audio.title, category].filter(Boolean).join(' · ');
  }
  function renderBlocked(profile) {
    const list = document.getElementById('blocked-title-list');
    if (!list) return;
    if (typeof state === 'undefined' || !Array.isArray(state.audios) || !state.audios.length) {
      list.innerHTML = '<div class="blocked-empty">Les histoires apparaîtront ici dès que la bibliothèque sera chargée.</div>';
      return;
    }
    const blocked = new Set((profile?.blockedAudioIds || []).map(String));
    list.innerHTML = state.audios.map(audio => `<label class="blocked-title-row"><input type="checkbox" value="${escapeHtml(String(audio.id))}" ${blocked.has(String(audio.id)) ? 'checked' : ''}><span class="blocked-title-mark" aria-hidden="true">${audio.image_path ? '▣' : '✦'}</span><span><strong>${escapeHtml(audio.title || 'Sans titre')}</strong><small>${escapeHtml(audioLabel(audio))}</small></span></label>`).join('');
  }
  function populate(profile) {
    if (!profile) return;
    currentProfileId = profile.id;
    const birth = document.getElementById('setting-birth-year');
    const ageLevel = document.getElementById('setting-age-level');
    const start = document.getElementById('setting-night-start');
    const end = document.getElementById('setting-night-end');
    if (birth) birth.value = profile.birthYear || '';
    if (ageLevel) ageLevel.value = profile.ageLevel ? String(profile.ageLevel) : 'auto';
    if (start) start.value = profile.nightStart || '20:00';
    if (end) end.value = profile.nightEnd || '07:00';
    setSelectedDays(profile.nightDays);
    renderBlocked(profile);
  }
  function populateSelectedProfile() {
    const selected = document.querySelector('.parent-profile-chip.active[data-edit-profile]');
    populate(selected ? byId(selected.dataset.editProfile) : activeProfile() || profiles()[0]);
  }
  function saveAdvanced() {
    const list = profiles();
    const id = currentProfileId || activeProfile()?.id;
    const index = list.findIndex(item => String(item.id) === String(id));
    if (index < 0) return;
    const blocked = [...document.querySelectorAll('#blocked-title-list input[type="checkbox"]:checked')].map(input => String(input.value));
    const birthValue = Number(document.getElementById('setting-birth-year')?.value || 0);
    const ageValue = document.getElementById('setting-age-level')?.value || 'auto';
    const days = selectedDays();
    const next = {
      ...list[index],
      birthYear: birthValue || null,
      ageLevel: ageValue === 'auto' ? 'auto' : Number(ageValue),
      nightStart: document.getElementById('setting-night-start')?.value || '20:00',
      nightEnd: document.getElementById('setting-night-end')?.value || '07:00',
      nightDays: days.length ? days : DEFAULT_DAYS,
      blockedAudioIds: blocked
    };
    list[index] = next;
    writeJson(PROFILES_KEY, list);
    const active = readJson(PROFILE_KEY, null);
    if (active && String(active.id) === String(next.id)) writeJson(PROFILE_KEY, next);
    populate(next);
    window.dispatchEvent(new CustomEvent('forest:profile-updated', { detail: next }));
  }

  document.addEventListener('click', event => {
    const day = event.target.closest('#setting-night-days [data-day]');
    if (day) { day.classList.toggle('active'); return; }
    const chip = event.target.closest('[data-edit-profile]');
    if (chip) requestAnimationFrame(() => populate(byId(chip.dataset.editProfile)));
  });
  document.getElementById('save-profile-settings')?.addEventListener('click', () => requestAnimationFrame(saveAdvanced));

  const parentSpace = document.getElementById('parent-space');
  if (parentSpace) new MutationObserver(() => {
    if (!parentSpace.hidden) requestAnimationFrame(populateSelectedProfile);
  }).observe(parentSpace, { attributes: true, attributeFilter: ['hidden'] });
  const profileList = document.getElementById('parent-profile-list');
  if (profileList) new MutationObserver(() => {
    if (!parentSpace?.hidden) requestAnimationFrame(populateSelectedProfile);
  }).observe(profileList, { childList: true });

  let attempts = 0;
  const wait = setInterval(() => {
    attempts += 1;
    if (typeof state !== 'undefined' && Array.isArray(state.audios) && state.audios.length) {
      clearInterval(wait);
      if (currentProfileId) renderBlocked(byId(currentProfileId));
    } else if (attempts > 100) clearInterval(wait);
  }, 100);
})();
// Contrôles enfant locaux : minuteur, anti-zapping, mode nuit, âge et titres bloqués.
(() => {
  const PROFILE_KEY = 'forestActiveChildProfile';
  const PROFILES_KEY = 'forestChildProfiles';
  const TIMER_KEY = 'forestChildTimerSessions';
  const NIGHT_WORDS = ['douce','doux','calme','sommeil','dormir','nuit','berceuse','relax','rêve','reve','repos','médit','medit'];
  let activeId = null;
  let antiZapUntil = 0;
  let pendingStandby = false;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function profiles() { return readJson(PROFILES_KEY, []); }
  function profile() {
    const active = readJson(PROFILE_KEY, null);
    const list = profiles();
    return list.find(item => active && String(item.id) === String(active.id)) || active || list[0] || null;
  }
  function textOf(audio, category, subcategory) {
    return [audio?.title, audio?.description, category?.name || category, subcategory?.name || subcategory].filter(Boolean).join(' ').toLocaleLowerCase('fr');
  }
  function gentleText(...values) {
    const text = values.filter(Boolean).join(' ').toLocaleLowerCase('fr');
    return NIGHT_WORDS.some(word => text.includes(word));
  }
  function minutes(value) {
    const [h, m] = String(value || '00:00').split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }
  function nightModeActive(p = profile(), now = new Date()) {
    if (!p?.nightMode) return false;
    if (!p.nightStart || !p.nightEnd) return true;
    const days = Array.isArray(p.nightDays) && p.nightDays.length ? p.nightDays.map(Number) : [0,1,2,3,4,5,6];
    const start = minutes(p.nightStart);
    const end = minutes(p.nightEnd);
    const current = now.getHours() * 60 + now.getMinutes();
    const day = now.getDay();
    if (start === end) return days.includes(day);
    if (start < end) return days.includes(day) && current >= start && current < end;
    if (current >= start) return days.includes(day);
    const previousDay = (day + 6) % 7;
    return current < end && days.includes(previousDay);
  }
  function profileAgeLimit(p = profile()) {
    const explicit = Number(p?.ageLevel);
    if ([3,5,7].includes(explicit)) return explicit;
    const birthYear = Number(p?.birthYear || 0);
    if (!birthYear) return 7;
    const age = Math.max(0, new Date().getFullYear() - birthYear);
    if (age < 5) return 3;
    if (age < 7) return 5;
    return 7;
  }
  function hasConfiguredAge(p = profile()) {
    return [3,5,7].includes(Number(p?.ageLevel)) || Boolean(Number(p?.birthYear || 0));
  }
  function requiredAge(audio, category, subcategory) {
    const text = textOf(audio, category, subcategory);
    const seven = /(?:^|\D)7\s*(?:\+|ans?)/.test(text) || text.includes('à partir de 7') || text.includes('a partir de 7');
    const five = /(?:^|\D)5\s*(?:\+|ans?)/.test(text) || text.includes('à partir de 5') || text.includes('a partir de 5');
    if (seven) return 7;
    if (five) return 5;
    return 3;
  }
  function blockedForProfile(audio, p = profile()) {
    if (!audio || !p) return false;
    return (p.blockedAudioIds || []).map(String).includes(String(audio.id));
  }
  function audioRestriction(audio, category, subcategory, p = profile()) {
    if (!p) return null;
    if (blockedForProfile(audio, p)) return 'blocked';
    if (requiredAge(audio, category, subcategory) > profileAgeLimit(p)) return 'age';
    if (nightModeActive(p) && !gentleText(audio?.title, audio?.description, category?.name || category, subcategory?.name || subcategory)) return 'night';
    return null;
  }
  function isAudioAllowed(audio, category, subcategory) { return !audioRestriction(audio, category, subcategory); }

  function timerSessions() { return readJson(TIMER_KEY, {}); }
  function timerState(p = profile()) {
    if (!p || !Number(p.timer)) return { enabled: false, started: false, expired: false, remaining: 0 };
    const session = timerSessions()[String(p.id)];
    if (!session || Number(session.durationMinutes) !== Number(p.timer)) return { enabled: true, started: false, expired: false, remaining: Number(p.timer) * 60 * 1000 };
    const remaining = Math.max(0, Number(session.endAt) - Date.now());
    return { enabled: true, started: true, expired: remaining <= 0, remaining, endAt: Number(session.endAt) };
  }
  function startTimerIfNeeded(p = profile()) {
    if (!p || !Number(p.timer)) return;
    const current = timerState(p);
    if (current.started && !current.expired) return;
    const sessions = timerSessions();
    sessions[String(p.id)] = { endAt: Date.now() + Number(p.timer) * 60 * 1000, durationMinutes: Number(p.timer) };
    writeJson(TIMER_KEY, sessions);
    pendingStandby = false;
    hideStandby();
  }
  function resetTimerFor(p = profile()) {
    if (!p || !Number(p.timer)) return;
    const sessions = timerSessions();
    delete sessions[String(p.id)];
    writeJson(TIMER_KEY, sessions);
    pendingStandby = false;
    hideStandby();
    renderStatus();
  }
  function formatRemaining(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function currentAudioElement() {
    if (typeof player !== 'undefined' && player instanceof Audio) return player;
    return document.getElementById('audio-element');
  }
  function isPlaying() {
    const audio = currentAudioElement();
    return !!audio && !audio.paused && !audio.ended;
  }
  function ensureStatus() {
    let node = document.getElementById('child-control-status');
    if (node) return node;
    node = document.createElement('div');
    node.id = 'child-control-status';
    node.className = 'child-control-status';
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
    return node;
  }
  function renderStatus() {
    const p = profile();
    if (!p) return;
    const night = nightModeActive(p);
    document.body.classList.toggle('child-no-progress', p.progressBar === false);
    document.body.classList.toggle('child-night-mode', night);
    const status = ensureStatus();
    const timer = timerState(p);
    const parts = [];
    if (night) parts.push('🌙 Histoires douces');
    if (hasConfiguredAge(p)) parts.push(`★ ${profileAgeLimit(p)}+`);
    if (timer.enabled && timer.started && !timer.expired) parts.push(`⏱ ${formatRemaining(timer.remaining)}`);
    if (Date.now() < antiZapUntil) parts.push(`🔒 ${Math.ceil((antiZapUntil - Date.now()) / 1000)}s`);
    status.textContent = parts.join(' · ');
    status.hidden = !parts.length;
  }
  function ensureStandby() {
    let overlay = document.getElementById('child-standby');
    if (overlay) return overlay;
    overlay = document.createElement('section');
    overlay.id = 'child-standby';
    overlay.className = 'child-standby';
    overlay.hidden = true;
    overlay.innerHTML = '<div class="child-standby-card"><div class="child-standby-icon">🌙</div><h2>Temps d’écoute terminé</h2><p>L’histoire est finie. La forêt se repose maintenant.</p><a href="index.html" class="child-standby-home">Retour à l’accueil</a></div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  function showStandby() {
    ensureStandby().hidden = false;
    document.body.classList.add('child-is-standby');
  }
  function hideStandby() {
    const overlay = document.getElementById('child-standby');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('child-is-standby');
  }
  function showMessage(text) {
    let toast = document.getElementById('child-control-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'child-control-toast';
      toast.className = 'child-control-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('visible');
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }
  function updateTimer() {
    const p = profile();
    if (!p) return;
    if (String(p.id) !== String(activeId)) {
      activeId = p.id;
      antiZapUntil = 0;
      pendingStandby = false;
      hideStandby();
    }
    const timer = timerState(p);
    if (!timer.enabled || !timer.started || !timer.expired) {
      renderStatus();
      return;
    }
    if (isPlaying()) pendingStandby = true;
    else showStandby();
    renderStatus();
  }
  function startAntiZap() {
    const seconds = Number(profile()?.antiZap || 0);
    if (!seconds) return;
    antiZapUntil = Date.now() + seconds * 1000;
    renderStatus();
  }
  function antiZapActive() { return Date.now() < antiZapUntil; }
  function canStartAudio(audio, category, subcategory) {
    const p = profile();
    const timer = timerState(p);
    if (timer.enabled && timer.started && timer.expired) { showStandby(); return false; }
    const restriction = audioRestriction(audio, category, subcategory, p);
    if (restriction === 'blocked') { showMessage('🚫 Cette histoire est masquée pour ce profil.'); return false; }
    if (restriction === 'age') { showMessage(`★ Cette histoire est prévue pour un âge supérieur à ${profileAgeLimit(p)}+.`); return false; }
    if (restriction === 'night') { showMessage('🌙 À cette heure, seules les histoires douces sont disponibles.'); return false; }
    if (antiZapActive()) { showMessage(`🔒 Encore ${Math.ceil((antiZapUntil - Date.now()) / 1000)} seconde(s) avant de changer d’histoire.`); return false; }
    startTimerIfNeeded(p);
    return true;
  }
  function filterRenderedContent() {
    if (typeof state === 'undefined' || !Array.isArray(state.audios)) return;
    document.querySelectorAll('[data-child-id]').forEach(node => {
      const audio = state.audios.find(item => String(item.id) === String(node.dataset.childId));
      if (!audio) return;
      const category = typeof categoryFor === 'function' ? categoryFor(audio) : null;
      const subcategory = typeof subcategoryFor === 'function' ? subcategoryFor(audio) : null;
      if (!isAudioAllowed(audio, category, subcategory)) node.remove();
    });
    document.querySelectorAll('.child-rail-section').forEach(section => {
      if (!section.querySelector('[data-child-id]')) section.remove();
    });
  }

  function wireLibrary() {
    if (typeof filteredAudios === 'function') {
      const originalFiltered = filteredAudios;
      filteredAudios = function () {
        return originalFiltered().filter(audio => {
          const category = typeof categoryFor === 'function' ? categoryFor(audio) : null;
          const subcategory = typeof subcategoryFor === 'function' ? subcategoryFor(audio) : null;
          return isAudioAllowed(audio, category, subcategory);
        });
      };
    }
    if (typeof playById === 'function') {
      const originalPlay = playById;
      playById = function (id) {
        const audio = typeof state !== 'undefined' ? state.audios.find(item => String(item.id) === String(id)) : null;
        const category = audio && typeof categoryFor === 'function' ? categoryFor(audio) : null;
        const subcategory = audio && typeof subcategoryFor === 'function' ? subcategoryFor(audio) : null;
        if (!canStartAudio(audio, category, subcategory)) return;
        originalPlay(id);
        startAntiZap();
      };
    }
    if (typeof stepTrack === 'function') {
      const originalStep = stepTrack;
      stepTrack = function (direction) {
        const timer = timerState();
        if (pendingStandby || (timer.started && timer.expired)) { showStandby(); return; }
        if (antiZapActive()) { showMessage(`🔒 Écoute encore ${Math.ceil((antiZapUntil - Date.now()) / 1000)} seconde(s).`); return; }
        originalStep(direction);
      };
    }
    if (typeof player !== 'undefined' && player?.addEventListener) {
      player.addEventListener('ended', () => { if (pendingStandby || timerState().expired) showStandby(); });
    }
    document.addEventListener('click', event => {
      if (!antiZapActive()) return;
      if (event.target.closest('#mini-player, #child-control-status, #child-control-toast')) return;
      const navigation = event.target.closest('.child-bottom-nav, .sidebar, [data-child-id], [data-id], .child-category-tile, .child-rail-action');
      if (!navigation) return;
      event.preventDefault();
      event.stopPropagation();
      showMessage(`🔒 Écoute encore ${Math.ceil((antiZapUntil - Date.now()) / 1000)} seconde(s).`);
    }, true);
    new MutationObserver(filterRenderedContent).observe(document.getElementById('main-content') || document.body, { childList: true, subtree: true });
  }

  function wireAudioPage() {
    const observer = new MutationObserver(() => {
      const audio = document.getElementById('audio-element');
      if (!audio || audio.dataset.childControls === 'ready') return;
      audio.dataset.childControls = 'ready';
      const p = profile();
      const id = new URLSearchParams(location.search).get('id');
      const pseudoAudio = { id, title: document.getElementById('audio-title')?.textContent || '', description: document.getElementById('audio-desc')?.textContent || '' };
      const cat = document.getElementById('audio-cat')?.textContent || '';
      const restriction = audioRestriction(pseudoAudio, cat, '', p);
      if (restriction) {
        audio.pause();
        const copy = restriction === 'blocked' ? '🚫 Cette histoire est masquée pour ce profil.' : restriction === 'age' ? `★ Cette histoire dépasse le niveau ${profileAgeLimit(p)}+.` : '🌙 Cette histoire n’est pas disponible pendant le mode nuit.';
        showMessage(copy);
        document.getElementById('play')?.setAttribute('disabled', '');
        return;
      }
      audio.addEventListener('play', () => {
        const timer = timerState(p);
        if (timer.enabled && timer.started && timer.expired) { audio.pause(); showStandby(); return; }
        startTimerIfNeeded(p);
        startAntiZap();
      });
      audio.addEventListener('ended', () => { if (pendingStandby || timerState().expired) showStandby(); });
      document.getElementById('back-button')?.addEventListener('click', event => {
        if (!antiZapActive()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showMessage(`🔒 Écoute encore ${Math.ceil((antiZapUntil - Date.now()) / 1000)} seconde(s).`);
      }, true);
      renderStatus();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.ForestChildControls = { isAudioAllowed, canStartAudio, nightModeActive, profileAgeLimit, requiredAge, resetTimer: () => resetTimerFor(profile()) };
  window.addEventListener('forest:profile-updated', () => { renderStatus(); filterRenderedContent(); });
  document.addEventListener('DOMContentLoaded', () => {
    ensureStatus();
    ensureStandby();
    if (document.getElementById('main-content')) wireLibrary();
    if (document.getElementById('player-zone')) wireAudioPage();
    updateTimer();
    setInterval(() => { updateTimer(); filterRenderedContent(); }, 1000);
  });
})();

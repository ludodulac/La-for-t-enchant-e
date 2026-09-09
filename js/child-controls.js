// Contrôles enfant locaux : minuteur, anti-zapping et mode nuit.
(() => {
  const PROFILE_KEY = 'forestActiveChildProfile';
  const PROFILES_KEY = 'forestChildProfiles';
  const TIMER_KEY = 'forestChildTimerSessions';
  const NIGHT_WORDS = ['douce','doux','calme','sommeil','dormir','nuit','berceuse','relax','rêve','reve','repos','médit','medit'];
  let activeId = null;
  let antiZapUntil = 0;
  let pendingStandby = false;
  let timerTick = null;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function profile() {
    const active = readJson(PROFILE_KEY, null);
    const list = readJson(PROFILES_KEY, []);
    return list.find(item => active && String(item.id) === String(active.id)) || active || list[0] || null;
  }
  function gentleText(...values) {
    const text = values.filter(Boolean).join(' ').toLocaleLowerCase('fr');
    return NIGHT_WORDS.some(word => text.includes(word));
  }
  function isAudioAllowed(audio, category, subcategory) {
    const p = profile();
    if (!p?.nightMode) return true;
    return gentleText(audio?.title, audio?.description, category?.name || category, subcategory?.name || subcategory);
  }
  function timerSessions() { return readJson(TIMER_KEY, {}); }
  function timerState(p = profile()) {
    if (!p || !Number(p.timer)) return { enabled: false, expired: false, remaining: 0 };
    const sessions = timerSessions();
    let session = sessions[String(p.id)];
    const durationMs = Number(p.timer) * 60 * 1000;
    if (!session || Number(session.durationMinutes) !== Number(p.timer)) {
      session = { endAt: Date.now() + durationMs, durationMinutes: Number(p.timer) };
      sessions[String(p.id)] = session;
      writeJson(TIMER_KEY, sessions);
    }
    const remaining = Math.max(0, Number(session.endAt) - Date.now());
    return { enabled: true, expired: remaining <= 0, remaining, endAt: Number(session.endAt) };
  }
  function resetTimerFor(p) {
    if (!p || !Number(p.timer)) return;
    const sessions = timerSessions();
    sessions[String(p.id)] = { endAt: Date.now() + Number(p.timer) * 60 * 1000, durationMinutes: Number(p.timer) };
    writeJson(TIMER_KEY, sessions);
    pendingStandby = false;
    hideStandby();
    renderStatus();
  }
  function formatRemaining(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(seconds / 60);
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
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
    document.body.classList.toggle('child-no-progress', p.progressBar === false);
    document.body.classList.toggle('child-night-mode', !!p.nightMode);
    const status = ensureStatus();
    const timer = timerState(p);
    const parts = [];
    if (p.nightMode) parts.push('🌙 Histoires douces');
    if (timer.enabled && !timer.expired) parts.push(`⏱ ${formatRemaining(timer.remaining)}`);
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
    overlay.innerHTML = '<div class="child-standby-card"><div class="child-standby-icon">🌙</div><h2>Temps d’écoute terminé</h2><p>La forêt se repose pour le moment.</p><button type="button" id="child-standby-parent">Espace parents</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#child-standby-parent')?.addEventListener('click', () => {
      document.getElementById('open-parent-space')?.click();
      document.getElementById('choose-parent-space')?.click();
    });
    return overlay;
  }
  function showStandby() {
    const overlay = ensureStandby();
    overlay.hidden = false;
    document.body.classList.add('child-is-standby');
  }
  function hideStandby() {
    const overlay = document.getElementById('child-standby');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('child-is-standby');
  }

  function updateTimer() {
    const p = profile();
    if (!p) return;
    if (String(p.id) !== String(activeId)) {
      activeId = p.id;
      antiZapUntil = 0;
      pendingStandby = false;
    }
    const timer = timerState(p);
    if (!timer.enabled || !timer.expired) {
      if (!timer.expired) hideStandby();
      renderStatus();
      return;
    }
    if (isPlaying()) pendingStandby = true;
    else showStandby();
    renderStatus();
  }

  function startAntiZap() {
    const p = profile();
    const seconds = Number(p?.antiZap || 0);
    if (!seconds) return;
    antiZapUntil = Date.now() + seconds * 1000;
    renderStatus();
  }
  function antiZapActive() { return Date.now() < antiZapUntil; }
  function canStartAudio(audio, category, subcategory) {
    const p = profile();
    const timer = timerState(p);
    if (timer.enabled && timer.expired) {
      showStandby();
      return false;
    }
    if (!isAudioAllowed(audio, category, subcategory)) {
      showMessage('🌙 En mode nuit, seules les histoires douces sont disponibles.');
      return false;
    }
    if (antiZapActive()) {
      showMessage(`🔒 Encore ${Math.ceil((antiZapUntil - Date.now()) / 1000)} seconde(s) avant de changer d’histoire.`);
      return false;
    }
    return true;
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
    showMessage.timer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function filterRenderedNightContent() {
    const p = profile();
    if (!p?.nightMode || typeof state === 'undefined' || !Array.isArray(state.audios)) return;
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
    if (typeof player !== 'undefined' && player?.addEventListener) {
      player.addEventListener('ended', () => {
        if (pendingStandby || timerState().expired) showStandby();
      });
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
    new MutationObserver(() => filterRenderedNightContent()).observe(document.getElementById('main-content') || document.body, { childList: true, subtree: true });
  }

  function wireAudioPage() {
    const observer = new MutationObserver(() => {
      const audio = document.getElementById('audio-element');
      if (!audio || audio.dataset.childControls === 'ready') return;
      audio.dataset.childControls = 'ready';
      const p = profile();
      const title = document.getElementById('audio-title')?.textContent || '';
      const cat = document.getElementById('audio-cat')?.textContent || '';
      const desc = document.getElementById('audio-desc')?.textContent || '';
      if (p?.nightMode && !gentleText(title, cat, desc)) {
        audio.pause();
        showMessage('🌙 Cette histoire n’est pas disponible en mode nuit.');
        showStandby();
        return;
      }
      audio.addEventListener('play', () => {
        const timer = timerState(p);
        if (timer.enabled && timer.expired) { audio.pause(); showStandby(); return; }
        startAntiZap();
      });
      audio.addEventListener('ended', () => {
        if (pendingStandby || timerState().expired) showStandby();
      });
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

  window.ForestChildControls = { isAudioAllowed, canStartAudio, resetTimer: () => resetTimerFor(profile()) };

  document.addEventListener('DOMContentLoaded', () => {
    ensureStatus();
    ensureStandby();
    if (document.getElementById('main-content')) wireLibrary();
    if (document.getElementById('player-zone')) wireAudioPage();
    updateTimer();
    timerTick = setInterval(() => {
      updateTimer();
      filterRenderedNightContent();
    }, 1000);
  });
})();

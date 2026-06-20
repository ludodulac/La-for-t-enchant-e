// ============================================================
// audio.js — Fiche et lecteur audio
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  if (!id) { goBack(); return; }

  const { data: audio, error } = await supabase
    .from('audios')
    .select('*, categories(name), subcategories(name)')
    .eq('id', id)
    .single();

  if (error || !audio) {
    document.getElementById('player-container').innerHTML =
      '<p class="empty-msg">Cette histoire est introuvable. 😢</p>';
    return;
  }

  renderAudioPage(audio);
});

// ── Rendu de la fiche ────────────────────────────────────────
function renderAudioPage(audio) {
  const imgUrl = audio.image_path
    ? getPublicUrl('images', audio.image_path)
    : 'assets/default-cover.svg';

  const audioUrl = audio.audio_path
    ? getPublicUrl('audios', audio.audio_path)
    : null;

  // Breadcrumb dynamique selon contexte de navigation
  const ctx = JSON.parse(sessionStorage.getItem('navContext') ?? '{}');
  document.getElementById('breadcrumb').innerHTML = buildBreadcrumb(audio, ctx);

  // Couverture
  document.getElementById('audio-cover').style.backgroundImage = `url('${imgUrl}')`;

  // Infos
  document.getElementById('audio-title').textContent = audio.title;
  document.getElementById('audio-cat').textContent   =
    [audio.categories?.name, audio.subcategories?.name].filter(Boolean).join(' › ');

  if (audio.description) {
    document.getElementById('audio-desc').textContent = audio.description;
  }

  // Lecteur
  if (audioUrl) {
    buildPlayer(audioUrl, audio.duration);
  } else {
    document.getElementById('player-zone').innerHTML =
      '<p class="empty-msg">Fichier audio non disponible.</p>';
  }
}

// ── Lecteur audio custom ─────────────────────────────────────
function buildPlayer(src, durationHint) {
  const zone = document.getElementById('player-zone');

  // Élément audio natif (caché)
  const audio = document.createElement('audio');
  audio.src   = src;
  audio.preload = 'metadata';
  zone.appendChild(audio);

  // UI du lecteur
  zone.insertAdjacentHTML('beforeend', `
    <div class="player">
      <div class="player-progress-wrap">
        <span class="player-time" id="time-current">0:00</span>
        <input type="range" id="progress-bar" class="player-bar" min="0" max="100" value="0" step="0.1">
        <span class="player-time" id="time-total">${durationHint ? formatDuration(durationHint) : '–:––'}</span>
      </div>
      <div class="player-controls">
        <button class="ctrl-btn" id="btn-rewind" title="Reculer 15s">⏪</button>
        <button class="ctrl-btn ctrl-play" id="btn-play" title="Lecture / Pause">▶</button>
        <button class="ctrl-btn" id="btn-forward" title="Avancer 15s">⏩</button>
      </div>
      <div class="player-volume">
        <span>🔊</span>
        <input type="range" id="volume-bar" class="player-bar" min="0" max="1" step="0.01" value="1">
      </div>
    </div>
  `);

  const bar     = document.getElementById('progress-bar');
  const volBar  = document.getElementById('volume-bar');
  const btnPlay = document.getElementById('btn-play');
  const timeCur = document.getElementById('time-current');
  const timeEnd = document.getElementById('time-total');

  // Métadonnées chargées
  audio.addEventListener('loadedmetadata', () => {
    bar.max  = audio.duration;
    timeEnd.textContent = formatDuration(Math.floor(audio.duration));
  });

  // Progression
  audio.addEventListener('timeupdate', () => {
    bar.value = audio.currentTime;
    timeCur.textContent = formatDuration(Math.floor(audio.currentTime));
  });

  // Fin de lecture
  audio.addEventListener('ended', () => {
    btnPlay.textContent = '▶';
    bar.value = 0;
    audio.currentTime = 0;
  });

  // Bouton play/pause
  btnPlay.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      btnPlay.textContent = '⏸';
    } else {
      audio.pause();
      btnPlay.textContent = '▶';
    }
  });

  // Barre de progression (seek)
  bar.addEventListener('input', () => {
    audio.currentTime = bar.value;
  });

  // Volume
  volBar.addEventListener('input', () => {
    audio.volume = volBar.value;
  });

  // Reculer 15s
  document.getElementById('btn-rewind').addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 15);
  });

  // Avancer 15s
  document.getElementById('btn-forward').addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
  });
}

// ── Fil d'Ariane ─────────────────────────────────────────────
function buildBreadcrumb(audio, ctx) {
  let html = `<span class="bc-item bc-link" onclick="goHome()">🏠 Accueil</span>`;

  if (ctx.view === 'category' || ctx.view === 'subcategory') {
    html += `<span class="bc-sep">›</span>
             <span class="bc-item bc-link" onclick="goBack()">${audio.categories?.name ?? 'Catégorie'}</span>`;
  }
  if (ctx.view === 'subcategory' && audio.subcategories?.name) {
    html += `<span class="bc-sep">›</span>
             <span class="bc-item bc-link" onclick="goBack()">${audio.subcategories.name}</span>`;
  }
  if (ctx.view === 'search') {
    html += `<span class="bc-sep">›</span>
             <span class="bc-item bc-link" onclick="goBack()">Recherche</span>`;
  }

  html += `<span class="bc-sep">›</span>
           <span class="bc-item active">${audio.title}</span>`;
  return html;
}

// ── Navigation ────────────────────────────────────────────────
function goBack() {
  if (document.referrer && document.referrer.includes(window.location.hostname)) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}

function goHome() {
  window.location.href = 'index.html';
}

// ── Utilitaires ──────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

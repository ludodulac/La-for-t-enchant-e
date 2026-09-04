document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('back-button').addEventListener('click', () => {
    if (document.referrer && document.referrer.includes(location.hostname)) history.back();
    else location.href = 'index.html';
  });

  const id = new URLSearchParams(location.search).get('id');
  if (!id) return showError('Aucun audio sélectionné.');

  const { data: audio, error } = await dbClient
    .from('audios')
    .select('*, categories(name), subcategories(name)')
    .eq('id', id)
    .single();

  if (error || !audio) return showError('Cette histoire est introuvable.');
  renderAudio(audio);
});

function renderAudio(item) {
  const cover = item.image_path ? getPublicUrl('images', item.image_path) : '';
  const src = item.audio_path ? getPublicUrl('audios', item.audio_path) : '';
  const art = document.getElementById('detail-art');
  art.innerHTML = cover ? `<img src="${escapeHtml(cover)}" alt="Couverture de ${escapeHtml(item.title)}">` : '<div class="cover-placeholder">⌁</div>';
  document.getElementById('audio-title').textContent = item.title;
  document.title = `${item.title} — La Forêt Enchantée`;
  document.getElementById('audio-cat').textContent = [item.categories?.name, item.subcategories?.name].filter(Boolean).join(' · ') || 'La Forêt Enchantée';
  document.getElementById('audio-desc').textContent = item.description || 'Installe-toi confortablement et laisse l’histoire commencer.';
  if (!src) return showError('Le fichier audio n’est pas disponible.');
  buildPlayer(src, item.duration);
}

function buildPlayer(src, durationHint) {
  const zone = document.getElementById('player-zone');
  zone.innerHTML = `<div class="full-player">
    <audio id="audio-element" preload="metadata"></audio>
    <div class="full-progress"><span id="time-current">0:00</span><input class="range" id="progress-bar" type="range" min="0" max="100" step="0.1" value="0" aria-label="Progression"><span id="time-total">${formatDuration(durationHint)}</span></div>
    <div class="full-transport"><button id="rewind" type="button" aria-label="Reculer de 15 secondes">−15</button><button class="play" id="play" type="button" aria-label="Lecture">▶</button><button id="forward" type="button" aria-label="Avancer de 15 secondes">+15</button></div>
    <div class="full-tools"><label>Vitesse <select class="speed-select" id="speed" aria-label="Vitesse de lecture"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label><label>Volume <input class="range" id="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume"></label></div>
  </div>`;

  const audio = document.getElementById('audio-element');
  const play = document.getElementById('play');
  const progress = document.getElementById('progress-bar');
  const current = document.getElementById('time-current');
  const total = document.getElementById('time-total');
  audio.src = src;

  const sync = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : Number(durationHint || 0);
    progress.max = duration || 100;
    progress.value = audio.currentTime || 0;
    current.textContent = formatDuration(audio.currentTime);
    total.textContent = formatDuration(duration);
    play.textContent = audio.paused ? '▶' : 'Ⅱ';
    play.setAttribute('aria-label', audio.paused ? 'Lecture' : 'Pause');
  };

  audio.addEventListener('loadedmetadata', sync);
  audio.addEventListener('timeupdate', sync);
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', sync);
  play.addEventListener('click', () => audio.paused ? audio.play() : audio.pause());
  document.getElementById('rewind').addEventListener('click', () => audio.currentTime = Math.max(0, audio.currentTime - 15));
  document.getElementById('forward').addEventListener('click', () => audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15));
  progress.addEventListener('input', () => audio.currentTime = Number(progress.value));
  document.getElementById('volume').addEventListener('input', event => audio.volume = Number(event.target.value));
  document.getElementById('speed').addEventListener('change', event => audio.playbackRate = Number(event.target.value));
}

function showError(message) {
  document.getElementById('player-zone').innerHTML = `<div class="status-message">${escapeHtml(message)}</div>`;
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return '—';
  const whole = Math.floor(value);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}

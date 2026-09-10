// admin-cover-editor.js — enrichit les formulaires audio sans changer le rendu public.
(() => {
  const BANK_URL = 'assets/illustrations/grimm/manifest.json';
  const BANK_BASE = 'assets/illustrations/grimm/';
  const COLORS = [
    '#F6D66A','#E9B96E','#D98E63','#C96F5D','#E7A0A8','#D98EB7',
    '#A989C8','#8178C8','#677FC0','#5D96BF','#62AFAF','#77BE9B',
    '#98C77E','#BCD67B','#D7C774','#B78967','#826D72','#334E68'
  ];

  let bank = [];
  const states = new Map();

  function safeColor(value) {
    return window.ForestCoverComposer?.normalizeHex(value) || '#8FC9A6';
  }

  function makeEditor(kind, fileInputId, titleInputId) {
    const fileInput = document.getElementById(fileInputId);
    const titleInput = document.getElementById(titleInputId);
    if (!fileInput || !titleInput) return null;

    const state = {
      kind,
      mode: 'upload',
      key: bank[0]?.id || '',
      color: '#8FC9A6',
      fileInput,
      titleInput,
      current: null,
      initialMode: 'upload',
      initialTitle: '',
      initialKey: null,
      initialColor: null,
      renderToken: 0,
    };

    const root = document.createElement('div');
    root.className = 'cover-editor';
    root.dataset.coverEditor = kind;
    root.innerHTML = `
      <div class="cover-mode-switch" role="group" aria-label="Mode de couverture">
        <button type="button" class="cover-mode active" data-cover-mode="upload">Importer ma propre couverture</button>
        <button type="button" class="cover-mode" data-cover-mode="composed">Créer une couverture</button>
      </div>
      <div class="cover-builder" hidden>
        <div class="cover-builder-copy">
          <strong>Choisis un dessin</strong>
          <span>Le nom aide seulement dans l’administration.</span>
        </div>
        <div class="cover-gallery" role="listbox" aria-label="Illustrations Grimm"></div>
        <div class="cover-builder-copy color-copy"><strong>Choisis une couleur</strong><span>Le dessin passe automatiquement en noir ou en blanc.</span></div>
        <div class="cover-color-row">
          <div class="cover-swatches" aria-label="Couleurs proposées"></div>
          <label class="cover-custom-color"><span>Libre</span><input type="color" value="#8FC9A6" aria-label="Couleur personnalisée"></label>
        </div>
        <div class="cover-preview-wrap">
          <canvas class="cover-preview" width="600" height="600" aria-label="Aperçu de la couverture"></canvas>
          <div class="cover-preview-note">Aperçu de la vignette finale</div>
        </div>
        <div class="cover-title-sync" hidden>Le nouveau titre régénérera automatiquement cette couverture.</div>
      </div>`;

    fileInput.closest('.form-group')?.appendChild(root);
    state.root = root;
    state.builder = root.querySelector('.cover-builder');
    state.gallery = root.querySelector('.cover-gallery');
    state.swatches = root.querySelector('.cover-swatches');
    state.customColor = root.querySelector('.cover-custom-color input');
    state.canvas = root.querySelector('.cover-preview');
    state.titleSync = root.querySelector('.cover-title-sync');
    states.set(kind, state);

    root.querySelectorAll('[data-cover-mode]').forEach(button => {
      button.addEventListener('click', () => setMode(state, button.dataset.coverMode));
    });
    state.customColor.addEventListener('input', () => {
      state.color = safeColor(state.customColor.value);
      syncColorSelection(state);
      renderPreview(state);
    });
    titleInput.addEventListener('input', () => {
      if (state.mode === 'composed') renderPreview(state);
      updateTitleSync(state);
    });

    renderGallery(state);
    renderSwatches(state);
    setMode(state, 'upload');
    return state;
  }

  function setMode(state, mode) {
    state.mode = mode === 'composed' ? 'composed' : 'upload';
    state.root.querySelectorAll('[data-cover-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.coverMode === state.mode);
      button.setAttribute('aria-pressed', button.dataset.coverMode === state.mode ? 'true' : 'false');
    });
    state.builder.hidden = state.mode !== 'composed';
    state.fileInput.hidden = state.mode === 'composed';
    const hint = state.fileInput.parentElement?.querySelector('.upload-hint,.keep-file-hint');
    if (hint) hint.hidden = state.mode === 'composed';
    if (state.mode === 'composed') renderPreview(state);
    updateTitleSync(state);
  }

  function renderGallery(state) {
    state.gallery.innerHTML = bank.map(item => `
      <button type="button" class="cover-illustration" data-illustration-key="${item.id}" role="option" aria-label="${item.label}">
        <span class="cover-illustration-art"><img src="${BANK_BASE}${item.file}" alt=""></span>
        <span>${item.label}</span>
      </button>`).join('');
    state.gallery.querySelectorAll('[data-illustration-key]').forEach(button => {
      button.addEventListener('click', () => {
        state.key = button.dataset.illustrationKey;
        syncIllustrationSelection(state);
        renderPreview(state);
      });
    });
    syncIllustrationSelection(state);
  }

  function renderSwatches(state) {
    state.swatches.innerHTML = COLORS.map(color => `<button type="button" class="cover-swatch" data-cover-color="${color}" style="--swatch:${color}" aria-label="${color}"></button>`).join('');
    state.swatches.querySelectorAll('[data-cover-color]').forEach(button => {
      button.addEventListener('click', () => {
        state.color = safeColor(button.dataset.coverColor);
        state.customColor.value = state.color;
        syncColorSelection(state);
        renderPreview(state);
      });
    });
    syncColorSelection(state);
  }

  function syncIllustrationSelection(state) {
    state.gallery.querySelectorAll('[data-illustration-key]').forEach(button => {
      const selected = button.dataset.illustrationKey === state.key;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function syncColorSelection(state) {
    state.swatches.querySelectorAll('[data-cover-color]').forEach(button => {
      button.classList.toggle('selected', safeColor(button.dataset.coverColor) === safeColor(state.color));
    });
  }

  function selectedAsset(state) {
    return bank.find(item => item.id === state.key) || bank[0] || null;
  }

  async function renderPreview(state) {
    if (state.mode !== 'composed' || !window.ForestCoverComposer) return;
    const asset = selectedAsset(state);
    if (!asset) return;
    const token = ++state.renderToken;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await window.ForestCoverComposer.render({
        canvas: state.canvas,
        title: state.titleInput.value.trim() || 'Ton histoire',
        illustrationUrl: BANK_BASE + asset.file,
        color: state.color,
        framing: asset,
      });
      if (token !== state.renderToken) return;
    } catch (error) {
      console.warn('Aperçu de couverture indisponible.', error);
    }
  }

  function updateTitleSync(state) {
    if (!state.titleSync) return;
    const changedTitle = state.kind === 'edit' && state.mode === 'composed' && state.current && state.titleInput.value.trim() !== state.initialTitle;
    state.titleSync.hidden = !changedTitle;
  }

  async function composedFile(state, title) {
    const asset = selectedAsset(state);
    if (!asset) throw new Error('Choisis une illustration.');
    state.color = safeColor(state.color);
    await window.ForestCoverComposer.render({
      canvas: state.canvas,
      title,
      illustrationUrl: BANK_BASE + asset.file,
      color: state.color,
      framing: asset,
    });
    const blob = await window.ForestCoverComposer.toBlob(state.canvas, 'image/png');
    return new File([blob], 'couverture-composee.png', { type: 'image/png' });
  }

  async function resolveAdd(title) {
    const state = states.get('add');
    if (!state || state.mode === 'upload') {
      return { file: state?.fileInput.files[0] || null, illustrationKey: null, coverColor: null, generated: false };
    }
    return {
      file: await composedFile(state, title),
      illustrationKey: selectedAsset(state).id,
      coverColor: safeColor(state.color),
      generated: true,
    };
  }

  async function resolveEdit(title) {
    const state = states.get('edit');
    if (!state || !state.current) return { file: null, illustrationKey: null, coverColor: null, generated: false, replace: false };
    const importedFile = state.fileInput.files[0] || null;

    if (state.mode === 'upload') {
      if (state.initialMode === 'composed' && !importedFile) {
        throw new Error('Choisis une image à importer pour remplacer la couverture créée.');
      }
      return {
        file: importedFile,
        illustrationKey: null,
        coverColor: null,
        generated: false,
        replace: Boolean(importedFile),
      };
    }

    const asset = selectedAsset(state);
    if (!asset) throw new Error('Choisis une illustration.');
    const color = safeColor(state.color);
    const mustRegenerate = state.initialMode !== 'composed'
      || title !== state.initialTitle
      || asset.id !== state.initialKey
      || color !== safeColor(state.initialColor);

    return {
      file: mustRegenerate ? await composedFile(state, title) : null,
      illustrationKey: asset.id,
      coverColor: color,
      generated: mustRegenerate,
      replace: mustRegenerate,
    };
  }

  function prepareEdit(audio) {
    const state = states.get('edit');
    if (!state || !audio) return;
    state.current = audio;
    state.initialTitle = audio.title || '';
    state.initialKey = audio.illustration_key || null;
    state.initialColor = audio.cover_color || null;
    state.initialMode = state.initialKey && state.initialColor ? 'composed' : 'upload';
    state.fileInput.value = '';
    if (state.initialMode === 'composed') {
      state.key = bank.some(item => item.id === state.initialKey) ? state.initialKey : (bank[0]?.id || '');
      state.color = safeColor(state.initialColor);
      state.customColor.value = state.color;
      syncIllustrationSelection(state);
      syncColorSelection(state);
    }
    setMode(state, state.initialMode);
    updateTitleSync(state);
  }

  function reset(kind) {
    const state = states.get(kind);
    if (!state) return;
    state.current = null;
    state.initialTitle = '';
    state.initialKey = null;
    state.initialColor = null;
    state.initialMode = 'upload';
    state.key = bank[0]?.id || '';
    state.color = '#8FC9A6';
    state.customColor.value = state.color;
    syncIllustrationSelection(state);
    syncColorSelection(state);
    setMode(state, 'upload');
  }

  async function verifyStoragePath(bucket, path) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    const parts = cleanPath.split('/');
    const fileName = parts.pop();
    const folder = parts.join('/');
    const { data, error } = await dbClient.storage.from(bucket).list(folder, { limit: 100, search: fileName });
    if (error) throw error;
    if (!(data || []).some(item => item.name === fileName)) throw new Error(`Le fichier ${fileName} n’a pas été confirmé dans Storage.`);
    return true;
  }

  async function uploadVerified(bucket, path, file) {
    await uploadFile(bucket, path, file);
    await verifyStoragePath(bucket, path);
    return path;
  }

  function verifyRow(row, expected) {
    if (!row) throw new Error('La sauvegarde n’a pas pu être confirmée.');
    Object.entries(expected).forEach(([key, value]) => {
      if ((row[key] ?? null) !== (value ?? null)) throw new Error(`La sauvegarde de ${key} n’a pas pu être confirmée.`);
    });
  }

  async function enhancedAddAudio(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const btn = document.getElementById('btn-add-audio');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
    const uploaded = [];

    try {
      const title = document.getElementById('audio-title-in').value.trim();
      const description = document.getElementById('audio-desc-in').value.trim();
      const catId = document.getElementById('audio-cat').value || null;
      const subId = document.getElementById('audio-sub').value || null;
      const audFile = document.getElementById('audio-file').files[0];
      if (!title || !audFile) throw new Error('Titre et fichier audio requis.');

      const cover = await resolveAdd(title);
      let imagePath = null;
      if (cover.file) {
        imagePath = makeStoragePath(title, cover.file.name);
        await uploadVerified('images', imagePath, cover.file);
        uploaded.push({ bucket: 'images', path: imagePath });
      }

      const audPath = makeStoragePath(title, audFile.name);
      await uploadVerified('audios', audPath, audFile);
      uploaded.push({ bucket: 'audios', path: audPath });
      const duration = await getAudioDuration(audFile);

      const payload = {
        title,
        description: description || null,
        category_id: catId,
        subcategory_id: subId,
        image_path: imagePath,
        audio_path: audPath,
        duration: Math.floor(duration) || null,
        illustration_key: cover.illustrationKey,
        cover_color: cover.coverColor,
      };
      const { data: row, error: dbErr } = await dbClient.from('audios').insert(payload)
        .select('id,title,image_path,audio_path,illustration_key,cover_color').single();
      if (dbErr) throw dbErr;
      verifyRow(row, {
        title,
        image_path: imagePath,
        audio_path: audPath,
        illustration_key: cover.illustrationKey,
        cover_color: cover.coverColor,
      });

      uploaded.length = 0;
      showNotif('Histoire ajoutée avec succès ✓');
      event.target.reset();
      reset('add');
      await refreshData();
      renderAll();
    } catch (error) {
      if (uploaded.length) await removeFiles(uploaded);
      showNotif('Erreur : ' + (error.message || error), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ajouter l’histoire';
    }
  }

  async function enhancedEditAudio(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = document.getElementById('edit-audio-id').value;
    const title = document.getElementById('edit-audio-title').value.trim();
    const description = document.getElementById('edit-audio-desc').value.trim();
    const catId = document.getElementById('edit-audio-cat').value || null;
    const subId = document.getElementById('edit-audio-sub').value || null;
    const audFile = document.getElementById('edit-audio-file').files[0];
    if (!title) return showNotif('Titre requis.', 'error');

    const audio = audios.find(item => sameId(item.id, id));
    if (!audio) return showNotif('Audio introuvable.', 'error');

    const uploaded = [];
    let imagePath = audio.image_path;
    let audioPath = audio.audio_path;

    try {
      const cover = await resolveEdit(title);
      if (cover.file) {
        imagePath = makeStoragePath(title, cover.file.name);
        await uploadVerified('images', imagePath, cover.file);
        uploaded.push({ bucket: 'images', path: imagePath });
      }
      if (audFile) {
        audioPath = makeStoragePath(title, audFile.name);
        await uploadVerified('audios', audioPath, audFile);
        uploaded.push({ bucket: 'audios', path: audioPath });
      }

      const patch = {
        title,
        description: description || null,
        category_id: catId,
        subcategory_id: subId,
        image_path: imagePath,
        audio_path: audioPath,
        illustration_key: cover.illustrationKey,
        cover_color: cover.coverColor,
      };
      if (audFile) patch.duration = Math.floor(await getAudioDuration(audFile)) || null;

      const { data: row, error: dbErr } = await dbClient.from('audios').update(patch).eq('id', id)
        .select('id,title,image_path,audio_path,illustration_key,cover_color').single();
      if (dbErr) throw dbErr;
      verifyRow(row, {
        title,
        image_path: imagePath,
        audio_path: audioPath,
        illustration_key: cover.illustrationKey,
        cover_color: cover.coverColor,
      });

      const oldFiles = [];
      if (cover.file && audio.image_path && audio.image_path !== imagePath) oldFiles.push({ bucket: 'images', path: audio.image_path });
      if (audFile && audio.audio_path && audio.audio_path !== audioPath) oldFiles.push({ bucket: 'audios', path: audio.audio_path });
      uploaded.length = 0;
      const cleaned = oldFiles.length ? await removeFiles(oldFiles) : true;
      showNotif(cleaned ? 'Histoire modifiée ✓' : 'Histoire modifiée, mais un ancien fichier reste à nettoyer.', cleaned ? 'success' : 'error');

      event.target.reset();
      reset('edit');
      document.getElementById('edit-panel').style.display = 'none';
      await refreshData();
      renderAll();
    } catch (error) {
      if (uploaded.length) await removeFiles(uploaded);
      showNotif('Erreur : ' + (error.message || error), 'error');
    }
  }

  async function init() {
    try {
      const response = await fetch(BANK_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Banque Grimm indisponible.');
      bank = await response.json();
    } catch (error) {
      console.warn(error);
      bank = [];
    }
    makeEditor('add', 'audio-img', 'audio-title-in');
    makeEditor('edit', 'edit-audio-img', 'edit-audio-title');
  }

  const originalOpenEditAudio = window.openEditAudio;
  if (typeof originalOpenEditAudio === 'function') {
    window.openEditAudio = function(id) {
      originalOpenEditAudio(id);
      const audio = audios.find(item => sameId(item.id, id));
      if (audio) prepareEdit(audio);
    };
  }

  function bindEnhancedForms() {
    const addForm = document.getElementById('form-add-audio');
    if (addForm && !addForm.dataset.composedCoverBound) {
      addForm.dataset.composedCoverBound = 'true';
      addForm.addEventListener('submit', enhancedAddAudio, true);
    }
    const editForm = document.getElementById('form-edit-audio');
    if (editForm && !editForm.dataset.composedCoverBound) {
      editForm.dataset.composedCoverBound = 'true';
      editForm.addEventListener('submit', enhancedEditAudio, true);
    }
  }

  window.handleAddAudio = enhancedAddAudio;
  window.handleEditAudio = enhancedEditAudio;
  window.AdminCoverEditor = { init, prepareEdit, resolveAdd, resolveEdit, reset, verifyStoragePath };

  async function boot() {
    await init();
    bindEnhancedForms();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

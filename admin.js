// ============================================================
// admin.js — Tableau de bord administrateur
// ============================================================

let categories    = [];
let subcategories = [];
let audios        = [];

// ── Initialisation ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  await refreshData();
  setupTabs();
  setupForms();
  renderAll();
});

// ── Chargement des données ───────────────────────────────────
async function refreshData() {
  const [cats, subs, auds] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('subcategories').select('*').order('name'),
    supabase.from('audios').select('*').order('created_at', { ascending: false }),
  ]);
  categories    = cats.data  ?? [];
  subcategories = subs.data  ?? [];
  audios        = auds.data  ?? [];
}

// ── Onglets ──────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ── Rendu global ─────────────────────────────────────────────
function renderAll() {
  renderCatList();
  renderSubList();
  renderAudioList();
  populateCatSelects();
}

// ── CATÉGORIES ───────────────────────────────────────────────
function renderCatList() {
  const list = document.getElementById('cat-list');
  if (!list) return;
  list.innerHTML = '';

  if (categories.length === 0) {
    list.innerHTML = '<p class="empty-msg">Aucune catégorie.</p>';
    return;
  }

  categories.forEach(cat => {
    const count = audios.filter(a => a.category_id === cat.id).length;
    const row   = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <span class="row-name">${cat.name}</span>
      <span class="row-meta">${count} histoire${count !== 1 ? 's' : ''}</span>
      <div class="row-actions">
        <button class="btn-sm btn-edit" onclick="editCat(${cat.id}, '${escQ(cat.name)}')">Modifier</button>
        <button class="btn-sm btn-del"  onclick="deleteCat(${cat.id})">Supprimer</button>
      </div>
    `;
    list.appendChild(row);
  });
}

async function addCategory(name) {
  const { error } = await supabase.from('categories').insert({ name });
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Catégorie ajoutée ✓');
  await refreshData();
  renderAll();
}

async function editCat(id, oldName) {
  const name = prompt('Nouveau nom :', oldName);
  if (!name || name.trim() === oldName) return;
  const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', id);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Catégorie modifiée ✓');
  await refreshData();
  renderAll();
}

async function deleteCat(id) {
  if (!confirm('Supprimer cette catégorie et tous ses audios ?')) return;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Catégorie supprimée');
  await refreshData();
  renderAll();
}

// ── SOUS-CATÉGORIES ──────────────────────────────────────────
function renderSubList() {
  const list = document.getElementById('sub-list-admin');
  if (!list) return;
  list.innerHTML = '';

  if (subcategories.length === 0) {
    list.innerHTML = '<p class="empty-msg">Aucune sous-catégorie.</p>';
    return;
  }

  subcategories.forEach(sub => {
    const cat   = categories.find(c => c.id === sub.category_id);
    const count = audios.filter(a => a.subcategory_id === sub.id).length;
    const row   = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <span class="row-name">${sub.name}</span>
      <span class="row-meta">${cat?.name ?? '—'} · ${count} histoire${count !== 1 ? 's' : ''}</span>
      <div class="row-actions">
        <button class="btn-sm btn-edit" onclick="editSub(${sub.id}, '${escQ(sub.name)}', ${sub.category_id})">Modifier</button>
        <button class="btn-sm btn-del"  onclick="deleteSub(${sub.id})">Supprimer</button>
      </div>
    `;
    list.appendChild(row);
  });
}

async function addSubcategory(name, categoryId) {
  const { error } = await supabase.from('subcategories').insert({ name, category_id: categoryId });
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Sous-catégorie ajoutée ✓');
  await refreshData();
  renderAll();
}

async function editSub(id, oldName, catId) {
  const name = prompt('Nouveau nom :', oldName);
  if (!name || name.trim() === oldName) return;
  const { error } = await supabase.from('subcategories').update({ name: name.trim() }).eq('id', id);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Sous-catégorie modifiée ✓');
  await refreshData();
  renderAll();
}

async function deleteSub(id) {
  if (!confirm('Supprimer cette sous-catégorie ?')) return;
  const { error } = await supabase.from('subcategories').delete().eq('id', id);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Sous-catégorie supprimée');
  await refreshData();
  renderAll();
}

// ── AUDIOS ───────────────────────────────────────────────────
function renderAudioList() {
  const list = document.getElementById('audio-list-admin');
  if (!list) return;
  list.innerHTML = '';

  if (audios.length === 0) {
    list.innerHTML = '<p class="empty-msg">Aucun audio.</p>';
    return;
  }

  audios.forEach(audio => {
    const cat = categories.find(c => c.id === audio.category_id);
    const sub = subcategories.find(s => s.id === audio.subcategory_id);
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <span class="row-name">${audio.title}</span>
      <span class="row-meta">${cat?.name ?? '—'}${sub ? ' › ' + sub.name : ''}</span>
      <div class="row-actions">
        <button class="btn-sm btn-edit" onclick="openEditAudio(${audio.id})">Modifier</button>
        <button class="btn-sm btn-del"  onclick="deleteAudio(${audio.id}, '${escQ(audio.image_path)}', '${escQ(audio.audio_path)}')">Supprimer</button>
      </div>
    `;
    list.appendChild(row);
  });
}

// ── Formulaires ──────────────────────────────────────────────
function setupForms() {
  // — Ajouter catégorie
  document.getElementById('form-add-cat')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return;
    await addCategory(name);
    e.target.reset();
  });

  // — Ajouter sous-catégorie
  document.getElementById('form-add-sub')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name  = document.getElementById('new-sub-name').value.trim();
    const catId = parseInt(document.getElementById('new-sub-cat').value, 10);
    if (!name || !catId) return;
    await addSubcategory(name, catId);
    e.target.reset();
  });

  // — Ajouter audio
  document.getElementById('form-add-audio')?.addEventListener('submit', handleAddAudio);

  // — Filtre sous-catégorie selon catégorie choisie
  document.getElementById('audio-cat')?.addEventListener('change', e => {
    updateSubSelect('audio-sub', parseInt(e.target.value, 10));
  });
  document.getElementById('edit-audio-cat')?.addEventListener('change', e => {
    updateSubSelect('edit-audio-sub', parseInt(e.target.value, 10));
  });
}

function populateCatSelects() {
  const selectors = ['new-sub-cat', 'audio-cat', 'edit-audio-cat'];
  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">— Catégorie —</option>';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id == val) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  updateSubSelect('audio-sub', null);
  updateSubSelect('edit-audio-sub', null);
}

function updateSubSelect(selId, catId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Sous-catégorie (optionnel) —</option>';
  subcategories
    .filter(s => !catId || s.category_id === catId)
    .forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id == val) opt.selected = true;
      sel.appendChild(opt);
    });
}

// ── Ajout audio avec upload ──────────────────────────────────
async function handleAddAudio(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-add-audio');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours…';

  try {
    const title       = document.getElementById('audio-title-in').value.trim();
    const description = document.getElementById('audio-desc-in').value.trim();
    const catId       = parseInt(document.getElementById('audio-cat').value, 10) || null;
    const subId       = parseInt(document.getElementById('audio-sub').value, 10) || null;
    const imgFile     = document.getElementById('audio-img').files[0];
    const audFile     = document.getElementById('audio-file').files[0];

    if (!title || !audFile) {
      showNotif('Titre et fichier audio requis.', 'error');
      return;
    }

    // Upload image
    let imagePath = null;
    if (imgFile) {
      const ext  = imgFile.name.split('.').pop();
      const path = `${Date.now()}-${slugify(title)}.${ext}`;
      const { error: imgErr } = await supabase.storage.from('images').upload(path, imgFile);
      if (imgErr) throw imgErr;
      imagePath = path;
    }

    // Upload audio
    const audExt  = audFile.name.split('.').pop();
    const audPath = `${Date.now()}-${slugify(title)}.${audExt}`;
    const { error: audErr } = await supabase.storage.from('audios').upload(audPath, audFile);
    if (audErr) throw audErr;

    // Durée audio (côté client)
    const duration = await getAudioDuration(audFile);

    // Insertion en base
    const { error: dbErr } = await supabase.from('audios').insert({
      title,
      description: description || null,
      category_id:    catId,
      subcategory_id: subId,
      image_path:  imagePath,
      audio_path:  audPath,
      duration:    Math.floor(duration) || null,
    });

    if (dbErr) throw dbErr;

    showNotif('Audio ajouté avec succès ✓');
    e.target.reset();
    await refreshData();
    renderAll();

  } catch (err) {
    showNotif('Erreur : ' + (err.message ?? err), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ajouter l\'audio';
  }
}

// ── Modifier audio ───────────────────────────────────────────
function openEditAudio(id) {
  const audio = audios.find(a => a.id === id);
  if (!audio) return;

  document.getElementById('edit-panel').style.display = 'block';
  document.getElementById('edit-audio-id').value          = audio.id;
  document.getElementById('edit-audio-title').value       = audio.title;
  document.getElementById('edit-audio-desc').value        = audio.description ?? '';
  document.getElementById('edit-audio-cat').value         = audio.category_id ?? '';
  updateSubSelect('edit-audio-sub', audio.category_id);
  document.getElementById('edit-audio-sub').value         = audio.subcategory_id ?? '';

  document.getElementById('edit-panel').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  // Formulaire de modification
  document.getElementById('form-edit-audio')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id          = parseInt(document.getElementById('edit-audio-id').value, 10);
    const title       = document.getElementById('edit-audio-title').value.trim();
    const description = document.getElementById('edit-audio-desc').value.trim();
    const catId       = parseInt(document.getElementById('edit-audio-cat').value, 10) || null;
    const subId       = parseInt(document.getElementById('edit-audio-sub').value, 10) || null;
    const imgFile     = document.getElementById('edit-audio-img').files[0];
    const audFile     = document.getElementById('edit-audio-file').files[0];

    if (!title) return showNotif('Titre requis.', 'error');

    const audio   = audios.find(a => a.id === id);
    let imagePath = audio.image_path;
    let audioPath = audio.audio_path;

    try {
      // Nouveau fichier image ?
      if (imgFile) {
        if (imagePath) await supabase.storage.from('images').remove([imagePath]);
        const ext = imgFile.name.split('.').pop();
        imagePath = `${Date.now()}-${slugify(title)}.${ext}`;
        const { error } = await supabase.storage.from('images').upload(imagePath, imgFile);
        if (error) throw error;
      }

      // Nouveau fichier audio ?
      if (audFile) {
        if (audioPath) await supabase.storage.from('audios').remove([audioPath]);
        const ext  = audFile.name.split('.').pop();
        audioPath  = `${Date.now()}-${slugify(title)}.${ext}`;
        const { error } = await supabase.storage.from('audios').upload(audioPath, audFile);
        if (error) throw error;
      }

      const { error: dbErr } = await supabase.from('audios').update({
        title,
        description:    description || null,
        category_id:    catId,
        subcategory_id: subId,
        image_path:     imagePath,
        audio_path:     audioPath,
      }).eq('id', id);

      if (dbErr) throw dbErr;

      showNotif('Audio modifié ✓');
      document.getElementById('edit-panel').style.display = 'none';
      await refreshData();
      renderAll();

    } catch (err) {
      showNotif('Erreur : ' + (err.message ?? err), 'error');
    }
  });

  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    document.getElementById('edit-panel').style.display = 'none';
  });
});

async function deleteAudio(id, imagePath, audioPath) {
  if (!confirm('Supprimer cet audio définitivement ?')) return;

  // Supprimer fichiers storage
  if (imagePath && imagePath !== 'undefined') await supabase.storage.from('images').remove([imagePath]);
  if (audioPath && audioPath !== 'undefined') await supabase.storage.from('audios').remove([audioPath]);

  // Supprimer en base
  const { error } = await supabase.from('audios').delete().eq('id', id);
  if (error) return showNotif('Erreur : ' + error.message, 'error');

  showNotif('Audio supprimé');
  await refreshData();
  renderAll();
}

// ── Déconnexion ──────────────────────────────────────────────
document.getElementById('btn-logout')?.addEventListener('click', signOut);

// ── Utilitaires ──────────────────────────────────────────────
function getAudioDuration(file) {
  return new Promise(resolve => {
    const url  = URL.createObjectURL(file);
    const el   = new Audio(url);
    el.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    });
    el.addEventListener('error', () => resolve(0));
  });
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
}

function escQ(str) {
  return (str ?? '').replace(/'/g, "\\'");
}

function showNotif(msg, type = 'success') {
  let notif = document.getElementById('notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notif';
    document.body.appendChild(notif);
  }
  notif.textContent  = msg;
  notif.className    = `notif ${type}`;
  notif.style.display = 'block';
  clearTimeout(notif._timer);
  notif._timer = setTimeout(() => { notif.style.display = 'none'; }, 3500);
}

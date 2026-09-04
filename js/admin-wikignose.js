(() => {
  const BUCKET = 'wikignose-pdfs';

  function esc(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function safeName(name) {
    return String(name || 'document.pdf').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(-120) || 'document.pdf';
  }

  function statusLabel(status) {
    return ({ pending: 'En attente', indexing: 'Indexation', indexed: 'Indexé', error: 'Erreur', archived: 'Archivé' })[status] || status || '—';
  }

  async function sha256File(file) {
    if (!globalThis.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function init() {
    const tabs = document.querySelector('.tabs');
    const wrap = document.querySelector('.admin-wrap');
    if (!tabs || !wrap || document.getElementById('tab-wikignose')) return;

    const button = document.createElement('button');
    button.className = 'tab-btn';
    button.type = 'button';
    button.dataset.tab = 'tab-wikignose';
    button.innerHTML = '⌕ Wikignose';
    tabs.appendChild(button);

    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.id = 'tab-wikignose';
    panel.innerHTML = `
      <div class="admin-section">
        <h3>⌕ Outil documentaire Wikignose</h3>
        <p class="empty-msg">Wikignose est un outil annexe hébergé avec La Forêt Enchantée pour mutualiser l’infrastructure. Son interface publique reste séparée de la médiathèque jeunesse ; cet écran prépare les PDF privés destinés à son indexation.</p>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem">
          <a class="btn-primary" style="max-width:220px;text-align:center;text-decoration:none" href="wikignose.html">Ouvrir Wikignose</a>
        </div>
      </div>
      <div class="admin-section">
        <h3>＋ Ajouter des ouvrages</h3>
        <div class="add-audio-grid">
          <div class="form-group" style="grid-column:1/-1"><label for="wg-pdfs">PDF</label><input id="wg-pdfs" type="file" accept="application/pdf,.pdf" multiple><div class="upload-hint">Les fichiers restent privés dans le bucket Wikignose du Supabase commun.</div></div>
          <div class="form-group"><label for="wg-title">Titre <span class="optional">(facultatif)</span></label><input id="wg-title" type="text" placeholder="Détection automatique"></div>
          <div class="form-group"><label for="wg-course">Cours / volume <span class="optional">(facultatif)</span></label><input id="wg-course" type="text" placeholder="Détection automatique"></div>
          <div class="form-group"><label for="wg-school">École <span class="optional">(facultatif)</span></label><input id="wg-school" type="text" placeholder="Détection automatique"></div>
          <div class="form-group"><label for="wg-current">Courant <span class="optional">(facultatif)</span></label><input id="wg-current" type="text" placeholder="Détection automatique"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="wg-masters">Maîtres / auteurs <span class="optional">(facultatif)</span></label><input id="wg-masters" type="text" placeholder="Séparer plusieurs noms par des virgules"></div>
        </div>
        <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-top:1rem"><button id="wg-upload" class="btn-primary" type="button" style="max-width:240px">Envoyer à indexer</button><span id="wg-status" class="empty-msg" role="status" aria-live="polite"></span></div>
      </div>
      <div class="admin-section"><h3>Registre d’ingestion</h3><div id="wg-queue" class="empty-msg">Chargement…</div></div>`;
    wrap.appendChild(panel);

    button.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      button.classList.add('active');
      panel.classList.add('active');
      await loadQueue();
    });

    document.getElementById('wg-upload').addEventListener('click', uploadFiles);
  }

  async function loadQueue() {
    const list = document.getElementById('wg-queue');
    if (!list) return;
    const { data, error } = await dbClient.from('wikignose_pending_documents')
      .select('id,storage_path,original_filename,file_size,status,uploaded_at,title_hint,school_hint,course_hint')
      .order('uploaded_at', { ascending: false }).limit(100);
    if (error) {
      list.textContent = 'Le backend Wikignose n’est pas disponible : ' + error.message;
      return;
    }
    if (!data.length) {
      list.innerHTML = '<p class="empty-msg">Aucun ouvrage enregistré.</p>';
      return;
    }

    list.innerHTML = data.map((item) => {
      const canRemove = ['pending', 'error'].includes(item.status);
      const action = canRemove ? '<button class="btn-sm btn-del" type="button" data-wg-delete>Retirer</button>' : '<span class="row-meta">Conservé</span>';
      return `<div class="admin-row" data-wg-id="${esc(item.id)}"><div><strong class="row-name">${esc(item.title_hint || item.original_filename)}</strong><div class="row-meta">${esc(item.original_filename)} · ${((item.file_size || 0) / 1024 / 1024).toFixed(2)} Mo${item.school_hint ? ' · ' + esc(item.school_hint) : ''}${item.course_hint ? ' · ' + esc(item.course_hint) : ''}</div></div><span class="row-meta">${esc(statusLabel(item.status))} · ${new Date(item.uploaded_at).toLocaleString('fr-FR')}</span><div class="row-actions">${action}</div></div>`;
    }).join('');

    data.forEach((item) => {
      const row = [...list.querySelectorAll('[data-wg-id]')].find((el) => el.dataset.wgId === String(item.id));
      row?.querySelector('[data-wg-delete]')?.addEventListener('click', () => deleteQueuedDocument(item));
    });
  }

  async function deleteQueuedDocument(item) {
    if (!['pending', 'error'].includes(item.status)) {
      document.getElementById('wg-status').textContent = 'Ce document est conservé dans le registre et ne peut pas être retiré avec cette action.';
      return;
    }
    if (!confirm(`Retirer « ${item.title_hint || item.original_filename} » du registre Wikignose ?`)) return;
    const status = document.getElementById('wg-status');
    status.textContent = 'Suppression du registre…';

    const { error: dbError } = await dbClient.from('wikignose_pending_documents').delete().eq('id', item.id);
    if (dbError) {
      status.textContent = 'Suppression refusée : ' + dbError.message;
      return;
    }

    const { error: storageError } = await dbClient.storage.from(BUCKET).remove([item.storage_path]);
    if (storageError) {
      status.textContent = 'Entrée retirée. Le PDF privé n’a pas pu être nettoyé automatiquement : ' + storageError.message;
    } else {
      status.textContent = 'Ouvrage retiré et PDF privé nettoyé.';
    }
    await loadQueue();
  }

  async function uploadFiles() {
    const input = document.getElementById('wg-pdfs');
    const status = document.getElementById('wg-status');
    const button = document.getElementById('wg-upload');
    const files = [...(input?.files || [])];
    if (!files.length) { status.textContent = 'Choisissez au moins un PDF.'; return; }
    const invalid = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalid) { status.textContent = `${invalid.name} n’est pas reconnu comme PDF.`; return; }

    const masters = document.getElementById('wg-masters').value.split(',').map((x) => x.trim()).filter(Boolean);
    const hints = {
      title_hint: document.getElementById('wg-title').value.trim() || null,
      course_hint: document.getElementById('wg-course').value.trim() || null,
      school_hint: document.getElementById('wg-school').value.trim() || null,
      current_hint: document.getElementById('wg-current').value.trim() || null,
      masters_hint: masters.length ? masters : null
    };

    button.disabled = true;
    let done = 0;
    try {
      for (const file of files) {
        status.textContent = `Vérification ${done + 1}/${files.length} : ${file.name}`;
        const sha256 = await sha256File(file);
        if (sha256) {
          const duplicate = await dbClient.from('wikignose_pending_documents')
            .select('id,original_filename,status').eq('sha256', sha256).maybeSingle();
          if (duplicate.error) {
            status.textContent = `Vérification impossible pour ${file.name} : ${duplicate.error.message}`;
            continue;
          }
          if (duplicate.data) {
            status.textContent = `${file.name} est déjà présent dans Wikignose sous le nom « ${duplicate.data.original_filename} » (${statusLabel(duplicate.data.status)}).`;
            continue;
          }
        }

        status.textContent = `Envoi ${done + 1}/${files.length} : ${file.name}`;
        const path = `pending/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}-${safeName(file.name)}`;
        const upload = await dbClient.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (upload.error) { status.textContent = `Échec pour ${file.name} : ${upload.error.message}`; continue; }
        const meta = await dbClient.from('wikignose_pending_documents').insert({ storage_path: path, original_filename: file.name, file_size: file.size, sha256, ...hints });
        if (meta.error) {
          await dbClient.storage.from(BUCKET).remove([path]);
          status.textContent = `Fichier non enregistré dans le registre : ${meta.error.message}`;
          continue;
        }
        done += 1;
      }
      input.value = '';
      status.textContent = `${done} fichier${done > 1 ? 's' : ''} envoyé${done > 1 ? 's' : ''} sur ${files.length}.`;
      await loadQueue();
    } finally {
      button.disabled = false;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();

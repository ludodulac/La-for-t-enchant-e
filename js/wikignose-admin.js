(() => {
  const BUCKET = 'wikignose-pdfs';
  const $ = (id) => document.getElementById(id);

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
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function setStatus(text) { $('wg-status').textContent = text; }

  async function loadQueue() {
    const list = $('wg-queue');
    const { data, error } = await dbClient.from('wikignose_pending_documents')
      .select('id,storage_path,original_filename,file_size,status,uploaded_at,title_hint,school_hint,course_hint,current_hint,masters_hint')
      .order('uploaded_at', { ascending: false }).limit(100);

    if (error) { list.textContent = 'Le registre Wikignose n’est pas disponible : ' + error.message; return; }
    if (!data?.length) { list.innerHTML = '<div class="wg-muted">Aucun ouvrage enregistré.</div>'; return; }

    list.replaceChildren(...data.map((item) => {
      const row = document.createElement('article');
      row.className = 'wg-registry-row';

      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.title_hint || item.original_filename;
      const meta = document.createElement('div');
      meta.className = 'wg-registry-meta';
      const size = ((item.file_size || 0) / 1024 / 1024).toFixed(2);
      const extras = [item.school_hint, item.course_hint, item.current_hint].filter(Boolean).join(' · ');
      meta.textContent = `${item.original_filename} · ${size} Mo${extras ? ' · ' + extras : ''}`;
      info.append(title, meta);

      const status = document.createElement('div');
      status.className = 'wg-registry-meta';
      status.textContent = `${statusLabel(item.status)} · ${new Date(item.uploaded_at).toLocaleString('fr-FR')}`;

      const actions = document.createElement('div');
      if (['pending', 'error'].includes(item.status)) {
        const remove = document.createElement('button');
        remove.className = 'wg-secondary';
        remove.type = 'button';
        remove.textContent = 'Retirer';
        remove.addEventListener('click', () => removeItem(item));
        actions.appendChild(remove);
      } else {
        actions.textContent = 'Conservé';
        actions.className = 'wg-registry-meta';
      }

      row.append(info, status, actions);
      return row;
    }));
  }

  async function removeItem(item) {
    if (!['pending', 'error'].includes(item.status)) return;
    if (!confirm(`Retirer « ${item.title_hint || item.original_filename} » du registre Wikignose ?`)) return;
    setStatus('Suppression du registre…');
    const { error: dbError } = await dbClient.from('wikignose_pending_documents').delete().eq('id', item.id);
    if (dbError) { setStatus('Suppression refusée : ' + dbError.message); return; }
    const { error: storageError } = await dbClient.storage.from(BUCKET).remove([item.storage_path]);
    setStatus(storageError ? 'Entrée retirée, mais le PDF privé n’a pas pu être nettoyé automatiquement.' : 'Ouvrage retiré et PDF privé nettoyé.');
    await loadQueue();
  }

  async function uploadFiles() {
    const input = $('wg-pdfs');
    const button = $('wg-upload');
    const files = [...(input.files || [])];
    if (!files.length) { setStatus('Choisis d’abord un PDF.'); return; }

    const invalid = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalid) { setStatus(`${invalid.name} n’est pas reconnu comme PDF.`); return; }

    const masters = $('wg-masters').value.split(',').map((v) => v.trim()).filter(Boolean);
    const hints = {
      title_hint: $('wg-title').value.trim() || null,
      school_hint: $('wg-school').value.trim() || null,
      course_hint: $('wg-course').value.trim() || null,
      current_hint: $('wg-current').value.trim() || null,
      masters_hint: masters.length ? masters : null
    };

    button.disabled = true;
    let done = 0;
    try {
      for (const file of files) {
        setStatus(`Préparation ${done + 1}/${files.length} : ${file.name}`);
        const sha256 = await sha256File(file);
        if (sha256) {
          const duplicate = await dbClient.from('wikignose_pending_documents')
            .select('original_filename,status').eq('sha256', sha256).maybeSingle();
          if (duplicate.error) { setStatus(`Vérification impossible pour ${file.name} : ${duplicate.error.message}`); continue; }
          if (duplicate.data) { setStatus(`${file.name} est déjà présent sous « ${duplicate.data.original_filename} » (${statusLabel(duplicate.data.status)}).`); continue; }
        }

        const path = `pending/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}-${safeName(file.name)}`;
        const upload = await dbClient.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (upload.error) { setStatus(`Échec d’envoi pour ${file.name} : ${upload.error.message}`); continue; }

        const meta = await dbClient.from('wikignose_pending_documents').insert({
          storage_path: path,
          original_filename: file.name,
          file_size: file.size,
          sha256,
          ...hints
        });
        if (meta.error) {
          await dbClient.storage.from(BUCKET).remove([path]);
          setStatus(`Fichier non enregistré dans le registre : ${meta.error.message}`);
          continue;
        }
        done += 1;
      }
      input.value = '';
      setStatus(`${done} fichier${done > 1 ? 's' : ''} préparé${done > 1 ? 's' : ''} sur ${files.length}.`);
      await loadQueue();
    } finally {
      button.disabled = false;
    }
  }

  async function init() {
    const session = await requireAuth();
    if (!session) return;
    $('wg-auth-gate').hidden = true;
    $('wg-admin-content').hidden = false;
    $('wg-upload').addEventListener('click', uploadFiles);
    $('wg-pdfs').addEventListener('change', () => {
      const file = $('wg-pdfs').files?.[0];
      if (file && !$('wg-title').value.trim()) $('wg-title').value = file.name.replace(/\.pdf$/i, '');
    });
    $('wg-signout').addEventListener('click', async () => {
      await dbClient.auth.signOut();
      location.href = 'wikignose.html';
    });
    await loadQueue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();

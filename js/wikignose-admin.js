(() => {
  const BUCKET = 'wikignose-pdfs';
  const BATCH_SIZE = 10;
  const $ = (id) => document.getElementById(id);

  function safeName(name) {
    return String(name || 'document.pdf').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(-120) || 'document.pdf';
  }

  function statusLabel(status) {
    return ({ pending: 'En attente', indexing: 'Lot en cours', indexed: 'Indexé', error: 'Erreur', archived: 'Archivé' })[status] || status || '—';
  }

  async function sha256File(file) {
    if (!globalThis.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function setStatus(text) { $('wg-status').textContent = text; }

  async function fetchRegistry() {
    const { data, error } = await dbClient.from('wikignose_pending_documents')
      .select('id,storage_path,original_filename,file_size,status,uploaded_at,indexed_at,index_note,title_hint,school_hint,course_hint,current_hint,masters_hint,batch_no,batch_position')
      .order('batch_no', { ascending: true, nullsFirst: false })
      .order('batch_position', { ascending: true, nullsFirst: false })
      .order('uploaded_at', { ascending: true })
      .limit(500);
    if (error) throw error;
    return data || [];
  }

  function groupBatches(items) {
    const groups = new Map();
    items.forEach((item) => {
      const key = item.batch_no || 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }

  function batchState(items) {
    if (items.some((item) => item.status === 'indexing')) return 'En cours';
    if (items.length && items.every((item) => ['indexed', 'archived'].includes(item.status))) return 'Terminé';
    if (items.some((item) => item.status === 'error')) return 'À vérifier';
    return 'En attente';
  }

  function updateSummary(items) {
    const pending = items.filter((i) => i.status === 'pending').length;
    const indexing = items.filter((i) => i.status === 'indexing').length;
    const indexed = items.filter((i) => ['indexed', 'archived'].includes(i.status)).length;
    const batches = new Set(items.map((i) => i.batch_no).filter(Boolean)).size;
    $('wg-summary').textContent = `${items.length} ouvrage${items.length > 1 ? 's' : ''} · ${batches} lot${batches > 1 ? 's' : ''} · ${pending} en attente · ${indexing} en cours · ${indexed} indexé${indexed > 1 ? 's' : ''}`;
  }

  function itemRow(item) {
    const row = document.createElement('article');
    row.className = 'wg-registry-row';

    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.title_hint || item.original_filename;
    const meta = document.createElement('div');
    meta.className = 'wg-registry-meta';
    const size = ((item.file_size || 0) / 1024 / 1024).toFixed(2);
    const extras = [item.school_hint, item.course_hint, item.current_hint].filter(Boolean).join(' · ');
    meta.textContent = `#${item.batch_position || '—'} · ${item.original_filename} · ${size} Mo${extras ? ' · ' + extras : ''}`;
    info.append(title, meta);

    const status = document.createElement('div');
    status.className = 'wg-registry-meta';
    status.textContent = statusLabel(item.status);

    const actions = document.createElement('div');
    if (['pending', 'error'].includes(item.status)) {
      const remove = document.createElement('button');
      remove.className = 'wg-secondary';
      remove.type = 'button';
      remove.textContent = 'Retirer';
      remove.addEventListener('click', () => removeItem(item));
      actions.appendChild(remove);
    } else {
      actions.className = 'wg-registry-meta';
      actions.textContent = 'Conservé';
    }

    row.append(info, status, actions);
    return row;
  }

  function createBatchCard(batchNo, items) {
    const card = document.createElement('section');
    card.className = 'wg-batch-card';

    const heading = document.createElement('div');
    heading.className = 'wg-batch-heading';
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = batchNo ? `Lot ${batchNo}` : 'À classer';
    const meta = document.createElement('p');
    meta.className = 'wg-muted';
    meta.textContent = `${items.length}/${BATCH_SIZE} ouvrages · ${batchState(items)}`;
    copy.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'wg-admin-actions';
    if (batchNo) {
      const copyButton = document.createElement('button');
      copyButton.className = 'wg-secondary';
      copyButton.type = 'button';
      copyButton.textContent = 'Copier le manifeste';
      copyButton.addEventListener('click', () => copyBatchManifest(batchNo, items));
      actions.appendChild(copyButton);

      if (items.some((item) => item.status === 'pending')) {
        const start = document.createElement('button');
        start.className = 'wg-primary';
        start.type = 'button';
        start.textContent = 'Démarrer ce lot';
        start.addEventListener('click', () => setBatchStatus(batchNo, 'indexing'));
        actions.appendChild(start);
      }
      if (items.some((item) => item.status === 'indexing')) {
        const reset = document.createElement('button');
        reset.className = 'wg-secondary';
        reset.type = 'button';
        reset.textContent = 'Remettre en attente';
        reset.addEventListener('click', () => setBatchStatus(batchNo, 'pending'));
        actions.appendChild(reset);
      }
    }
    heading.append(copy, actions);

    const body = document.createElement('div');
    body.className = 'wg-registry';
    body.replaceChildren(...items.map(itemRow));
    card.append(heading, body);
    return card;
  }

  async function loadQueue() {
    const list = $('wg-queue');
    try {
      const data = await fetchRegistry();
      updateSummary(data);
      if (!data.length) {
        list.innerHTML = '<div class="wg-muted">Aucun ouvrage enregistré.</div>';
        return;
      }
      list.replaceChildren(...groupBatches(data).map(([batchNo, items]) => createBatchCard(batchNo, items)));
    } catch (error) {
      list.textContent = 'Le registre Wikignose n’est pas disponible : ' + error.message;
    }
  }

  async function nextBatchSlots(count) {
    const items = await fetchRegistry();
    let maxBatch = 0;
    const occupied = new Map();
    items.forEach((item) => {
      if (!item.batch_no || !item.batch_position) return;
      maxBatch = Math.max(maxBatch, item.batch_no);
      if (!occupied.has(item.batch_no)) occupied.set(item.batch_no, new Set());
      occupied.get(item.batch_no).add(item.batch_position);
    });

    const slots = [];
    let batchNo = maxBatch || 1;
    while (slots.length < count) {
      const used = occupied.get(batchNo) || new Set();
      for (let position = 1; position <= BATCH_SIZE && slots.length < count; position += 1) {
        if (!used.has(position)) {
          slots.push({ batch_no: batchNo, batch_position: position });
          used.add(position);
        }
      }
      occupied.set(batchNo, used);
      if (slots.length < count) batchNo += 1;
    }
    return slots;
  }

  async function setBatchStatus(batchNo, status) {
    setStatus(`Mise à jour du lot ${batchNo}…`);
    const payload = status === 'indexed'
      ? { status, indexed_at: new Date().toISOString() }
      : { status, indexed_at: null };
    const { error } = await dbClient.from('wikignose_pending_documents')
      .update(payload)
      .eq('batch_no', batchNo)
      .in('status', status === 'indexing' ? ['pending', 'error'] : ['indexing']);
    if (error) {
      setStatus(`Impossible de mettre à jour le lot ${batchNo} : ${error.message}`);
      return;
    }
    setStatus(status === 'indexing' ? `Lot ${batchNo} prêt à être traité ici.` : `Lot ${batchNo} remis en attente.`);
    await loadQueue();
  }

  async function copyBatchManifest(batchNo, items) {
    const manifest = {
      wikignose_batch: batchNo,
      count: items.length,
      instruction: `Traite le lot Wikignose ${batchNo} (maximum ${BATCH_SIZE} ouvrages) à partir des PDF privés enregistrés dans le backend, puis mets à jour l'index et le registre.`,
      documents: items.map((item) => ({
        id: item.id,
        position: item.batch_position,
        filename: item.original_filename,
        title: item.title_hint,
        school: item.school_hint,
        course: item.course_hint,
        current: item.current_hint,
        masters: item.masters_hint,
        status: item.status
      }))
    };
    const text = JSON.stringify(manifest, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Manifeste du lot ${batchNo} copié. Colle-le simplement dans cette conversation.`);
    } catch {
      setStatus(`Copie automatique impossible. Le lot ${batchNo} reste prêt dans le registre.`);
    }
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
    if (!files.length) { setStatus('Choisis d’abord un ou plusieurs PDF.'); return; }

    const invalid = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalid) { setStatus(`${invalid.name} n’est pas reconnu comme PDF.`); return; }

    const masters = $('wg-masters').value.split(',').map((v) => v.trim()).filter(Boolean);
    const hints = {
      title_hint: files.length === 1 ? ($('wg-title').value.trim() || null) : null,
      school_hint: $('wg-school').value.trim() || null,
      course_hint: $('wg-course').value.trim() || null,
      current_hint: $('wg-current').value.trim() || null,
      masters_hint: masters.length ? masters : null
    };

    button.disabled = true;
    let done = 0;
    let duplicates = 0;
    try {
      const slots = await nextBatchSlots(files.length);
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const slot = slots[index];
        setStatus(`Préparation ${index + 1}/${files.length} · lot ${slot.batch_no} · ${file.name}`);
        const sha256 = await sha256File(file);
        if (sha256) {
          const duplicate = await dbClient.from('wikignose_pending_documents')
            .select('original_filename,status,batch_no').eq('sha256', sha256).maybeSingle();
          if (duplicate.error) { setStatus(`Vérification impossible pour ${file.name} : ${duplicate.error.message}`); continue; }
          if (duplicate.data) { duplicates += 1; continue; }
        }

        const path = `pending/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}-${safeName(file.name)}`;
        const upload = await dbClient.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
        if (upload.error) { setStatus(`Échec d’envoi pour ${file.name} : ${upload.error.message}`); continue; }

        const meta = await dbClient.from('wikignose_pending_documents').insert({
          storage_path: path,
          original_filename: file.name,
          file_size: file.size,
          sha256,
          batch_no: slot.batch_no,
          batch_position: slot.batch_position,
          title_hint: hints.title_hint || file.name.replace(/\.pdf$/i, ''),
          school_hint: hints.school_hint,
          course_hint: hints.course_hint,
          current_hint: hints.current_hint,
          masters_hint: hints.masters_hint
        });
        if (meta.error) {
          await dbClient.storage.from(BUCKET).remove([path]);
          setStatus(`Fichier non enregistré dans le registre : ${meta.error.message}`);
          continue;
        }
        done += 1;
      }
      input.value = '';
      $('wg-title').value = '';
      setStatus(`${done} fichier${done > 1 ? 's' : ''} ajouté${done > 1 ? 's' : ''}${duplicates ? ` · ${duplicates} doublon${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}` : ''}. Les lots sont prêts par groupes de ${BATCH_SIZE}.`);
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
      const files = [...($('wg-pdfs').files || [])];
      if (files.length === 1 && !$('wg-title').value.trim()) $('wg-title').value = files[0].name.replace(/\.pdf$/i, '');
      if (files.length > 1) $('wg-title').value = '';
      setStatus(`${files.length || 0} PDF sélectionné${files.length > 1 ? 's' : ''}. Ils seront répartis automatiquement par lots de ${BATCH_SIZE}.`);
    });
    $('wg-signout').addEventListener('click', async () => {
      await dbClient.auth.signOut();
      location.href = 'wikignose.html';
    });
    await loadQueue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();

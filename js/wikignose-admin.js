(() => {
  const BUCKET = 'wikignose-pdfs';
  const BATCH_SIZE = 10;
  const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
  const TUS_ENDPOINT = `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`;
  const $ = (id) => document.getElementById(id);

  function safeName(name) {
    return String(name || 'document.pdf').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(-120) || 'document.pdf';
  }

  function statusLabel(status) {
    return ({ pending: 'En attente', indexing: 'Lot en cours', indexed: 'Indexé', error: 'Erreur', archived: 'Archivé' })[status] || status || '—';
  }

  function setStatus(text) { $('wg-status').textContent = text; }

  async function sha256File(file) {
    if (!globalThis.crypto?.subtle) return null;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function fetchRegistry() {
    const { data, error } = await dbClient.from('wikignose_pending_documents')
      .select('id,storage_path,original_filename,file_size,status,uploaded_at,indexed_at,index_note,title_hint,school_hint,course_hint,current_hint,masters_hint,batch_no,batch_position,batch_instruction')
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
    meta.textContent = `#${item.batch_position || '—'} · ${item.original_filename} · ${((item.file_size || 0) / 1024 / 1024).toFixed(2)} Mo`;
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

    const noteWrap = document.createElement('div');
    noteWrap.className = 'wg-batch-note';
    const label = document.createElement('label');
    label.textContent = 'Instructions pour l’IA';
    const textarea = document.createElement('textarea');
    textarea.className = 'wg-input';
    textarea.value = items.find((item) => item.batch_instruction)?.batch_instruction || '';
    textarea.placeholder = 'Ajoute ou corrige ici le contexte de ce lot…';
    const save = document.createElement('button');
    save.className = 'wg-secondary';
    save.type = 'button';
    save.textContent = 'Enregistrer la consigne';
    save.style.marginTop = '8px';
    save.addEventListener('click', () => saveBatchInstruction(batchNo, textarea.value));
    noteWrap.append(label, textarea, save);

    const body = document.createElement('div');
    body.className = 'wg-registry';
    body.replaceChildren(...items.map(itemRow));
    card.append(heading, noteWrap, body);
    return card;
  }

  async function loadQueue() {
    const list = $('wg-queue');
    try {
      const data = await fetchRegistry();
      updateSummary(data);
      if (!data.length) {
        list.innerHTML = '<div class="wg-muted">Aucun ouvrage enregistré.</div>';
        return data;
      }
      list.replaceChildren(...groupBatches(data).map(([batchNo, items]) => createBatchCard(batchNo, items)));
      return data;
    } catch (error) {
      list.textContent = 'Le registre Wikignose n’est pas disponible : ' + error.message;
      throw error;
    }
  }

  async function nextNewBatchNumber() {
    const items = await fetchRegistry();
    return Math.max(0, ...items.map((item) => Number(item.batch_no) || 0)) + 1;
  }

  function buildProgressRows(files) {
    const root = $('wg-upload-progress');
    root.replaceChildren();
    const states = new Map();
    files.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'wg-upload-row';
      const name = document.createElement('strong');
      name.textContent = `${index + 1}. ${file.name}`;
      const state = document.createElement('span');
      state.className = 'wg-upload-state';
      state.textContent = 'En attente';
      row.append(name, state);
      root.appendChild(row);
      states.set(index, state);
    });
    return (index, text, stateName) => {
      const state = states.get(index);
      if (!state) return;
      state.textContent = text;
      state.dataset.state = stateName || '';
    };
  }

  async function tusUpload(file, path, onProgress) {
    if (!globalThis.tus?.Upload) throw new Error('Le module d’upload reprenable n’est pas chargé. Recharge la page.');
    const { data: { session }, error: sessionError } = await dbClient.auth.getSession();
    if (sessionError || !session?.access_token) throw new Error('Session expirée. Reconnecte-toi puis réessaie.');
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: TUS_ENDPOINT,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * 1024 * 1024,
        metadata: { bucketName: BUCKET, objectName: path, contentType: 'application/pdf', cacheControl: '3600' },
        onError: reject,
        onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
        onSuccess: () => resolve()
      });
      upload.findPreviousUploads().then((previous) => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      }).catch(reject);
    });
  }

  async function saveBatchInstruction(batchNo, instruction) {
    if (!batchNo) return;
    const clean = String(instruction || '').trim() || null;
    setStatus(`Enregistrement de la consigne du lot ${batchNo}…`);
    const { error } = await dbClient.from('wikignose_pending_documents').update({ batch_instruction: clean }).eq('batch_no', batchNo);
    if (error) { setStatus(`Impossible d’enregistrer la consigne du lot ${batchNo} : ${error.message}`); return; }
    setStatus(`Consigne du lot ${batchNo} enregistrée.`);
    await loadQueue();
  }

  async function setBatchStatus(batchNo, status) {
    setStatus(`Mise à jour du lot ${batchNo}…`);
    const payload = status === 'indexed' ? { status, indexed_at: new Date().toISOString() } : { status, indexed_at: null };
    const { error } = await dbClient.from('wikignose_pending_documents').update(payload).eq('batch_no', batchNo).in('status', status === 'indexing' ? ['pending', 'error'] : ['indexing']);
    if (error) { setStatus(`Impossible de mettre à jour le lot ${batchNo} : ${error.message}`); return; }
    setStatus(status === 'indexing' ? `Lot ${batchNo} prêt à être traité ici.` : `Lot ${batchNo} remis en attente.`);
    await loadQueue();
  }

  async function copyBatchManifest(batchNo, items) {
    const instruction = items.find((item) => item.batch_instruction)?.batch_instruction || '';
    const manifest = {
      wikignose_batch: batchNo,
      count: items.length,
      ai_instruction: instruction,
      task: `Traite le lot Wikignose ${batchNo} à partir des PDF privés enregistrés dans le backend, en respectant la consigne IA du lot, puis mets à jour l'index et le registre.`,
      documents: items.map((item) => ({ id: item.id, position: item.batch_position, filename: item.original_filename, title: item.title_hint, status: item.status }))
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
      setStatus(`Manifeste du lot ${batchNo} copié avec sa consigne IA.`);
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
    const instruction = $('wg-ai-instruction').value.trim() || null;
    if (!files.length) { setStatus('Choisis d’abord un ou plusieurs PDF.'); return; }
    if (files.length > BATCH_SIZE) { setStatus(`Sélectionne au maximum ${BATCH_SIZE} PDF pour créer un seul lot.`); return; }
    const invalid = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalid) { setStatus(`${invalid.name} n’est pas reconnu comme PDF.`); return; }

    const updateProgress = buildProgressRows(files);
    button.disabled = true;
    input.disabled = true;
    let success = 0;
    let duplicates = 0;
    let failures = 0;
    try {
      const batchNo = await nextNewBatchNumber();
      let nextPosition = 1;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        updateProgress(index, 'Vérification…');
        let sha256 = null;
        try {
          sha256 = await sha256File(file);
          if (sha256) {
            const duplicate = await dbClient.from('wikignose_pending_documents').select('original_filename,status,batch_no').eq('sha256', sha256).maybeSingle();
            if (duplicate.error) throw duplicate.error;
            if (duplicate.data) {
              duplicates += 1;
              updateProgress(index, `Déjà enregistré · lot ${duplicate.data.batch_no || '—'}`, 'duplicate');
              continue;
            }
          }

          const position = nextPosition;
          const path = `pending/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}-${safeName(file.name)}`;
          updateProgress(index, 'Envoi 0 %');
          await tusUpload(file, path, (percent) => updateProgress(index, `Envoi ${percent} %`));
          updateProgress(index, 'PDF envoyé · inscription…');

          const { data: inserted, error: metaError } = await dbClient.from('wikignose_pending_documents').insert({
            storage_path: path,
            original_filename: file.name,
            file_size: file.size,
            sha256,
            batch_no: batchNo,
            batch_position: position,
            batch_instruction: instruction,
            title_hint: file.name.replace(/\.pdf$/i, '')
          }).select('id,batch_no,batch_position,original_filename').single();
          if (metaError || !inserted?.id) {
            await dbClient.storage.from(BUCKET).remove([path]);
            throw metaError || new Error('Le registre n’a pas confirmé le document.');
          }

          success += 1;
          nextPosition += 1;
          updateProgress(index, `Confirmé · lot ${batchNo} · #${position}`, 'ok');
        } catch (error) {
          failures += 1;
          console.error('Wikignose upload failure', file.name, error);
          updateProgress(index, `Échec · ${error?.message || 'erreur inconnue'}`, 'error');
        }
      }

      const registry = await loadQueue();
      const confirmed = registry.filter((item) => item.batch_no === batchNo).length;
      if (success > 0 && confirmed === success && failures === 0) {
        input.value = '';
        $('wg-ai-instruction').value = '';
        setStatus(`Lot ${batchNo} confirmé : ${success} ouvrage${success > 1 ? 's' : ''} enregistré${success > 1 ? 's' : ''}${duplicates ? ` · ${duplicates} doublon${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}` : ''}.`);
      } else if (success > 0) {
        setStatus(`${success} ouvrage${success > 1 ? 's' : ''} confirmé${success > 1 ? 's' : ''}, ${failures} en échec. Ne renvoie que les fichiers en échec : les doublons seront ignorés automatiquement.`);
      } else if (duplicates > 0 && failures === 0) {
        setStatus(`Tous les PDF sélectionnés étaient déjà enregistrés. Aucun doublon n’a été créé.`);
      } else {
        setStatus(`Aucun nouvel ouvrage confirmé. Regarde le détail rouge ci-dessus avant de réessayer.`);
      }
    } finally {
      button.disabled = false;
      input.disabled = false;
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
      buildProgressRows(files);
      setStatus(`${files.length || 0} PDF sélectionné${files.length > 1 ? 's' : ''}. Maximum ${BATCH_SIZE} par lot.`);
    });
    $('wg-signout').addEventListener('click', async () => {
      await dbClient.auth.signOut();
      location.href = 'wikignose.html';
    });
    await loadQueue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();

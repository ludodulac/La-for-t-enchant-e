(() => {
  const BUCKET = 'wikignose-pdfs';
  const MAX_FILES = 10;
  const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
  const TUS_ENDPOINT = `https://${PROJECT_REF}.supabase.co/storage/v1/upload/resumable`;
  const $ = (id) => document.getElementById(id);

  function safeName(name) {
    return String(name || 'document.pdf')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(-120) || 'document.pdf';
  }

  function setStatus(text) {
    const el = $('wg-status');
    if (el) el.textContent = text;
  }

  function makeProgress(files) {
    const root = $('wg-upload-progress');
    if (!root) return () => {};
    root.replaceChildren();
    const states = [];
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
      states.push(state);
    });
    return (index, text, kind = '') => {
      if (!states[index]) return;
      states[index].textContent = text;
      states[index].dataset.state = kind;
    };
  }

  async function getSession() {
    const { data, error } = await dbClient.auth.getSession();
    if (error || !data?.session?.access_token) throw new Error('Session expirée. Reconnecte-toi.');
    return data.session;
  }

  async function nextBatchNo() {
    const { data, error } = await dbClient
      .from('wikignose_pending_documents')
      .select('batch_no')
      .order('batch_no', { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) throw error;
    return (Number(data?.[0]?.batch_no) || 0) + 1;
  }

  async function duplicateByNameAndSize(file) {
    const { data, error } = await dbClient
      .from('wikignose_pending_documents')
      .select('id,batch_no,batch_position,original_filename,file_size,status')
      .eq('original_filename', file.name)
      .eq('file_size', file.size)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function tusUpload(file, path, onProgress) {
    if (!globalThis.tus?.Upload) throw new Error('Module d’envoi indisponible. Recharge la page.');
    const session = await getSession();
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: TUS_ENDPOINT,
        retryDelays: [0, 2000, 5000, 10000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * 1024 * 1024,
        metadata: {
          bucketName: BUCKET,
          objectName: path,
          contentType: 'application/pdf',
          cacheControl: '3600'
        },
        onProgress: (sent, total) => onProgress(Math.max(1, Math.round((sent / total) * 100))),
        onSuccess: resolve,
        onError: reject
      });
      upload.findPreviousUploads()
        .then((previous) => {
          if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        })
        .catch(reject);
    });
  }

  async function verifyStored(path) {
    const parts = path.split('/');
    const filename = parts.pop();
    const folder = parts.join('/');
    const { data, error } = await dbClient.storage.from(BUCKET).list(folder, {
      limit: 10,
      search: filename
    });
    if (error) throw error;
    if (!(data || []).some((item) => item.name === filename)) {
      throw new Error('Le stockage n’a pas confirmé le PDF.');
    }
  }

  async function verifyRegistry(id) {
    const { data, error } = await dbClient
      .from('wikignose_pending_documents')
      .select('id,batch_no,batch_position,storage_path,status')
      .eq('id', id)
      .single();
    if (error || !data?.id) throw error || new Error('Le registre n’a pas confirmé le document.');
    return data;
  }

  async function refreshQueue() {
    if (typeof window.__wikignoseReloadQueue === 'function') {
      await window.__wikignoseReloadQueue();
      return;
    }
    location.reload();
  }

  async function safeUpload(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const input = $('wg-pdfs');
    const button = $('wg-upload');
    const instruction = $('wg-ai-instruction')?.value.trim() || null;
    const files = [...(input?.files || [])];

    if (!files.length) return setStatus('Choisis d’abord un ou plusieurs PDF.');
    if (files.length > MAX_FILES) return setStatus(`Maximum ${MAX_FILES} PDF par lot.`);
    const invalid = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalid) return setStatus(`${invalid.name} n’est pas reconnu comme PDF.`);

    const progress = makeProgress(files);
    button.disabled = true;
    input.disabled = true;
    let success = 0;
    let duplicateCount = 0;
    let failed = 0;
    let batchNo = null;

    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    addEventListener('beforeunload', beforeUnload);

    try {
      batchNo = await nextBatchNo();
      let position = 1;

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        try {
          progress(i, 'Vérification…');
          const duplicate = await duplicateByNameAndSize(file);
          if (duplicate) {
            duplicateCount += 1;
            progress(i, `Déjà enregistré · lot ${duplicate.batch_no || '—'}`, 'duplicate');
            continue;
          }

          const path = `pending/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}-${safeName(file.name)}`;
          progress(i, 'Envoi 1 %');
          await tusUpload(file, path, (percent) => progress(i, `Envoi ${percent} %`));

          progress(i, 'Vérification du stockage…');
          await verifyStored(path);

          progress(i, 'Inscription au registre…');
          const { data: inserted, error: insertError } = await dbClient
            .from('wikignose_pending_documents')
            .insert({
              storage_path: path,
              original_filename: file.name,
              file_size: file.size,
              sha256: null,
              batch_no: batchNo,
              batch_position: position,
              batch_instruction: instruction,
              title_hint: file.name.replace(/\.pdf$/i, ''),
              status: 'pending'
            })
            .select('id')
            .single();

          if (insertError || !inserted?.id) {
            await dbClient.storage.from(BUCKET).remove([path]);
            throw insertError || new Error('Échec de l’inscription au registre.');
          }

          await verifyRegistry(inserted.id);
          success += 1;
          progress(i, `ENREGISTRÉ · lot ${batchNo} · #${position}`, 'ok');
          position += 1;
        } catch (error) {
          failed += 1;
          console.error('Wikignose safe upload failure', file.name, error);
          progress(i, `ÉCHEC · ${error?.message || 'erreur réseau'}`, 'error');
        }
      }

      if (success === files.length) {
        setStatus(`Lot ${batchNo} enregistré et vérifié dans Supabase : ${success}/${files.length} PDF.`);
        input.value = '';
        if ($('wg-ai-instruction')) $('wg-ai-instruction').value = '';
        setTimeout(() => location.reload(), 600);
      } else if (success > 0) {
        setStatus(`${success}/${files.length} PDF réellement enregistrés · ${failed} échec(s) · ${duplicateCount} doublon(s).`);
      } else if (duplicateCount === files.length) {
        setStatus('Tous ces PDF sont déjà enregistrés. Aucun doublon créé.');
      } else {
        setStatus('Aucun PDF enregistré. Le détail de l’échec reste affiché ci-dessus.');
      }
    } catch (error) {
      console.error('Wikignose batch failure', error);
      setStatus(`Échec du lot : ${error?.message || 'erreur inconnue'}`);
    } finally {
      removeEventListener('beforeunload', beforeUnload);
      button.disabled = false;
      input.disabled = false;
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('#wg-upload');
    if (!button) return;
    safeUpload(event);
  }, true);
})();
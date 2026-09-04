function initAdminUx() {
  const search = document.getElementById('admin-global-search');
  if (search && !search.dataset.ready) {
    search.dataset.ready = 'true';
    search.addEventListener('input', () => {
      const needle = search.value.trim().toLocaleLowerCase('fr');
      document.querySelectorAll('.admin-row').forEach(row => {
        const matches = !needle || row.textContent.toLocaleLowerCase('fr').includes(needle);
        row.hidden = !matches;
      });
    });
  }

  const addAudio = document.getElementById('form-add-audio');
  const shortcut = document.querySelector('[data-action="new-audio"]');
  if (shortcut && !shortcut.dataset.ready) {
    shortcut.dataset.ready = 'true';
    shortcut.addEventListener('click', () => {
      document.querySelector('[data-tab="tab-audios"]')?.click();
      addAudio?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      document.getElementById('audio-title-in')?.focus();
    });
  }

  // Safety override: keep referenced Storage files intact if the database delete fails.
  window.deleteAudio = async function safeDeleteAudio(id, imagePath, audioPath) {
    if (!confirm('Supprimer cet audio définitivement ?')) return;

    const { error } = await dbClient.from('audios').delete().eq('id', id);
    if (error) return showNotif('Erreur : ' + error.message, 'error');

    const cleanups = [];
    if (imagePath && imagePath !== 'undefined') cleanups.push(dbClient.storage.from('images').remove([imagePath]));
    if (audioPath && audioPath !== 'undefined') cleanups.push(dbClient.storage.from('audios').remove([audioPath]));
    if (cleanups.length) {
      const results = await Promise.allSettled(cleanups);
      if (results.some(result => result.status === 'rejected' || result.value?.error)) {
        console.warn('Un fichier Storage n’a pas pu être nettoyé après suppression de la ligne audio.');
      }
    }

    showNotif('Audio supprimé');
    await refreshData();
    renderAll();
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminUx, { once: true });
else initAdminUx();

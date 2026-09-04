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
      addAudio?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
      document.getElementById('audio-title-in')?.focus();
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminUx, { once: true });
else initAdminUx();

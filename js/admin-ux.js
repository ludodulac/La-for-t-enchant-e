document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('admin-global-search');
  if (search) {
    search.addEventListener('input', () => {
      const needle = search.value.trim().toLocaleLowerCase('fr');
      document.querySelectorAll('.admin-row').forEach(row => {
        const matches = !needle || row.textContent.toLocaleLowerCase('fr').includes(needle);
        row.hidden = !matches;
      });
    });
  }

  const addAudio = document.getElementById('form-add-audio');
  document.querySelector('[data-action="new-audio"]')?.addEventListener('click', () => {
    document.querySelector('[data-tab="tab-audios"]')?.click();
    addAudio?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    document.getElementById('audio-title-in')?.focus();
  });
});

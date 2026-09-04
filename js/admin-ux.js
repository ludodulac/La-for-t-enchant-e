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

  const observer = new MutationObserver(() => {
    const audioStat = document.getElementById('stat-audios');
    const catStat = document.getElementById('stat-cats');
    if (audioStat && typeof audios !== 'undefined') audioStat.textContent = audios.length;
    if (catStat && typeof categories !== 'undefined') catStat.textContent = categories.length;
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

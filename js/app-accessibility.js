(() => {
  function enhance() {
    document.querySelectorAll('.nav-button[data-view]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });

    document.querySelectorAll('.media-card[data-id], .media-row[data-id]').forEach((item) => {
      item.setAttribute('role', 'link');
      const title = item.querySelector('.media-title, .row-title')?.textContent?.trim();
      if (title) item.setAttribute('aria-label', `Ouvrir ${title}`);
      if (item.dataset.a11yReady) return;
      item.dataset.a11yReady = 'true';
      item.addEventListener('keydown', (event) => {
        if (event.target.closest('button, a, input, select, textarea')) return;
        if (event.key === ' ') {
          event.preventDefault();
          location.href = `audio.html?id=${encodeURIComponent(item.dataset.id)}`;
        }
      });
    });
  }

  const originalRender = window.render;
  if (typeof originalRender === 'function') {
    window.render = function enhancedRender(...args) {
      const result = originalRender.apply(this, args);
      enhance();
      return result;
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();

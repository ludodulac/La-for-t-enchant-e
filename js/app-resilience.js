// Preserve a real loading error instead of replacing it with an empty-library state.
(() => {
  if (typeof loadData !== 'function' || typeof render !== 'function') return;

  let loadFailed = false;
  const originalLoadData = loadData;
  const originalRender = render;

  loadData = async function resilientLoadData(...args) {
    loadFailed = false;
    await originalLoadData(...args);
    const main = document.getElementById('main-content');
    loadFailed = Boolean(main?.textContent?.includes('Impossible de charger la bibliothèque'));
  };

  function polishRenderedChildContent() {
    if (!document.body.classList.contains('child-experience')) return;

    // Legacy list/empty-state colors were designed for the former light theme.
    // Keep those reused renderers readable inside the current navy child shell.
    document.querySelectorAll('.media-row .row-title').forEach(node => { node.style.color = '#fffdf8'; });
    document.querySelectorAll('.media-row .row-sub, .media-row .row-duration').forEach(node => { node.style.color = '#b8bdd0'; });
    document.querySelectorAll('.empty-state strong').forEach(node => { node.style.color = '#fffdf8'; });
    document.querySelectorAll('.empty-state span').forEach(node => { node.style.color = '#b8bdd0'; });
  }

  render = function resilientRender(...args) {
    if (loadFailed) return;
    const result = originalRender(...args);
    requestAnimationFrame(polishRenderedChildContent);
    return result;
  };

  function resetMainScroll() {
    // Views are swapped in-place, so the browser otherwise preserves the old page offset.
    // A newly selected section must start at its beginning on desktop and mobile.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.scrollingElement?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      document.querySelector('.main-surface')?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    });
  }

  document.addEventListener('click', event => {
    const navigation = event.target.closest(
      '.nav-button, .child-nav-button, [data-go-view], [data-child-category], [data-all-stories], .profile-choice.child'
    );
    if (navigation) resetMainScroll();
  });

  window.addEventListener('forest:profile-updated', polishRenderedChildContent);
  document.addEventListener('DOMContentLoaded', polishRenderedChildContent);
})();

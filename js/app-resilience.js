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

  render = function resilientRender(...args) {
    if (loadFailed) return;
    return originalRender(...args);
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
})();

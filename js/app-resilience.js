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
})();

// Small UI-only corrections for the child shell. Keep behavior separate from app/player logic.
(() => {
  function placeStatusInHeader() {
    const status = document.getElementById('child-control-status');
    const actions = document.querySelector('.child-actions');
    if (!status || !actions || status.parentElement === actions) return;
    actions.prepend(status);
  }

  document.addEventListener('DOMContentLoaded', () => {
    placeStatusInHeader();
    const observer = new MutationObserver(placeStatusInHeader);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

// Small UI-only corrections for the child shell. Keep behavior separate from app/player logic.
(() => {
  function placeStatusInHeader() {
    const status = document.getElementById('child-control-status');
    const actions = document.querySelector('.child-actions');
    if (!status || !actions || status.parentElement === actions) return;
    actions.prepend(status);
  }

  function ensureAdministrationFooter() {
    const surface = document.querySelector('.main-surface');
    if (!surface || surface.querySelector('.public-admin-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'public-admin-footer';
    footer.innerHTML = '<a href="login.html">Administration</a>';
    surface.appendChild(footer);
  }

  document.addEventListener('DOMContentLoaded', () => {
    placeStatusInHeader();
    ensureAdministrationFooter();
    const observer = new MutationObserver(() => {
      placeStatusInHeader();
      ensureAdministrationFooter();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

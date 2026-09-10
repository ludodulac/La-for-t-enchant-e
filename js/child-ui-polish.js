// Small UI-only corrections for the child shell. Keep behavior separate from app/player logic.
(() => {
  function placeStatusInHeader() {
    const status = document.getElementById('child-control-status');
    const actions = document.querySelector('.child-actions');
    if (!status || !actions || status.parentElement === actions) return;
    actions.prepend(status);
  }

  function ensurePublicFooter() {
    const surface = document.querySelector('.main-surface');
    if (!surface || surface.querySelector('.public-admin-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'public-admin-footer';
    footer.setAttribute('aria-label', 'Liens secondaires');
    footer.innerHTML = '<a href="blog.html">Blog</a><span aria-hidden="true">·</span><a href="login.html">Administration</a>';
    surface.appendChild(footer);
  }

  function ensurePublicFooterStyle() {
    if (document.getElementById('public-admin-footer-style')) return;
    const style = document.createElement('style');
    style.id = 'public-admin-footer-style';
    style.textContent = `
      body.child-experience footer.public-admin-footer{display:flex!important;justify-content:center!important;align-items:center!important;gap:9px!important;margin:56px 0 8px!important;padding:22px 16px!important;border-top:1px solid rgba(255,255,255,.06)!important;background:transparent!important;color:#626a87!important}
      body.child-experience footer.public-admin-footer a{font-size:.72rem!important;font-weight:700!important;letter-spacing:.02em!important;color:#7f87a4!important;text-decoration:none!important;opacity:.82!important}
      body.child-experience footer.public-admin-footer a:hover,body.child-experience footer.public-admin-footer a:focus-visible{color:#c7ccdd!important;opacity:1!important;text-decoration:underline!important;text-underline-offset:3px!important}
      body.child-experience footer.public-admin-footer span{font-size:.68rem!important;opacity:.65!important}
      @media(max-width:800px){body.child-experience footer.public-admin-footer{margin:34px 0 74px!important;padding:18px 12px!important}body.child-experience footer.public-admin-footer a{font-size:.68rem!important}}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    placeStatusInHeader();
    ensurePublicFooterStyle();
    ensurePublicFooter();
    const observer = new MutationObserver(() => {
      placeStatusInHeader();
      ensurePublicFooter();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

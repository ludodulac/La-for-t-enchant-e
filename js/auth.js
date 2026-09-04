async function signIn(email, password) {
  const { data, error } = await dbClient.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signOut() {
  await dbClient.auth.signOut();
  window.location.href = 'index.html';
}

async function getSession() {
  const { data } = await dbClient.auth.getSession();
  return data?.session ?? null;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: isAdmin, error } = await dbClient.rpc('is_app_admin');
  if (error || isAdmin !== true) {
    console.warn('Accès administration refusé', error || 'Compte non autorisé');
    await dbClient.auth.signOut();
    window.location.href = 'login.html?unauthorized=1';
    return null;
  }
  return session;
}

// Enhancement layer for the administration page only.
if (location.pathname.endsWith('/admin.html') || location.pathname.endsWith('admin.html')) {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'css/admin-2026.css';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.querySelector('.admin-wrap');
    if (wrap && !document.querySelector('.admin-intro')) {
      const intro = document.createElement('section');
      intro.className = 'admin-intro';
      intro.innerHTML = `
        <div>
          <div class="eyebrow">Studio de publication</div>
          <h1>Gérer La Forêt Enchantée</h1>
          <p>Histoires, journal, catégories et recherche documentaire sont réunis dans le même back-office.</p>
        </div>
        <div class="admin-search">
          <input id="admin-global-search" type="search" placeholder="Filtrer les éléments affichés…" aria-label="Filtrer les contenus de l’administration">
          <button type="button" class="btn-primary" data-action="new-audio" style="margin-top:8px;width:100%">＋ Nouvelle histoire</button>
        </div>`;
      wrap.prepend(intro);
    }

    const ux = document.createElement('script');
    ux.src = 'js/admin-ux.js';
    document.body.appendChild(ux);

    const wikignose = document.createElement('script');
    wikignose.src = 'js/admin-wikignose.js';
    document.body.appendChild(wikignose);
  });
}

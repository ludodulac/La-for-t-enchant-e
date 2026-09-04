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

const isAdminPage = location.pathname.endsWith('/admin.html') || location.pathname.endsWith('admin.html');

if (isAdminPage) {
  document.documentElement.classList.add('admin-auth-pending');
  const gateStyle = document.createElement('style');
  gateStyle.textContent = '.admin-auth-pending body{visibility:hidden}';
  document.head.appendChild(gateStyle);

  // Promise partagée par les extensions du back-office.
  window.adminSessionPromise = requireAuth();

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'css/admin-2026.css';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.adminSessionPromise;
    if (!session) return;

    document.documentElement.classList.remove('admin-auth-pending');
    const wrap = document.querySelector('.admin-wrap');
    if (wrap && !document.querySelector('.admin-intro')) {
      const intro = document.createElement('section');
      intro.className = 'admin-intro';
      intro.innerHTML = `
        <div>
          <div class="eyebrow">Studio de publication</div>
          <h1>Gérer La Forêt Enchantée</h1>
          <p>Histoires, journal et catégories sont réunis ici. L’outil documentaire Wikignose partage ce back-office sans faire partie de l’expérience jeunesse publique.</p>
        </div>
        <div class="admin-search">
          <input id="admin-global-search" type="search" placeholder="Filtrer les éléments affichés…" aria-label="Filtrer les contenus de l’administration">
          <button type="button" class="btn-primary" data-action="new-audio" style="margin-top:8px;width:100%">＋ Nouvelle histoire</button>
        </div>`;
      wrap.prepend(intro);
    }

    for (const src of ['js/admin-ux.js', 'js/admin-blog-safety.js', 'js/admin-wikignose.js']) {
      const script = document.createElement('script');
      script.src = src;
      document.body.appendChild(script);
    }
  });
}

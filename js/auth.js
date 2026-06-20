// ============================================================
// auth.js — Gestion de l'authentification administrateur
// ============================================================

/**
 * Connecte l'administrateur avec email + mot de passe.
 * @param {string} email
 * @param {string} password
 * @returns {object} { data, error }
 */
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Déconnecte l'administrateur.
 */
async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

/**
 * Retourne la session active ou null.
 */
async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

/**
 * Protège une page admin : redirige vers login.html si non connecté.
 */
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
  }
  return session;
}

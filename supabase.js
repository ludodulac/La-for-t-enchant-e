// ============================================================
// supabase.js — Initialisation du client Supabase
// ============================================================
// Remplacez les valeurs ci-dessous par vos propres clés Supabase
// (Paramètres du projet > API dans le tableau de bord Supabase)
// ============================================================

const SUPABASE_URL = 'https://jwyayfkssyagvnablttg.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';

// Initialisation du client Supabase (SDK v2 via CDN)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL de base pour les fichiers stockés dans Supabase Storage
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public`;

/**
 * Retourne l'URL publique d'un fichier dans un bucket donné.
 * @param {string} bucket - Nom du bucket ('images' ou 'audios')
 * @param {string} path   - Chemin du fichier dans le bucket
 */
function getPublicUrl(bucket, path) {
  return `${STORAGE_URL}/${bucket}/${path}`;
}

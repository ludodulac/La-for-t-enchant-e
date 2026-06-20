-- ============================================================
-- La Forêt Enchantée — Script SQL Supabase
-- Copiez et exécutez ce script dans :
-- Supabase Dashboard > SQL Editor > New query
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. TABLES
-- ════════════════════════════════════════════════════════════

-- ── Catégories principales ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sous-catégories ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subcategories (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, category_id)
);

-- ── Audios ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audios (
  id             BIGSERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  image_path     TEXT,           -- chemin dans le bucket 'images'
  audio_path     TEXT NOT NULL,  -- chemin dans le bucket 'audios'
  category_id    BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id BIGINT REFERENCES public.subcategories(id) ON DELETE SET NULL,
  duration       INTEGER,        -- durée en secondes
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index de recherche sur le titre
CREATE INDEX IF NOT EXISTS audios_title_idx ON public.audios USING gin(to_tsvector('french', title));


-- ════════════════════════════════════════════════════════════
-- 2. DONNÉES INITIALES (catégories de base)
-- ════════════════════════════════════════════════════════════

INSERT INTO public.categories (name) VALUES
  ('Contes traditionnels'),
  ('Contes esséniens'),
  ('Histoires inspirantes'),
  ('Relaxation et méditation'),
  ('Comptines')
ON CONFLICT (name) DO NOTHING;

-- Sous-catégories pour "Contes traditionnels"
INSERT INTO public.subcategories (name, category_id)
SELECT name, c.id
FROM (VALUES
  ('Contes de Grimm'),
  ('Contes du monde entier'),
  ('Contes d''Andersen'),
  ('Légendes populaires')
) AS t(name)
JOIN public.categories c ON c.name = 'Contes traditionnels'
ON CONFLICT DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- 3. POLITIQUES RLS (Row Level Security)
-- ════════════════════════════════════════════════════════════

-- ── Activer RLS sur toutes les tables ────────────────────────
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audios        ENABLE ROW LEVEL SECURITY;

-- ── CATÉGORIES ───────────────────────────────────────────────

-- Lecture publique (visiteurs)
CREATE POLICY "categories_read_public"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Écriture : uniquement les utilisateurs authentifiés (admin)
CREATE POLICY "categories_write_auth"
  ON public.categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── SOUS-CATÉGORIES ──────────────────────────────────────────

CREATE POLICY "subcategories_read_public"
  ON public.subcategories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "subcategories_write_auth"
  ON public.subcategories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── AUDIOS ───────────────────────────────────────────────────

CREATE POLICY "audios_read_public"
  ON public.audios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "audios_write_auth"
  ON public.audios FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ════════════════════════════════════════════════════════════
-- 4. STORAGE — Buckets
-- ════════════════════════════════════════════════════════════
-- Ces commandes créent les buckets via l'API Storage de Supabase.
-- Vous pouvez aussi les créer manuellement dans :
-- Dashboard > Storage > New bucket

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('images', 'images', true),
  ('audios', 'audios', true)
ON CONFLICT (id) DO NOTHING;

-- ── Politiques Storage ────────────────────────────────────────

-- Lecture publique des images
CREATE POLICY "images_read_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');

-- Upload images : admin uniquement
CREATE POLICY "images_write_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "images_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images');

CREATE POLICY "images_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');

-- Lecture publique des audios
CREATE POLICY "audios_read_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'audios');

-- Upload audios : admin uniquement
CREATE POLICY "audios_write_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audios');

CREATE POLICY "audios_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audios');

CREATE POLICY "audios_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'audios');


-- ════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- ════════════════════════════════════════════════════════════
-- Vérification : vous devriez voir 3 tables dans
-- Database > Tables : categories, subcategories, audios
-- Et 2 buckets dans Storage : images, audios
-- ════════════════════════════════════════════════════════════

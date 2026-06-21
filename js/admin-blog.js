// ============================================================
// admin-blog.js — Gestion du blog avec upload images inline
// ============================================================

let articles   = [];
let quillNew   = null;
let quillEdit  = null;

document.addEventListener('DOMContentLoaded', () => {
  quillNew  = initQuill('#quill-editor');
  quillEdit = initQuill('#quill-editor-edit');
  loadArticles();
  setupBlogForms();
});

// ── Initialisation Quill avec upload image ───────────────────
function initQuill(selector) {
  const quill = new Quill(selector, {
    theme: 'snow',
    placeholder: 'Rédigez votre article ici…',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'link', 'image'],
          ['clean']
        ],
        handlers: {
          image: () => handleImageInsert(quill)
        }
      }
    }
  });
  return quill;
}

// ── Handler upload image inline ──────────────────────────────
function handleImageInsert(quill) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.click();

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    showNotif('Upload image en cours…', 'success');

    const ext  = file.name.split('.').pop();
    const path = `inline/${Date.now()}.${ext}`;

    const { error } = await dbClient.storage.from('blog-images').upload(path, file);
    if (error) { showNotif('Erreur upload : ' + error.message, 'error'); return; }

    const url = getPublicUrl('blog-images', path);

    // Insérer l'image à la position du curseur
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', url);
    quill.setSelection(range.index + 1);

    showNotif('Image insérée ✓');
  });
}

// ── Chargement articles ──────────────────────────────────────
async function loadArticles() {
  const { data, error } = await dbClient
    .from('articles')
    .select('id, title, category, published, published_at, created_at, cover_path')
    .order('created_at', { ascending: false });

  articles = data ?? [];
  renderArticleList();
  updateArticleStat();
}

function updateArticleStat() {
  const el = document.getElementById('stat-articles');
  if (el) el.textContent = articles.length;
}

// ── Liste articles admin ─────────────────────────────────────
function renderArticleList() {
  const list = document.getElementById('article-list-admin');
  if (!list) return;
  list.innerHTML = '';

  if (articles.length === 0) {
    list.innerHTML = '<p class="empty-msg">Aucun article encore.</p>';
    return;
  }

  articles.forEach(art => {
    const row  = document.createElement('div');
    row.className = 'blog-admin-row';
    const date = art.published_at
      ? new Date(art.published_at).toLocaleDateString('fr-FR')
      : new Date(art.created_at).toLocaleDateString('fr-FR');

    row.innerHTML = `
      <span class="blog-status ${art.published ? 'published' : 'draft'}">
        ${art.published ? '● Publié' : '○ Brouillon'}
      </span>
      <span class="row-name">${art.title}</span>
      <span class="row-meta">${art.category ?? ''} · ${date}</span>
      <div class="row-actions">
        <button class="btn-sm btn-edit" onclick="openEditArticle(${art.id})">Modifier</button>
        <button class="btn-sm btn-del"  onclick="deleteArticle(${art.id}, '${escQ(art.cover_path ?? '')}')">Supprimer</button>
      </div>
    `;
    list.appendChild(row);
  });
}

// ── Formulaires ──────────────────────────────────────────────
function setupBlogForms() {

  document.getElementById('form-add-article')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-add-article');
    btn.disabled = true; btn.textContent = 'Envoi…';

    try {
      const title     = document.getElementById('article-title').value.trim();
      const excerpt   = document.getElementById('article-excerpt').value.trim();
      const category  = document.getElementById('article-category').value.trim();
      const published = document.getElementById('article-published').checked;
      const coverFile = document.getElementById('article-cover').files[0];
      const content   = quillNew.root.innerHTML;

      if (!title) { showNotif('Titre requis.', 'error'); return; }

      let coverPath = null;
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        coverPath = `covers/${Date.now()}-${slugify(title)}.${ext}`;
        const { error } = await dbClient.storage.from('blog-images').upload(coverPath, coverFile);
        if (error) throw error;
      }

      const { error: dbErr } = await dbClient.from('articles').insert({
        title,
        excerpt:      excerpt || null,
        category:     category || null,
        content,
        cover_path:   coverPath,
        published,
        published_at: published ? new Date().toISOString() : null,
      });

      if (dbErr) throw dbErr;

      showNotif('Article enregistré ✓');
      e.target.reset();
      quillNew.setContents([]);
      await loadArticles();

    } catch(err) {
      showNotif('Erreur : ' + (err.message ?? err), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = "Enregistrer l'article";
    }
  });

  document.getElementById('form-edit-article')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id        = parseInt(document.getElementById('edit-article-id').value, 10);
    const title     = document.getElementById('edit-article-title').value.trim();
    const excerpt   = document.getElementById('edit-article-excerpt').value.trim();
    const category  = document.getElementById('edit-article-category').value.trim();
    const published = document.getElementById('edit-article-published').checked;
    const coverFile = document.getElementById('edit-article-cover').files[0];
    const content   = quillEdit.root.innerHTML;

    if (!title) return showNotif('Titre requis.', 'error');

    try {
      const art = articles.find(a => a.id === id);
      let coverPath = art?.cover_path ?? null;

      if (coverFile) {
        if (coverPath) await dbClient.storage.from('blog-images').remove([coverPath]);
        const ext = coverFile.name.split('.').pop();
        coverPath = `covers/${Date.now()}-${slugify(title)}.${ext}`;
        const { error } = await dbClient.storage.from('blog-images').upload(coverPath, coverFile);
        if (error) throw error;
      }

      const { error: dbErr } = await dbClient.from('articles').update({
        title,
        excerpt:      excerpt || null,
        category:     category || null,
        content,
        cover_path:   coverPath,
        published,
        published_at: published ? (art?.published_at ?? new Date().toISOString()) : null,
      }).eq('id', id);

      if (dbErr) throw dbErr;

      showNotif('Article modifié ✓');
      document.getElementById('edit-article-panel').style.display = 'none';
      await loadArticles();

    } catch(err) {
      showNotif('Erreur : ' + (err.message ?? err), 'error');
    }
  });

  document.getElementById('btn-cancel-article-edit')?.addEventListener('click', () => {
    document.getElementById('edit-article-panel').style.display = 'none';
  });
}

// ── Ouvrir modification ──────────────────────────────────────
async function openEditArticle(id) {
  const { data: art } = await dbClient.from('articles').select('*').eq('id', id).single();
  if (!art) return;

  document.getElementById('edit-article-panel').style.display = 'block';
  document.getElementById('edit-article-id').value         = art.id;
  document.getElementById('edit-article-title').value      = art.title;
  document.getElementById('edit-article-excerpt').value    = art.excerpt ?? '';
  document.getElementById('edit-article-category').value   = art.category ?? '';
  document.getElementById('edit-article-published').checked = art.published ?? false;
  quillEdit.root.innerHTML = art.content ?? '';

  document.getElementById('edit-article-panel').scrollIntoView({ behavior: 'smooth' });
}

// ── Supprimer ────────────────────────────────────────────────
async function deleteArticle(id, coverPath) {
  if (!confirm('Supprimer cet article définitivement ?')) return;
  if (coverPath) await dbClient.storage.from('blog-images').remove([coverPath]);
  const { error } = await dbClient.from('articles').delete().eq('id', id);
  if (error) return showNotif('Erreur : ' + error.message, 'error');
  showNotif('Article supprimé');
  await loadArticles();
}

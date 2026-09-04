// Safety layer for blog media lifecycle.
// Loaded after admin-blog.js; capture listeners run before legacy submit handlers.
(() => {
  const BLOG_BUCKET = 'blog-images';

  async function removePaths(paths) {
    const clean = [...new Set(paths.filter(Boolean))];
    if (!clean.length) return;
    const { error } = await dbClient.storage.from(BLOG_BUCKET).remove(clean);
    if (error) console.warn('Nettoyage blog-images incomplet', error);
  }

  async function uploadCover(file, title) {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `covers/${Date.now()}-${slugify(title)}.${ext}`;
    const { error } = await dbClient.storage.from(BLOG_BUCKET).upload(path, file);
    if (error) throw error;
    return path;
  }

  function bindSafeAdd() {
    const form = document.getElementById('form-add-article');
    if (!form || form.dataset.safeBlogAdd) return;
    form.dataset.safeBlogAdd = 'true';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const btn = document.getElementById('btn-add-article');
      btn.disabled = true;
      btn.textContent = 'Envoi…';
      let uploadedCover = null;

      try {
        const title = document.getElementById('article-title').value.trim();
        const excerpt = document.getElementById('article-excerpt').value.trim();
        const category = document.getElementById('article-category-sel').value;
        const published = document.getElementById('article-published').checked;
        const coverFile = document.getElementById('article-cover').files[0];
        const content = quillNew.root.innerHTML;
        if (!title) return showNotif('Titre requis.', 'error');

        uploadedCover = await uploadCover(coverFile, title);
        const { error } = await dbClient.from('articles').insert({
          title,
          excerpt: excerpt || null,
          category: category || null,
          content,
          cover_path: uploadedCover,
          published,
          published_at: published ? new Date().toISOString() : null,
        });
        if (error) throw error;

        uploadedCover = null;
        showNotif('Article enregistré ✓');
        form.reset();
        quillNew.setContents([]);
        await loadArticles();
      } catch (error) {
        if (uploadedCover) await removePaths([uploadedCover]);
        showNotif('Erreur : ' + (error.message ?? error), 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = "Enregistrer l'article";
      }
    }, true);
  }

  function bindSafeEdit() {
    const form = document.getElementById('form-edit-article');
    if (!form || form.dataset.safeBlogEdit) return;
    form.dataset.safeBlogEdit = 'true';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const id = parseInt(document.getElementById('edit-article-id').value, 10);
      const title = document.getElementById('edit-article-title').value.trim();
      const excerpt = document.getElementById('edit-article-excerpt').value.trim();
      const category = document.getElementById('edit-article-category-sel').value;
      const published = document.getElementById('edit-article-published').checked;
      const coverFile = document.getElementById('edit-article-cover').files[0];
      const content = quillEdit.root.innerHTML;
      if (!title) return showNotif('Titre requis.', 'error');

      const art = articles.find(article => article.id === id);
      if (!art) return showNotif('Article introuvable.', 'error');

      const previousCover = art.cover_path || null;
      let newCover = null;

      try {
        newCover = await uploadCover(coverFile, title);
        const nextCover = newCover || previousCover;
        const { error } = await dbClient.from('articles').update({
          title,
          excerpt: excerpt || null,
          category: category || null,
          content,
          cover_path: nextCover,
          published,
          published_at: published ? (art.published_at ?? new Date().toISOString()) : null,
        }).eq('id', id);
        if (error) throw error;

        if (newCover && previousCover && previousCover !== newCover) {
          await removePaths([previousCover]);
        }
        newCover = null;
        showNotif('Article modifié ✓');
        document.getElementById('edit-article-panel').style.display = 'none';
        form.reset();
        await loadArticles();
      } catch (error) {
        if (newCover) await removePaths([newCover]);
        showNotif('Erreur : ' + (error.message ?? error), 'error');
      }
    }, true);
  }

  // Database first, storage cleanup second. This preserves referenced media on DB failure.
  window.deleteArticle = async function safeDeleteArticle(id, coverPath) {
    if (!confirm('Supprimer cet article définitivement ?')) return;
    const { error } = await dbClient.from('articles').delete().eq('id', id);
    if (error) return showNotif('Erreur : ' + error.message, 'error');
    if (coverPath) await removePaths([coverPath]);
    showNotif('Article supprimé');
    await loadArticles();
  };

  function init() {
    bindSafeAdd();
    bindSafeEdit();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

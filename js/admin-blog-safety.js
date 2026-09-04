// Safety layer for blog media lifecycle and admin rendering.
(() => {
  const BLOG_BUCKET = 'blog-images';

  async function removePaths(paths) {
    const clean = [...new Set(paths.filter(Boolean))];
    if (!clean.length) return;
    const { error } = await dbClient.storage.from(BLOG_BUCKET).remove(clean);
    if (error) console.warn('Nettoyage blog-images incomplet', error);
  }

  function inlinePathsFromHtml(html = '') {
    const template = document.createElement('template');
    template.innerHTML = html;
    const markers = ['/storage/v1/object/public/blog-images/', '/storage/v1/object/sign/blog-images/'];
    const paths = [];
    template.content.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src') || '';
      for (const marker of markers) {
        const index = src.indexOf(marker);
        if (index === -1) continue;
        const raw = src.slice(index + marker.length).split(/[?#]/)[0];
        let path = raw;
        try { path = decodeURIComponent(raw); } catch {}
        if (path.startsWith('inline/')) paths.push(path);
        break;
      }
    });
    return [...new Set(paths)];
  }

  async function pathIsStillReferenced(path) {
    const [coverRef, contentRef] = await Promise.all([
      dbClient.from('articles').select('id').eq('cover_path', path).limit(1),
      dbClient.from('articles').select('id').ilike('content', `%${path}%`).limit(1)
    ]);
    if (coverRef.error || contentRef.error) {
      console.warn('Vérification de référence blog incomplète', coverRef.error || contentRef.error);
      return true;
    }
    return Boolean(coverRef.data?.length || contentRef.data?.length);
  }

  async function removeUnreferencedPaths(paths) {
    for (const path of [...new Set(paths.filter(Boolean))]) {
      if (!(await pathIsStillReferenced(path))) await removePaths([path]);
    }
  }

  async function uploadCover(file, title) {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `covers/${Date.now()}-${slugify(title)}.${ext}`;
    const { error } = await dbClient.storage.from(BLOG_BUCKET).upload(path, file);
    if (error) throw error;
    return path;
  }

  function installSafeRenderers() {
    window.renderBlogCatList = function safeRenderBlogCatList() {
      const list = document.getElementById('blog-cat-list');
      if (!list) return;
      list.replaceChildren();
      if (!blogCategories.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-msg';
        empty.textContent = 'Aucune catégorie blog.';
        list.appendChild(empty);
        return;
      }
      blogCategories.forEach(cat => {
        const count = articles.filter(a => a.category === cat.name).length;
        const row = document.createElement('div');
        row.className = 'admin-row';
        const name = document.createElement('span');
        name.className = 'row-name';
        name.textContent = cat.name;
        const meta = document.createElement('span');
        meta.className = 'row-meta';
        meta.textContent = `${count} article${count !== 1 ? 's' : ''}`;
        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const del = document.createElement('button');
        del.className = 'btn-sm btn-del';
        del.type = 'button';
        del.textContent = 'Supprimer';
        del.addEventListener('click', () => deleteBlogCat(cat.id, cat.name));
        actions.appendChild(del);
        row.append(name, meta, actions);
        list.appendChild(row);
      });
    };

    window.renderArticleList = function safeRenderArticleList() {
      const list = document.getElementById('article-list-admin');
      if (!list) return;
      list.replaceChildren();
      if (!articles.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-msg';
        empty.textContent = 'Aucun article encore.';
        list.appendChild(empty);
        return;
      }
      articles.forEach(art => {
        const row = document.createElement('div');
        row.className = 'blog-admin-row';
        const status = document.createElement('span');
        status.className = `blog-status ${art.published ? 'published' : 'draft'}`;
        status.textContent = art.published ? '● Publié' : '○ Brouillon';
        const name = document.createElement('span');
        name.className = 'row-name';
        name.textContent = art.title;
        const meta = document.createElement('span');
        meta.className = 'row-meta';
        const date = new Date(art.published_at ?? art.created_at).toLocaleDateString('fr-FR');
        meta.textContent = [art.category, date].filter(Boolean).join(' · ');
        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const edit = document.createElement('button');
        edit.className = 'btn-sm btn-edit';
        edit.type = 'button';
        edit.textContent = 'Modifier';
        edit.addEventListener('click', () => openEditArticle(art.id));
        const del = document.createElement('button');
        del.className = 'btn-sm btn-del';
        del.type = 'button';
        del.textContent = 'Supprimer';
        del.addEventListener('click', () => window.deleteArticle(art.id, art.cover_path || ''));
        actions.append(edit, del);
        row.append(status, name, meta, actions);
        list.appendChild(row);
      });
    };
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
          title, excerpt: excerpt || null, category: category || null, content,
          cover_path: uploadedCover, published,
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
      const { data: original, error: originalError } = await dbClient
        .from('articles').select('id, cover_path, content, published_at').eq('id', id).single();
      if (originalError || !original) return showNotif('Article introuvable.', 'error');
      const previousCover = original.cover_path || null;
      const previousInline = inlinePathsFromHtml(original.content || '');
      const nextInline = inlinePathsFromHtml(content);
      const removedInline = previousInline.filter(path => !nextInline.includes(path));
      let newCover = null;
      try {
        newCover = await uploadCover(coverFile, title);
        const nextCover = newCover || previousCover;
        const { error } = await dbClient.from('articles').update({
          title, excerpt: excerpt || null, category: category || null, content,
          cover_path: nextCover, published,
          published_at: published ? (original.published_at ?? new Date().toISOString()) : null,
        }).eq('id', id);
        if (error) throw error;
        const cleanupCandidates = [...removedInline];
        if (newCover && previousCover && previousCover !== newCover) cleanupCandidates.push(previousCover);
        if (cleanupCandidates.length) await removeUnreferencedPaths(cleanupCandidates);
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

  window.deleteArticle = async function safeDeleteArticle(id, coverPath) {
    if (!confirm('Supprimer cet article définitivement ?')) return;
    const { data: article, error: readError } = await dbClient
      .from('articles').select('cover_path, content').eq('id', id).single();
    if (readError || !article) return showNotif('Erreur : article introuvable.', 'error');
    const cleanupCandidates = [coverPath || article.cover_path, ...inlinePathsFromHtml(article.content || '')];
    const { error } = await dbClient.from('articles').delete().eq('id', id);
    if (error) return showNotif('Erreur : ' + error.message, 'error');
    await removeUnreferencedPaths(cleanupCandidates);
    showNotif('Article supprimé');
    await loadArticles();
  };

  function init() {
    installSafeRenderers();
    bindSafeAdd();
    bindSafeEdit();
    if (typeof renderBlogCatList === 'function') renderBlogCatList();
    if (typeof renderArticleList === 'function') renderArticleList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

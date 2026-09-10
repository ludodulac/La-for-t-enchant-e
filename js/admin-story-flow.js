// admin-story-flow.js — aide légère au parcours réel de préparation d'une histoire.
(() => {
  const STORY_SUGGESTIONS = [
    'Hansel et Gretel',
    'Blanche-Neige',
    'Le Roi-grenouille',
    'Raiponce',
    'Le Petit Chaperon rouge',
    'Les Musiciens de Brême',
    'Le Vaillant Petit Tailleur',
    'Les Sept Corbeaux',
    'Le Loup et les Sept Chevreaux',
    'Dame Holle',
    'Le Pêcheur et sa femme',
    'Les Douze Frères',
    'Le Conte du genévrier',
    'La Gardeuse d’oies',
    'Le Roi Barbabec',
    'Les Six Cygnes'
  ];

  function enhanceStoryStart() {
    const titleInput = document.getElementById('audio-title-in');
    if (!titleInput || document.querySelector('[data-story-start-helper]')) return;
    const group = titleInput.closest('.form-group');
    if (!group) return;

    const helper = document.createElement('div');
    helper.className = 'story-start-helper';
    helper.dataset.storyStartHelper = 'true';
    helper.innerHTML = `
      <div class="story-start-copy">
        <strong>Commence par l’histoire</strong>
        <span>Choisis une proposition ou écris librement ton propre titre.</span>
      </div>
      <label class="story-suggestion-label">
        <span>Choisir une histoire proposée</span>
        <select id="story-suggestion-select">
          <option value="">— Choisir dans la liste —</option>
          ${STORY_SUGGESTIONS.map(title => `<option value="${title.replace(/"/g, '&quot;')}">${title}</option>`).join('')}
        </select>
      </label>
      <div class="story-free-note">Ou ajoute une autre histoire avec le champ <strong>Titre</strong> ci-dessous.</div>`;

    group.insertBefore(helper, titleInput);
    const select = helper.querySelector('#story-suggestion-select');
    select.addEventListener('change', () => {
      if (!select.value) return;
      titleInput.value = select.value;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.focus();
    });

    titleInput.addEventListener('input', () => {
      if (select.value && titleInput.value.trim() !== select.value) select.value = '';
    });

    document.getElementById('form-add-audio')?.addEventListener('reset', () => {
      setTimeout(() => { select.value = ''; }, 0);
    });
  }

  function enhanceIllustrationSearch(editor) {
    if (!editor || editor.querySelector('[data-illustration-search]')) return;
    const gallery = editor.querySelector('.cover-gallery');
    if (!gallery) return;

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'cover-gallery-search';
    search.placeholder = 'Rechercher un dessin…';
    search.setAttribute('aria-label', 'Rechercher une illustration');
    search.dataset.illustrationSearch = 'true';
    gallery.before(search);

    const empty = document.createElement('div');
    empty.className = 'cover-gallery-empty';
    empty.hidden = true;
    empty.textContent = 'Aucun dessin ne correspond à cette recherche.';
    gallery.after(empty);

    const filter = () => {
      const query = search.value.trim().toLocaleLowerCase('fr');
      let visible = 0;
      gallery.querySelectorAll('.cover-illustration').forEach(button => {
        const label = (button.textContent || '').trim().toLocaleLowerCase('fr');
        const match = !query || label.includes(query);
        button.hidden = !match;
        if (match) visible += 1;
      });
      empty.hidden = visible !== 0;
    };

    search.addEventListener('input', filter);
    filter();

    const form = editor.closest('form');
    form?.addEventListener('reset', () => {
      setTimeout(() => {
        search.value = '';
        filter();
      }, 0);
    });
  }

  function enhanceCoverEditors() {
    document.querySelectorAll('.cover-editor').forEach(enhanceIllustrationSearch);
  }

  function init() {
    enhanceStoryStart();
    enhanceCoverEditors();

    const observer = new MutationObserver(() => {
      enhanceStoryStart();
      enhanceCoverEditors();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

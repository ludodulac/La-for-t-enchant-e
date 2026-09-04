(() => {
  const index = window.WIKIGNOSE_INDEX || { documents: [] };
  const $ = (id) => document.getElementById(id);
  const queryInput = $('query');
  const excludeInput = $('exclude');
  const masterFilter = $('masterFilter');
  const searchButton = $('searchButton');
  const results = $('results');
  const resultCount = $('resultCount');
  const themesPanel = $('themesPanel');
  const themesToggle = $('themesToggle');
  const closeThemes = $('closeThemes');
  const themeDirectory = $('themeDirectory');
  const themeFilter = $('themeFilter');
  const modeThemes = $('modeThemes');
  const modeOccurrences = $('modeOccurrences');
  const modeHelp = $('modeHelp');
  const corpusStats = $('corpus-stats');
  let searchMode = 'themes';

  const STOP_WORDS = new Set(['alors','au','aucun','aucune','aux','avec','ce','ces','cet','cette','comme','dans','de','des','du','elle','elles','en','est','et','eux','il','ils','je','la','le','les','leur','leurs','lui','ma','mais','me','mes','moi','mon','ne','nos','notre','nous','on','ou','par','pas','pour','qu','que','quel','quelle','quelles','quels','qui','sa','se','ses','si','son','sont','sur','ta','te','tes','toi','ton','tu','un','une','vos','votre','vous','y']);
  const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, '&#096;');
  const normalize = (value) => (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const rawTokens = (value) => normalize(value).split(/[\s,;]+/).filter((term) => term.length > 1);
  const tokenize = (value) => {
    const terms = rawTokens(value);
    const meaningful = terms.filter((term) => !STOP_WORDS.has(term));
    return meaningful.length ? meaningful : terms;
  };
  const words = (value) => new Set(normalize(value).split(/\s+/).filter(Boolean));
  const hasTerm = (field, term) => {
    const set = words(field);
    if (set.has(term)) return true;
    if (term.length < 5) return false;
    return [...set].some((word) => word.length >= 5 && (word.startsWith(term) || term.startsWith(word)));
  };
  const allEntries = index.documents.flatMap((doc) => (doc.sections || []).map((section) => ({ doc, section })));

  corpusStats.textContent = `${index.documents.length} ouvrage${index.documents.length > 1 ? 's' : ''} · ${allEntries.length} sections indexées`;

  function searchableText(doc, section) {
    return normalize([doc.title, doc.school, doc.collection, doc.course, doc.current, ...(doc.masters || []), section.title, section.summary, ...(section.themes || []), ...(section.aliases || []), ...(section.masters || []), ...(section.currents || []), ...(section.occurrenceTerms || []), section.text || ''].join(' '));
  }

  function thematicScore(doc, section, rawQuery, queryTerms) {
    if (!queryTerms.length) return 0;
    const phrase = normalize(rawQuery);
    const fields = {
      sectionTitle: normalize(section.title),
      themes: normalize((section.themes || []).join(' ')),
      aliases: normalize((section.aliases || []).join(' ')),
      summary: normalize(section.summary),
      docTitle: normalize(doc.title),
      people: normalize([doc.current, ...(doc.masters || []), ...(section.masters || [])].join(' '))
    };
    let matchedTerms = 0;
    let score = 0;

    if (phrase.length >= 5) {
      if (fields.sectionTitle.includes(phrase)) score += 24;
      if (fields.themes.includes(phrase)) score += 22;
      if (fields.aliases.includes(phrase)) score += 18;
      if (fields.summary.includes(phrase)) score += 14;
      if (fields.docTitle.includes(phrase)) score += 10;
      if (fields.people.includes(phrase)) score += 10;
    }

    for (const term of queryTerms) {
      let matched = false;
      if (hasTerm(fields.sectionTitle, term)) { score += 9; matched = true; }
      if (hasTerm(fields.themes, term)) { score += 8; matched = true; }
      if (hasTerm(fields.aliases, term)) { score += 6; matched = true; }
      if (hasTerm(fields.summary, term)) { score += 4; matched = true; }
      if (hasTerm(fields.docTitle, term)) { score += 3; matched = true; }
      if (hasTerm(fields.people, term)) { score += 4; matched = true; }
      if (matched) matchedTerms += 1;
    }
    if (!matchedTerms && score === 0) return 0;
    score += (section.importance || 1) * 2;
    score += (matchedTerms / queryTerms.length) * 18;
    if (matchedTerms === queryTerms.length) score += 12;
    return score;
  }

  function occurrenceScore(doc, section, rawQuery) {
    const phrase = normalize(rawQuery);
    if (!phrase) return 0;
    const fallback = searchableText(doc, section);
    const explicit = normalize([section.text || '', ...(section.occurrenceTerms || [])].join(' '));
    const source = explicit || fallback;
    if (!source.includes(phrase)) return 0;
    let count = 0;
    let cursor = 0;
    while ((cursor = source.indexOf(phrase, cursor)) !== -1) {
      count += 1;
      cursor += Math.max(1, phrase.length);
    }
    return Math.max(1, count);
  }

  function relevanceLabel(score, maxScore) {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio >= 0.82) return 'Très pertinent';
    if (ratio >= 0.58) return 'Pertinent';
    return 'À explorer';
  }

  function renderResults(items) {
    resultCount.textContent = `${items.length} résultat${items.length > 1 ? 's' : ''}`;
    if (!items.length) {
      results.innerHTML = `<div class="wg-empty">${searchMode === 'occurrences' ? 'Aucune occurrence exacte dans l’index lexical disponible. Certains ouvrages n’ont pas encore leur texte intégral indexé.' : 'Aucun résultat thématique avec ces critères.'}</div>`;
      return;
    }
    const maxScore = Math.max(...items.map((item) => item.score));
    results.innerHTML = items.map(({ doc, section, score }) => {
      const pages = section.pages?.length === 2 ? (section.pages[0] === section.pages[1] ? `page ${section.pages[0]}` : `pages ${section.pages[0]}–${section.pages[1]}`) : 'pages à préciser';
      const metric = searchMode === 'occurrences' ? `${score} occurrence${score > 1 ? 's' : ''}` : relevanceLabel(score, maxScore);
      const tags = (section.themes || []).slice(0, 7).map((theme) => `<span class="wg-tag">${escapeHtml(theme)}</span>`).join('');
      const openButton = doc.file ? `<a class="wg-secondary" href="${escapeAttribute(`${doc.file}#page=${section.pages?.[0] || 1}`)}" target="_blank" rel="noopener">Ouvrir le PDF</a>` : '';
      const meta = [doc.school, doc.course || '', pages].filter(Boolean).map(escapeHtml).join(' · ');
      return `<article class="wg-result-card"><div class="wg-result-topline"><div><div class="wg-result-doc">${escapeHtml(doc.title)}</div><h3>${escapeHtml(section.title)}</h3></div><strong class="wg-score">${escapeHtml(metric)}</strong></div><div class="wg-result-meta">${meta}</div><p class="wg-result-summary">${escapeHtml(section.summary || '')}</p><div class="wg-tags">${tags}</div>${openButton ? `<div class="wg-result-actions">${openButton}</div>` : ''}</article>`;
    }).join('');
  }

  function search() {
    const rawQuery = queryInput.value.trim();
    const queryTerms = tokenize(rawQuery);
    const excluded = tokenize(excludeInput.value);
    const selectedMaster = normalize(masterFilter.value);
    if (!rawQuery) {
      results.innerHTML = '<div class="wg-empty">Saisissez un thème, un mot ou une expression pour commencer.</div>';
      resultCount.textContent = '';
      return;
    }
    const ranked = allEntries.filter(({ doc, section }) => {
      const haystack = searchableText(doc, section);
      const haystackWords = words(haystack);
      if (excluded.some((term) => haystackWords.has(term) || (term.length >= 5 && [...haystackWords].some((word) => word.startsWith(term))))) return false;
      if (selectedMaster && !haystack.includes(selectedMaster)) return false;
      return true;
    }).map(({ doc, section }) => ({ doc, section, score: searchMode === 'occurrences' ? occurrenceScore(doc, section, rawQuery) : thematicScore(doc, section, rawQuery, queryTerms) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || (b.section.importance || 0) - (a.section.importance || 0));
    renderResults(ranked);
  }

  function setMode(mode) {
    searchMode = mode;
    modeThemes.classList.toggle('active', mode === 'themes');
    modeOccurrences.classList.toggle('active', mode === 'occurrences');
    modeHelp.textContent = mode === 'themes' ? 'Classe les résultats selon l’importance du thème dans les chapitres et passages déjà analysés.' : 'Cherche un mot ou un groupe de mots tel qu’il apparaît dans l’index lexical disponible.';
    queryInput.placeholder = mode === 'themes' ? 'Ex. préparation intérieure avant de commencer une œuvre' : 'Ex. premier pas';
    if (queryInput.value.trim()) search();
  }

  function collectThemes() {
    const map = new Map();
    for (const { section } of allEntries) {
      for (const theme of section.themes || []) {
        const key = normalize(theme);
        if (!map.has(key)) map.set(key, { label: theme, count: 0 });
        map.get(key).count += 1;
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }

  const themes = collectThemes();
  function renderThemes(filter = '') {
    const needle = normalize(filter);
    const visible = themes.filter((theme) => normalize(theme.label).includes(needle));
    themeDirectory.innerHTML = visible.map((theme) => `<button class="wg-theme-chip" type="button" data-theme="${escapeAttribute(theme.label)}">${escapeHtml(theme.label)} <span class="wg-muted">(${theme.count})</span></button>`).join('');
    themeDirectory.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => {
      setMode('themes');
      queryInput.value = button.dataset.theme;
      themesPanel.hidden = true;
      themesToggle.setAttribute('aria-expanded', 'false');
      search();
      queryInput.focus();
    }));
  }

  function populateMasterFilter() {
    const values = new Set();
    index.documents.forEach((doc) => {
      if (doc.current) values.add(doc.current);
      (doc.masters || []).forEach((master) => values.add(master));
      (doc.sections || []).forEach((section) => {
        (section.masters || []).forEach((master) => values.add(master));
        (section.currents || []).forEach((current) => values.add(current));
      });
    });
    [...values].sort((a, b) => a.localeCompare(b, 'fr')).forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      masterFilter.appendChild(option);
    });
  }

  function setThemesOpen(open) {
    themesPanel.hidden = !open;
    themesToggle.setAttribute('aria-expanded', String(open));
    if (open) themeFilter.focus();
  }

  searchButton.addEventListener('click', search);
  queryInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') search(); });
  excludeInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') search(); });
  masterFilter.addEventListener('change', () => { if (queryInput.value.trim()) search(); });
  themesToggle.addEventListener('click', () => setThemesOpen(themesPanel.hidden));
  closeThemes.addEventListener('click', () => setThemesOpen(false));
  themeFilter.addEventListener('input', () => renderThemes(themeFilter.value));
  modeThemes.addEventListener('click', () => setMode('themes'));
  modeOccurrences.addEventListener('click', () => setMode('occurrences'));
  populateMasterFilter();
  renderThemes();
})();

'use strict';

const CatenaApp = (() => {
  const BOOK_KEYS = ['mateus', 'marcos', 'lucas', 'joao'];
  const BOOK_ALIASES = {
    mateus: 'mateus',
    matheus: 'mateus',
    mt: 'mateus',
    marcos: 'marcos',
    mc: 'marcos',
    lucas: 'lucas',
    lc: 'lucas',
    joao: 'joao',
    jo: 'joao',
    jn: 'joao',
  };

  let lastBookKey = 'mateus';
  let isApplyingRoute = false;

  async function init() {
    CatenaDOM.init();
    CatenaAppearance.initColorMode();
    CatenaDOM.injectTabSymbols();
    CatenaHomeRenderer.renderBookCards();
    CatenaAppearance.updateFavicon('mateus');
    CatenaDOM.setLogoSymbol('mateus');
    CatenaChapterSidebar.hideToggle();
    bindEvents();
    refreshRouteLinks();
    CatenaChapterSidebar.updateMobileControls();

    const initialRoute = readRoute();
    if (initialRoute) {
      await applyRoute(initialRoute, { syncUrl: true, replace: true });
    }
  }

  function goHome(options = {}) {
    CatenaState.resetBookSelection();
    applyTheme(lastBookKey);
    document.body.classList.remove('book-active', 'liturgy-active', 'sidebar-open');
    CatenaChapterSidebar.hideToggle();
    CatenaDOM.setActiveBookTab(null);
    CatenaDOM.showPanel('welcome');
    CatenaCommentaryPanel.close({ clearHighlight: true });
    CatenaAppearance.updateFavicon(lastBookKey);
    CatenaDOM.setLogoSymbol(lastBookKey);
    CatenaDOM.refs.main.scrollTo({ top: 0, behavior: scrollBehavior(options) });
    if (options.updateUrl !== false) writeCurrentRoute({ replace: options.replace === true });
  }

  async function selectBook(bookKey, options = {}) {
    if (!isBookKey(bookKey)) return false;

    lastBookKey = bookKey;
    CatenaState.currentBook = bookKey;
    CatenaState.currentChapter = null;

    applyTheme(bookKey);
    CatenaAppearance.updateFavicon(bookKey);
    CatenaDOM.setLogoSymbol(bookKey);
    document.body.classList.add('book-active');
    document.body.classList.remove('liturgy-active');
    CatenaChapterSidebar.updateMobileControls();
    CatenaDOM.setActiveBookTab(bookKey);
    CatenaDOM.showPanel('loading');

    try {
      const book = await CatenaDataService.loadBook(bookKey);
      const chapters = Object.keys(book.gospel).sort((a, b) => +a - +b);
      const requestedChapter = String(options.chapter || '');
      const chapter = chapters.includes(requestedChapter) ? requestedChapter : chapters[0];

      CatenaChapterRenderer.renderChapterList(bookKey, book);
      selectChapter(chapter, {
        updateUrl: options.updateUrl,
        replace: options.replace,
        commentaryKey: options.commentaryKey,
        maximized: options.maximized,
        scroll: options.scroll,
      });
      return true;
    } catch (err) {
      CatenaChapterRenderer.renderLoadError(err);
      return false;
    }
  }

  function selectChapter(chapter, options = {}) {
    const book = CatenaDataService.getBook(CatenaState.currentBook);
    if (!book?.gospel?.[chapter]) return false;

    CatenaState.currentChapter = chapter;

    document.querySelectorAll('.ch-btn').forEach(btn => btn.classList.remove('active'));
    const button = document.getElementById(`ch-btn-${chapter}`);
    if (button) {
      button.classList.add('active');
      button.scrollIntoView({ block: 'nearest', behavior: scrollBehavior(options) });
    }

    CatenaCommentaryPanel.close({ clearHighlight: true });
    CatenaChapterSidebar.close();

    CatenaChapterRenderer.renderChapter(CatenaState.currentBook, chapter, book);

    if (options.commentaryKey) {
      openCommentary(options.commentaryKey, {
        updateUrl: false,
        maximized: options.maximized === true,
      });
    }

    CatenaDOM.refs.main.scrollTo({ top: 0, behavior: scrollBehavior(options) });
    if (options.updateUrl !== false) writeCurrentRoute({ replace: options.replace === true });
    return true;
  }

  async function selectLiturgy(isoDate = CatenaState.liturgy.date, options = {}) {
    const date = normalizeISODate(isoDate) || CatenaState.liturgy.date;

    CatenaState.resetBookSelection();
    CatenaState.resetLiturgy(date);

    document.body.classList.remove('book-active', 'sidebar-open');
    document.body.classList.add('liturgy-active');
    CatenaDOM.setActiveLiturgyTab();
    CatenaDOM.refs.sidebarLabel.textContent = 'Liturgia';
    CatenaDOM.refs.chapterList.innerHTML = '';
    CatenaChapterSidebar.hideToggle();
    CatenaCommentaryPanel.close({ clearHighlight: true });
    CatenaDOM.showPanel('loading');
    refreshRouteLinks();

    try {
      const data = await CatenaDataService.loadLiturgy(date);
      CatenaState.liturgy.data = data;

      const gospel = CatenaBible.firstReading(data.leituras?.evangelho);
      const gospelRef = CatenaBible.parseGospelReference(gospel?.referencia || '');
      CatenaState.liturgy.gospelRef = gospelRef;

      if (gospelRef) {
        CatenaState.currentBook = gospelRef.bookKey;
        CatenaState.currentChapter = String(gospelRef.chapter);
        lastBookKey = gospelRef.bookKey;
        applyTheme(gospelRef.bookKey);
        CatenaAppearance.updateFavicon(gospelRef.bookKey);
        CatenaDOM.setLogoSymbol(gospelRef.bookKey);
        await CatenaDataService.loadBook(gospelRef.bookKey);
      } else {
        applyTheme(lastBookKey);
        CatenaAppearance.updateFavicon(lastBookKey);
        CatenaDOM.setLogoSymbol(lastBookKey);
      }

      CatenaLiturgyRenderer.render(data, gospelRef, { onSelectDate: selectLiturgy });
      CatenaDOM.showPanel('liturgy');

      if (options.commentaryKey) {
        openCommentary(options.commentaryKey, {
          updateUrl: false,
          maximized: options.maximized === true,
        });
      }

      CatenaDOM.refs.main.scrollTo({ top: 0, behavior: scrollBehavior(options) });
      refreshRouteLinks();
      if (options.updateUrl !== false) writeCurrentRoute({ replace: options.replace === true });
      return true;
    } catch (err) {
      console.error('[Catena Aurea] Liturgy load error:', err);
      CatenaLiturgyRenderer.renderError(err, date, { onSelectDate: selectLiturgy });
      CatenaDOM.showPanel('liturgy');
      refreshRouteLinks();
      if (options.updateUrl !== false) writeCurrentRoute({ replace: options.replace === true });
      return false;
    }
  }

  function bindEvents() {
    const refs = CatenaDOM.refs;

    refs.logoButton.addEventListener('click', event => {
      event.preventDefault();
      goHome();
    });

    document.querySelectorAll('.book-tab[data-book]').forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        selectBook(btn.dataset.book);
      });
    });

    if (refs.liturgyTab) {
      refs.liturgyTab.addEventListener('click', event => {
        event.preventDefault();
        selectLiturgy(CatenaState.liturgy.date);
      });
    }

    if (refs.welcomeLiturgy) {
      refs.welcomeLiturgy.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        selectLiturgy(CatenaState.liturgy.date);
      });
    }

    if (refs.themeToggle) {
      refs.themeToggle.addEventListener('click', CatenaAppearance.toggleColorMode);
    }

    refs.bookCards.addEventListener('click', event => {
      const card = event.target.closest('[data-book]');
      if (card) {
        event.preventDefault();
        event.stopPropagation();
        selectBook(card.dataset.book);
      }
    });

    refs.bookCards.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const card = event.target.closest('[data-book]');
      if (card) {
        event.preventDefault();
        selectBook(card.dataset.book);
      }
    });

    refs.chapterList.addEventListener('click', event => {
      const button = event.target.closest('.ch-btn');
      if (button) selectChapter(button.dataset.ch);
    });

    refs.main.addEventListener('click', event => {
      const liturgyVerse = event.target.closest('.liturgy-verse.has-commentary');
      if (liturgyVerse) {
        openCommentary(liturgyVerse.dataset.vskey);
        return;
      }

      const row = event.target.closest('.verse-row.has-commentary');
      if (row) {
        openCommentary(row.dataset.vskey);
        return;
      }

      if (!event.target.closest('#comm-panel')) {
        closeCommentary();
        CatenaChapterSidebar.close();
      }
    });

    refs.main.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const liturgyVerse = event.target.closest('.liturgy-verse.has-commentary');
      if (liturgyVerse) {
        event.preventDefault();
        openCommentary(liturgyVerse.dataset.vskey);
        return;
      }

      const row = event.target.closest('.verse-row.has-commentary');
      if (row) {
        event.preventDefault();
        openCommentary(row.dataset.vskey);
      }
    });

    if (refs.commMaximize) {
      refs.commMaximize.addEventListener('click', () => {
        CatenaCommentaryPanel.toggleMaximized();
        writeCurrentRoute();
      });
    }

    refs.commClose.addEventListener('click', () => closeCommentary());

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeCommentary();
    });

    refs.chapterToggle.addEventListener('click', CatenaChapterSidebar.toggle);

    document.addEventListener('click', event => {
      if (!document.body.classList.contains('sidebar-open')) return;
      if (event.target.closest('#sidebar') || event.target.closest('#chapter-toggle')) return;
      CatenaChapterSidebar.close();
    });

    window.addEventListener('resize', CatenaChapterSidebar.updateMobileControls);
    window.addEventListener('popstate', () => {
      applyRoute(readRoute(), { syncUrl: false, scroll: false });
    });
    CatenaResizablePanel.init();
  }

  function openCommentary(vsKey, options = {}) {
    const wasMaximized = CatenaCommentaryPanel.getState().isMaximized;
    const opened = CatenaCommentaryPanel.open(vsKey);
    if (!opened) return false;

    const shouldMaximize = typeof options.maximized === 'boolean'
      ? options.maximized
      : wasMaximized;
    CatenaCommentaryPanel.setMaximized(shouldMaximize);

    if (options.updateUrl !== false) writeCurrentRoute({ replace: options.replace === true });
    return true;
  }

  function closeCommentary(options = {}) {
    CatenaCommentaryPanel.close(options);
    if (options.updateUrl !== false) writeCurrentRoute({ replace: options.replace === true });
  }

  async function applyRoute(route, options = {}) {
    isApplyingRoute = true;

    try {
      if (!route) {
        goHome({ updateUrl: false, scroll: options.scroll });
        return;
      }

      if (route.view === 'liturgy') {
        await selectLiturgy(route.date, {
          updateUrl: false,
          commentaryKey: route.commentaryKey,
          maximized: route.maximized,
          scroll: options.scroll,
        });
        return;
      }

      if (route.view === 'book' && isBookKey(route.bookKey)) {
        await selectBook(route.bookKey, {
          updateUrl: false,
          chapter: route.chapter,
          commentaryKey: route.commentaryKey,
          maximized: route.maximized,
          scroll: options.scroll,
        });
        return;
      }

      goHome({ updateUrl: false, scroll: options.scroll });
    } finally {
      isApplyingRoute = false;
      if (options.syncUrl === true) {
        writeCurrentRoute({ replace: options.replace !== false });
      }
    }
  }

  function readRoute() {
    const params = new URLSearchParams(window.location.search);
    const bookKey = normalizeBookKey(params.get('evangelho') || params.get('book') || params.get('livro'));
    const routeCommentary = params.get('comentario') || params.get('commentary') || null;
    const routeMaximized = isMaxWindowRoute(params);
    const hasLiturgyRoute = params.get('tela') === 'liturgia' ||
      params.has('liturgia') ||
      (!bookKey && params.has('data')) ||
      window.location.hash === '#liturgia';

    if (hasLiturgyRoute) {
      return {
        view: 'liturgy',
        date: normalizeISODate(params.get('data') || params.get('liturgia')) || CatenaState.liturgy.date,
        commentaryKey: routeCommentary,
        maximized: routeMaximized,
      };
    }

    if (bookKey) {
      return {
        view: 'book',
        bookKey,
        chapter: normalizeChapter(params.get('capitulo') || params.get('chapter')),
        commentaryKey: routeCommentary,
        maximized: routeMaximized,
      };
    }

    return null;
  }

  function getCurrentRoute() {
    const panelState = CatenaCommentaryPanel.getState();
    const route = document.body.classList.contains('liturgy-active')
      ? {
        view: 'liturgy',
        date: CatenaState.liturgy.date,
      }
      : CatenaState.currentBook
        ? {
          view: 'book',
          bookKey: CatenaState.currentBook,
          chapter: CatenaState.currentChapter,
        }
        : { view: 'home' };

    if (panelState.isOpen && panelState.vsKey) {
      route.commentaryKey = panelState.vsKey;
      route.maximized = panelState.isMaximized;
    }

    return route;
  }

  function writeCurrentRoute(options = {}) {
    if (isApplyingRoute) return;

    const url = buildRouteUrl(getCurrentRoute());
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === current) return;

    const method = options.replace === true ? 'replaceState' : 'pushState';
    try {
      window.history[method]({}, '', url);
    } catch (err) {
      console.warn('[Catena Aurea] Could not update URL:', err);
    }

    refreshRouteLinks();
  }

  function buildRouteUrl(route) {
    return `${window.location.pathname}${buildRouteSearch(route)}`;
  }

  function buildRouteSearch(route) {
    const params = new URLSearchParams();

    if (route.view === 'book' && route.bookKey) {
      params.set('evangelho', route.bookKey);
      if (route.chapter) params.set('capitulo', route.chapter);
    } else if (route.view === 'liturgy') {
      params.set('tela', 'liturgia');
      params.set('data', route.date || CatenaState.liturgy.date);
    }

    if (route.commentaryKey) params.set('comentario', route.commentaryKey);
    if (route.maximized) params.set('maxwindow', '1');

    const search = params.toString();
    return search ? `?${search}` : '';
  }

  function refreshRouteLinks() {
    document.querySelectorAll('.book-tab[data-book], .book-card[data-book]').forEach(link => {
      const bookKey = link.dataset.book;
      if (isBookKey(bookKey)) {
        link.setAttribute('href', buildRouteSearch({
          view: 'book',
          bookKey,
          chapter: '1',
        }));
      }
    });

    const liturgyHref = buildRouteSearch({
      view: 'liturgy',
      date: CatenaState.liturgy.date,
    });

    if (CatenaDOM.refs.liturgyTab) CatenaDOM.refs.liturgyTab.setAttribute('href', liturgyHref);
    if (CatenaDOM.refs.welcomeLiturgy) CatenaDOM.refs.welcomeLiturgy.setAttribute('href', liturgyHref);
  }

  function normalizeBookKey(value) {
    const key = String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    return BOOK_ALIASES[key] || null;
  }

  function normalizeChapter(value) {
    const match = String(value || '').match(/^\d+$/);
    return match ? match[0] : null;
  }

  function normalizeISODate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  function isMaxWindowRoute(params) {
    return params.get('maxwindow') === '1' ||
      params.get('maxwindow') === 'true' ||
      params.get('janela') === 'max' ||
      params.get('max') === '1';
  }

  function isBookKey(bookKey) {
    return BOOK_KEYS.includes(bookKey);
  }

  function scrollBehavior(options = {}) {
    return options.scroll === false ? 'auto' : 'smooth';
  }

  return {
    init,
    goHome,
    selectBook,
    selectChapter,
    selectLiturgy,
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  CatenaApp.init();
});

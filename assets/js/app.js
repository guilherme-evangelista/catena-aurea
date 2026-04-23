'use strict';

const CatenaApp = (() => {
  function init() {
    CatenaDOM.init();
    CatenaAppearance.initColorMode();
    CatenaDOM.injectTabSymbols();
    CatenaHomeRenderer.renderBookCards();
    CatenaAppearance.updateFavicon('mateus');
    CatenaChapterSidebar.hideToggle();
    bindEvents();
    CatenaChapterSidebar.updateMobileControls();
  }

  function goHome() {
    CatenaState.resetBookSelection();
    document.body.classList.remove('book-active', 'liturgy-active', 'sidebar-open');
    CatenaChapterSidebar.hideToggle();
    CatenaDOM.setActiveBookTab(null);
    CatenaDOM.showPanel('welcome');
    CatenaCommentaryPanel.close();
    CatenaAppearance.updateFavicon('mateus');
    CatenaDOM.refs.main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function selectBook(bookKey) {
    CatenaState.currentBook = bookKey;
    CatenaState.currentChapter = null;

    applyTheme(bookKey);
    CatenaAppearance.updateFavicon(bookKey);
    document.body.classList.add('book-active');
    document.body.classList.remove('liturgy-active');
    CatenaChapterSidebar.updateMobileControls();
    CatenaDOM.setActiveBookTab(bookKey);
    CatenaDOM.showPanel('loading');

    try {
      const book = await CatenaDataService.loadBook(bookKey);
      CatenaChapterRenderer.renderChapterList(bookKey, book);
      selectChapter(Object.keys(book.gospel)[0]);
    } catch (err) {
      CatenaChapterRenderer.renderLoadError(err);
    }
  }

  function selectChapter(chapter) {
    CatenaState.currentChapter = chapter;

    document.querySelectorAll('.ch-btn').forEach(btn => btn.classList.remove('active'));
    const button = document.getElementById(`ch-btn-${chapter}`);
    if (button) {
      button.classList.add('active');
      button.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    CatenaCommentaryPanel.close();
    CatenaChapterSidebar.close();

    const book = CatenaDataService.getBook(CatenaState.currentBook);
    CatenaChapterRenderer.renderChapter(CatenaState.currentBook, chapter, book);
    CatenaDOM.refs.main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function selectLiturgy(isoDate = CatenaState.liturgy.date) {
    CatenaState.resetBookSelection();
    CatenaState.resetLiturgy(isoDate);

    document.body.classList.remove('book-active', 'sidebar-open');
    document.body.classList.add('liturgy-active');
    CatenaDOM.setActiveLiturgyTab();
    CatenaDOM.refs.sidebarLabel.textContent = 'Liturgia';
    CatenaDOM.refs.chapterList.innerHTML = '';
    CatenaChapterSidebar.hideToggle();
    CatenaCommentaryPanel.close();
    CatenaDOM.showPanel('loading');

    try {
      const data = await CatenaDataService.loadLiturgy(isoDate);
      CatenaState.liturgy.data = data;

      const gospel = CatenaBible.firstReading(data.leituras?.evangelho);
      const gospelRef = CatenaBible.parseGospelReference(gospel?.referencia || '');
      CatenaState.liturgy.gospelRef = gospelRef;

      if (gospelRef) {
        CatenaState.currentBook = gospelRef.bookKey;
        CatenaState.currentChapter = String(gospelRef.chapter);
        applyTheme(gospelRef.bookKey);
        await CatenaDataService.loadBook(gospelRef.bookKey);
      }

      CatenaLiturgyRenderer.render(data, gospelRef, { onSelectDate: selectLiturgy });
      CatenaDOM.showPanel('liturgy');
      CatenaDOM.refs.main.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[Catena Aurea] Liturgy load error:', err);
      CatenaLiturgyRenderer.renderError(err, isoDate, { onSelectDate: selectLiturgy });
      CatenaDOM.showPanel('liturgy');
    }
  }

  function bindEvents() {
    const refs = CatenaDOM.refs;

    refs.logoButton.addEventListener('click', goHome);

    document.querySelectorAll('.book-tab[data-book]').forEach(btn => {
      btn.addEventListener('click', () => selectBook(btn.dataset.book));
    });

    if (refs.liturgyTab) {
      refs.liturgyTab.addEventListener('click', () => selectLiturgy(CatenaState.liturgy.date));
    }

    if (refs.welcomeLiturgy) {
      refs.welcomeLiturgy.addEventListener('click', event => {
        event.preventDefault();
        selectLiturgy(CatenaState.liturgy.date);
      });
    }

    if (refs.themeToggle) {
      refs.themeToggle.addEventListener('click', CatenaAppearance.toggleColorMode);
    }

    refs.bookCards.addEventListener('click', event => {
      const card = event.target.closest('[data-book]');
      if (card) selectBook(card.dataset.book);
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
        CatenaCommentaryPanel.openFromVerse(liturgyVerse);
        return;
      }

      const row = event.target.closest('.verse-row.has-commentary');
      if (row) {
        CatenaCommentaryPanel.open(row.dataset.vskey);
        return;
      }

      if (!event.target.closest('#comm-panel')) {
        CatenaCommentaryPanel.close();
        CatenaChapterSidebar.close();
      }
    });

    refs.main.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const liturgyVerse = event.target.closest('.liturgy-verse.has-commentary');
      if (liturgyVerse) {
        event.preventDefault();
        CatenaCommentaryPanel.openFromVerse(liturgyVerse);
        return;
      }

      const row = event.target.closest('.verse-row.has-commentary');
      if (row) {
        event.preventDefault();
        CatenaCommentaryPanel.open(row.dataset.vskey);
      }
    });

    refs.commClose.addEventListener('click', CatenaCommentaryPanel.close);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') CatenaCommentaryPanel.close();
    });

    refs.chapterToggle.addEventListener('click', CatenaChapterSidebar.toggle);

    document.addEventListener('click', event => {
      if (!document.body.classList.contains('sidebar-open')) return;
      if (event.target.closest('#sidebar') || event.target.closest('#chapter-toggle')) return;
      CatenaChapterSidebar.close();
    });

    window.addEventListener('resize', CatenaChapterSidebar.updateMobileControls);
    CatenaResizablePanel.init();
  }

  return {
    init,
    goHome,
    selectBook,
    selectChapter,
    selectLiturgy,
  };
})();

window.addEventListener('DOMContentLoaded', CatenaApp.init);

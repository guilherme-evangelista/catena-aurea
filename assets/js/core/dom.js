'use strict';

const CatenaDOM = (() => {
  const refs = {};
  let panels = {};

  function init() {
    Object.assign(refs, {
      app: document.getElementById('app'),
      main: document.getElementById('main'),
      welcome: document.getElementById('welcome'),
      chapterView: document.getElementById('chapter-view'),
      liturgyView: document.getElementById('liturgy-view'),
      loading: document.getElementById('loading-indicator'),
      chapterList: document.getElementById('chapter-list'),
      sidebarLabel: document.getElementById('sidebar-label'),
      commPanel: document.getElementById('comm-panel'),
      commBody: document.getElementById('comm-body'),
      commRef: document.getElementById('comm-ref'),
      commLabel: document.getElementById('comm-book-label'),
      commHeader: document.getElementById('comm-header'),
      commClose: document.getElementById('comm-close'),
      commResize: document.getElementById('comm-resize'),
      bookCards: document.getElementById('book-cards'),
      welcomeLiturgy: document.getElementById('welcome-liturgia'),
      logoButton: document.getElementById('logo-btn'),
      logoMark: document.getElementById('logo-mark'),
      liturgyTab: document.getElementById('tab-liturgia'),
      themeToggle: document.getElementById('theme-mode-toggle'),
      chapterToggle: document.getElementById('chapter-toggle'),
      favicon: document.getElementById('favicon'),
    });

    panels = {
      welcome: refs.welcome,
      chapter: refs.chapterView,
      liturgy: refs.liturgyView,
      loading: refs.loading,
    };
  }

  function showPanel(which) {
    Object.entries(panels).forEach(([name, el]) => {
      if (el) el.classList.toggle('is-hidden', name !== which);
    });
  }

  function setActiveBookTab(bookKey) {
    document.querySelectorAll('.book-tab').forEach(btn => btn.classList.remove('active'));
    if (!bookKey) return;

    const tab = document.getElementById(`tab-${bookKey}`);
    if (tab) tab.classList.add('active');
  }

  function setActiveLiturgyTab() {
    setActiveBookTab(null);
    if (refs.liturgyTab) refs.liturgyTab.classList.add('active');
  }

  function injectTabSymbols() {
    Object.keys(SYMBOLS).forEach(key => {
      const el = document.getElementById(`sym-${key}`);
      if (el) el.innerHTML = SYMBOLS[key];
    });

    setLogoSymbol('mateus');
  }

  function setLogoSymbol(bookKey) {
    if (!refs.logoMark) return;
    const key = SYMBOLS[bookKey] ? bookKey : 'mateus';
    const theme = BOOK_THEMES[key] || BOOK_THEMES.mateus;
    const color = theme.symbol || theme.gold;
    refs.logoMark.innerHTML = `<span class="logo-symbol" style="color:${color}" aria-hidden="true">${SYMBOLS[key]}</span>`;
  }

  return {
    refs,
    init,
    showPanel,
    setActiveBookTab,
    setActiveLiturgyTab,
    injectTabSymbols,
    setLogoSymbol,
  };
})();

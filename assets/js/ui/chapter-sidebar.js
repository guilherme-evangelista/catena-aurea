'use strict';

const CatenaChapterSidebar = (() => {
  function isMobileViewport() {
    return window.matchMedia('(max-width: 600px)').matches;
  }

  function updateMobileControls() {
    const toggle = CatenaDOM.refs.chapterToggle;
    toggle.hidden = !isMobileViewport() || !CatenaState.currentBook || document.body.classList.contains('liturgy-active');

    if (!isMobileViewport()) close();
  }

  function hideToggle() {
    CatenaDOM.refs.chapterToggle.hidden = true;
  }

  function close() {
    document.body.classList.remove('sidebar-open');
  }

  function toggle() {
    if (!CatenaState.currentBook || document.body.classList.contains('liturgy-active')) return;
    document.body.classList.toggle('sidebar-open');
  }

  return {
    updateMobileControls,
    hideToggle,
    close,
    toggle,
  };
})();
